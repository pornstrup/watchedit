import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  // Hent alle item-IDs for gruppen (til episode-opslag)
  const { data: allItems } = await supabaseAdmin
    .from('group_watchlist_items')
    .select('id, added_by, added_at, tmdb_id, media_type')
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('added_at', { ascending: false })

  const itemMap = Object.fromEntries((allItems || []).map(i => [i.id, i]))
  const itemIds = (allItems || []).map(i => i.id)

  // Hent seneste episode-markeringer
  const { data: episodes } = itemIds.length > 0
    ? await supabaseAdmin
        .from('group_episode_progress')
        .select('id, marked_by, created_at, season_number, episode_number, group_watchlist_item_id')
        .in('group_watchlist_item_id', itemIds)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  // Hent member joins
  const { data: memberJoins } = await supabaseAdmin
    .from('group_members')
    .select('user_id, joined_at')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: false })

  // Saml alle unikke user IDs
  const userIds = new Set<string>([
    ...(allItems || []).map(i => i.added_by).filter(Boolean),
    ...(episodes || []).map(e => e.marked_by).filter(Boolean),
    ...(memberJoins || []).map(m => m.user_id).filter(Boolean),
  ])

  // Hent profiler
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', Array.from(userIds))

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

  // Hent TMDB-titler for unikke items
  const uniqueTmdb = [
    ...new Map((allItems || []).map(i => [`${i.tmdb_id}-${i.media_type}`, i])).values()
  ].slice(0, 20)

  const tmdbMap: Record<string, { title: string; poster: string | null }> = {}
  await Promise.all(
    uniqueTmdb.map(async (item) => {
      const res = await fetch(
        `https://api.themoviedb.org/3/${item.media_type}/${item.tmdb_id}?language=da-DK`,
        {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
          next: { revalidate: 86400 },
        }
      )
      const tmdb = await res.json()
      tmdbMap[`${item.tmdb_id}-${item.media_type}`] = {
        title: tmdb.title || tmdb.name || '',
        poster: tmdb.poster_path ? `https://image.tmdb.org/t/p/w185${tmdb.poster_path}` : null,
      }
    })
  )

  // Byg events
  type Event = {
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

  const events: Event[] = []

  // Added events
  for (const item of (allItems || []).slice(0, 20)) {
    const profile = profileMap[item.added_by]
    if (!profile) continue
    const tmdb = tmdbMap[`${item.tmdb_id}-${item.media_type}`]
    events.push({
      id: `added-${item.id}`,
      type: 'added',
      user_name: profile.name?.split(' ')[0] || 'Nogen',
      user_avatar: profile.avatar_url,
      title: tmdb?.title,
      poster: tmdb?.poster ?? null,
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      timestamp: item.added_at,
    })
  }

  // Episode events
  for (const ep of (episodes || [])) {
    const profile = profileMap[ep.marked_by]
    const watchlistItem = itemMap[ep.group_watchlist_item_id]
    if (!profile || !watchlistItem) continue
    const tmdb = tmdbMap[`${watchlistItem.tmdb_id}-${watchlistItem.media_type}`]
    events.push({
      id: `episode-${ep.id}`,
      type: 'episode',
      user_name: profile.name?.split(' ')[0] || 'Nogen',
      user_avatar: profile.avatar_url,
      title: tmdb?.title,
      poster: tmdb?.poster ?? null,
      tmdb_id: watchlistItem.tmdb_id,
      media_type: watchlistItem.media_type,
      season: ep.season_number,
      episode: ep.episode_number,
      timestamp: ep.created_at,
    })
  }

  // Joined events
  for (const m of (memberJoins || [])) {
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

  // Sorter og returnér de seneste 30
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({ events: events.slice(0, 30) })
}
