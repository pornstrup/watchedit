import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getTmdbItems } from '@/lib/tmdb'
import { getAuthUser } from '@/lib/supabase/auth'
import { createPhaseTimer } from '@/lib/timing'

type GroupMemberRow = {
  user_id: string
  role: string
  joined_at: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
  } | Array<{
    id: string
    name: string
    avatar_url: string | null
  }>
}

type GroupMemberPayload = {
  id: string
  name: string
  avatar_url: string | null
  role: string
}

type GroupWatchlistRow = {
  id: string
  tmdb_id: number
  media_type: 'movie' | 'tv'
  status: string
  title: string
  poster: string | null
  year?: string
  added_by: string
  added_at: string
  updated_at?: string
}

type HiddenRow = {
  tmdb_id: number
  media_type: 'movie' | 'tv'
}

type ActivityRow = {
  id: string
  added_by: string
  added_at: string
  tmdb_id: number
  media_type: 'movie' | 'tv'
}

type EpisodeRow = {
  id: string
  marked_by: string
  created_at: string
  season_number: number
  episode_number: number
  group_watchlist_item_id: string
}

type ProfileRow = {
  id: string
  name: string
  avatar_url: string | null
}

type ProfileNameRow = {
  id: string
  name: string
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const timer = createPhaseTimer('bootstrap')
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  timer.mark('auth')
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  // Runde 1 (parallelt): alt der kun kræver gruppe-id
  const [membersRes, itemsRes, hiddenRes] = await Promise.all([
    supabaseAdmin
      .from('group_members')
      .select(`
        user_id,
        role,
        joined_at,
        profiles (
          id,
          name,
          avatar_url
        )
      `)
      .eq('group_id', groupId),
    supabaseAdmin
      .from('group_watchlist_items')
      .select('*')
      .eq('group_id', groupId)
      .is('deleted_at', null)
      .order('added_at', { ascending: false }),
    supabaseAdmin
      .from('group_inspiration_hidden')
      .select('tmdb_id, media_type')
      .eq('group_id', groupId)
      .eq('user_id', user.id),
  ])

  timer.mark('runde1')
  if (membersRes.error) return NextResponse.json({ error: membersRes.error.message }, { status: 500 })
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 })
  if (hiddenRes.error) return NextResponse.json({ error: hiddenRes.error.message }, { status: 500 })

  const members = (membersRes.data ?? []) as GroupMemberRow[]

  // supabaseAdmin omgår RLS — kun gruppens medlemmer må se dens data
  if (!members.some(m => m.user_id === user.id)) {
    return NextResponse.json({ error: 'Ikke medlem af gruppen' }, { status: 403 })
  }

  const items = (itemsRes.data ?? []) as GroupWatchlistRow[]
  const hidden = (hiddenRes.data ?? []) as HiddenRow[]
  const allItems = items as unknown as ActivityRow[]
  const itemMap = Object.fromEntries(items.map(i => [i.id, i]))

  const watchingTvIds = items
    .filter(i => i.media_type === 'tv' && i.status === 'watching')
    .map(i => i.id)

  const memberProfileRows: ProfileRow[] = members.flatMap(m => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return profile ? [profile] : []
  })

  // Runde 2 (parallelt): forespørgsler der afhænger af runde 1 + TMDB fra server-cachen
  const [episodeCounts, episodes, inspirationSource, tmdbMap] = await Promise.all([
    watchingTvIds.length > 0
      ? supabaseAdmin
          .from('group_episode_progress')
          .select('group_watchlist_item_id')
          .in('group_watchlist_item_id', watchingTvIds)
          .then(({ data }) => {
            const counts: Record<string, number> = {}
            for (const row of data ?? []) {
              counts[row.group_watchlist_item_id] = (counts[row.group_watchlist_item_id] || 0) + 1
            }
            return counts
          })
      : Promise.resolve({} as Record<string, number>),
    allItems.length > 0
      ? supabaseAdmin
          .from('group_episode_progress')
          .select('id, marked_by, created_at, season_number, episode_number, group_watchlist_item_id')
          .in('group_watchlist_item_id', allItems.map(i => i.id))
          .order('created_at', { ascending: false })
          .limit(20)
          .then(({ data }) => (data ?? []) as EpisodeRow[])
      : Promise.resolve([] as EpisodeRow[]),
    supabaseAdmin
      .from('watchlist_items')
      .select('tmdb_id, media_type, owner_id')
      .in('owner_id', members.map(m => m.user_id))
      .is('group_id', null)
      .is('deleted_at', null)
      .in('status', ['watching', 'want']),
    getTmdbItems(items.map(i => ({ tmdb_id: i.tmdb_id, media_type: i.media_type }))),
  ])

  timer.mark('runde2')
  const inspirationHidden = new Set((hidden || []).map(i => `${i.tmdb_id}-${i.media_type}`))
  const groupTmdbIds = new Set(items.map(i => `${i.tmdb_id}-${i.media_type}`))

  const seen = new Map<string, { tmdb_id: number; media_type: string; member_ids: string[] }>()
  for (const item of inspirationSource.data || []) {
    const key = `${item.tmdb_id}-${item.media_type}`
    if (groupTmdbIds.has(key)) continue
    if (inspirationHidden.has(key)) continue
    if (seen.has(key)) {
      seen.get(key)!.member_ids.push(item.owner_id)
    } else {
      seen.set(key, {
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        member_ids: [item.owner_id],
      })
    }
  }

  const uniqueItems = Array.from(seen.values()).slice(0, 50)

  // Runde 3: kun TMDB (server-cache, ingen Supabase). Aktivitet genbruger tmdbMap.
  const inspirationTmdbMap = uniqueItems.length > 0
    ? await getTmdbItems(uniqueItems.map(i => ({ tmdb_id: i.tmdb_id, media_type: i.media_type })))
    : {}
  const activityTmdb = tmdbMap
  timer.mark('runde3_tmdb')

  const inspirationProfileMap = Object.fromEntries(memberProfileRows.map(p => [p.id, p.name]))

  const inspiration = uniqueItems.map((item) => {
    const tmdb = inspirationTmdbMap[`${item.tmdb_id}-${item.media_type}`]
    return {
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      year: tmdb?.release_year ?? null,
      members: item.member_ids.map(id => inspirationProfileMap[id] || 'Ukendt'),
    }
  })

  type ActivityEvent = {
    id: string
    type: 'added' | 'episode' | 'joined'
    user_name: string
    user_avatar: string | null
    title?: string
    poster?: string | null
    tmdb_id?: number
    media_type?: string
    season?: number
    episode?: number
    timestamp: string
  }

  const profileMap = Object.fromEntries((members || []).map(m => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return [m.user_id, profile || null]
  }))

  const events: ActivityEvent[] = []
  for (const item of (allItems || []).slice(0, 20)) {
    const profile = profileMap[item.added_by]
    if (!profile) continue
    const tmdb = activityTmdb[`${item.tmdb_id}-${item.media_type}`]
    events.push({
      id: `added-${item.id}`,
      type: 'added',
      user_name: profile.name?.split(' ')[0] || 'Nogen',
      user_avatar: profile.avatar_url,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      timestamp: item.added_at,
    })
  }

  for (const ep of episodes) {
    const profile = profileMap[ep.marked_by]
    const watchlistItem = itemMap[ep.group_watchlist_item_id]
    if (!profile || !watchlistItem) continue
    const tmdb = activityTmdb[`${watchlistItem.tmdb_id}-${watchlistItem.media_type}`]
    events.push({
      id: `episode-${ep.id}`,
      type: 'episode',
      user_name: profile.name?.split(' ')[0] || 'Nogen',
      user_avatar: profile.avatar_url,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      tmdb_id: watchlistItem.tmdb_id,
      media_type: watchlistItem.media_type,
      season: ep.season_number,
      episode: ep.episode_number,
      timestamp: ep.created_at,
    })
  }

  for (const m of members) {
    const profile = profileMap[m.user_id]
    if (!profile) continue
    events.push({
      id: `joined-${m.user_id}`,
      type: 'joined',
      user_name: profile.name?.split(' ')[0] || 'Nogen',
      user_avatar: profile.avatar_url,
      timestamp: m.joined_at,
    })
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const groupMembers: GroupMemberPayload[] = (members || []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      id: m.user_id,
      name: profile?.name || 'Ukendt',
      avatar_url: profile?.avatar_url ?? null,
      role: m.role,
    }
  })
  const watchlist = items.map((item) => {
    const tmdb = tmdbMap[`${item.tmdb_id}-${item.media_type}`]
    let progress = null
    if (item.media_type === 'tv' && item.status === 'watching') {
      const totalEpisodes = tmdb?.number_of_episodes || 0
      if (totalEpisodes > 0) {
        progress = { total_episodes: totalEpisodes, watched_episodes: episodeCounts[item.id] ?? 0 }
      }
    }
    return {
      ...item,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      year: tmdb?.release_year ?? null,
      progress,
    }
  })

  timer.mark('byg_svar')
  timer.done()

  return NextResponse.json({
    members: groupMembers,
    items: watchlist,
    inspiration,
    activity: events.slice(0, 30),
  }, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
    },
  })
}
