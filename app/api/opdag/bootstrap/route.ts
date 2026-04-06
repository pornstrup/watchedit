import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getDKWebSchedule } from '@/lib/tvmaze'
import { getTmdbItems } from '@/lib/tmdb'

const KEY = process.env.TMDB_API_KEY

type TmdbItem = {
  id: number
  title?: string
  name?: string
  poster_path?: string | null
  release_date?: string | null
  first_air_date?: string | null
}

type TmdbResponse = {
  results?: TmdbItem[]
}

type ProviderResult = {
  provider_id: number
  provider_name: string
  logo_path?: string | null
  display_priority?: number | null
}

type ProviderResponse = {
  results?: ProviderResult[]
}

type FindResponse = {
  tv_results?: TmdbItem[]
  movie_results?: TmdbItem[]
}

type BootstrapItem = {
  tmdb_id: number
  media_type: 'movie' | 'tv'
  title: string
  year: string | null
  poster: string | null
}

type BootstrapSection = {
  id: string
  title: string
  providerLogo?: string
  items: BootstrapItem[]
}

function tmdb<T>(path: string, revalidate = 21600): Promise<T> {
  return fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
    next: { revalidate },
  }).then(r => r.json() as Promise<T>)
}

function mapItems(results: TmdbItem[] = [], mediaType: 'movie' | 'tv', limit = 8) {
  return (results || [])
    .filter((i) => i.poster_path)
    .slice(0, limit)
    .map((i) => ({
      tmdb_id: i.id as number,
      media_type: mediaType,
      title: (i.title || i.name || '') as string,
      year: ((i.release_date || i.first_air_date) as string | undefined)?.split('-')[0] ?? null,
      poster: `https://image.tmdb.org/t/p/w300${i.poster_path}`,
    }))
}

function normalizeStreamingKey(services: number[]) {
  return [...services].filter(Number.isFinite).sort((a, b) => a - b).join(',') || 'none'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const ctx = url.searchParams.get('ctx')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const profilePromise = supabaseAdmin
    .from('profiles')
    .select('streaming_services')
    .eq('id', user.id)
    .single()

  const followingRowsPromise = supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const groupsPromise = supabase
    .from('group_members')
    .select(`
      group_id,
      role,
      groups (
        id,
        name,
        created_by,
        created_at
      )
    `)
    .eq('user_id', user.id)

  const existingIdsPromise = ctx
    ? supabaseAdmin
        .from('group_watchlist_items')
        .select('tmdb_id, media_type')
        .eq('group_id', ctx)
        .is('deleted_at', null)
    : supabase
        .from('watchlist_items')
        .select('tmdb_id, media_type')
        .eq('owner_id', user.id)
        .is('group_id', null)
        .is('deleted_at', null)

  const [profileResult, followingRowsResult, groupsResult, existingIdsResult] = await Promise.all([
    profilePromise,
    followingRowsPromise,
    groupsPromise,
    existingIdsPromise,
  ])

  const streamingIds: number[] = profileResult.data?.streaming_services || []
  const streamingKey = normalizeStreamingKey(streamingIds)
  const followingIds = (followingRowsResult.data ?? []).map(f => f.following_id)

  const [trendingMovies, trendingTv, topRatedMovies, topRatedTv, dkSchedule, providerMeta, ...providerResults] =
    await Promise.all([
      tmdb<TmdbResponse>('/trending/movie/week?language=da-DK&region=DK'),
      tmdb<TmdbResponse>('/trending/tv/week?language=da-DK&region=DK'),
      tmdb<TmdbResponse>('/movie/top_rated?language=en-US&region=DK'),
      tmdb<TmdbResponse>('/tv/top_rated?language=en-US&region=DK'),
      getDKWebSchedule(3),
      tmdb<ProviderResponse>('/watch/providers/movie?watch_region=DK', 86400),
      ...streamingIds.flatMap(id => [
        tmdb<TmdbResponse>(`/discover/movie?with_watch_providers=${id}&watch_region=DK&sort_by=popularity.desc&language=en-US`, 43200),
        tmdb<TmdbResponse>(`/discover/tv?with_watch_providers=${id}&watch_region=DK&sort_by=popularity.desc&language=en-US`, 43200),
      ]),
    ])

  const seenImdb = new Set<string>()
  const uniqueEpisodes: typeof dkSchedule = []
  for (const ep of dkSchedule) {
    const imdb = ep.show?.externals?.imdb
    if (!imdb || seenImdb.has(imdb)) continue
    seenImdb.add(imdb)
    uniqueEpisodes.push(ep)
    if (uniqueEpisodes.length >= 12) break
  }

  const dkResults = await Promise.all(
    uniqueEpisodes.map(async ep => {
      try {
        const imdb = ep.show!.externals!.imdb!
        const found = await tmdb<FindResponse>(`/find/${imdb}?external_source=imdb_id`, 86400)
        const result = found.tv_results?.[0] || found.movie_results?.[0]
        if (!result?.poster_path) return null
        const mediaType = found.tv_results?.[0] ? 'tv' : 'movie'
        return {
          tmdb_id: result.id as number,
          media_type: mediaType,
          title: (result.title || result.name || ep.show?.name || '') as string,
          year: ((result.release_date || result.first_air_date) as string | undefined)?.split('-')[0] ?? null,
          poster: result.poster_path ? `https://image.tmdb.org/t/p/w300${result.poster_path}` : null,
        }
      } catch {
        return null
      }
    })
  )

  const providerLookup: Record<number, { name: string; logo: string }> = {}
  for (const p of providerMeta.results || []) {
    if (p.logo_path) {
      providerLookup[p.provider_id] = {
        name: p.provider_name,
        logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
      }
    }
  }

  const baseSections: BootstrapSection[] = [
    { id: 'trending-movies', title: 'Det snakkes om', items: mapItems(trendingMovies.results, 'movie') },
    { id: 'trending-tv', title: 'Trending serier', items: mapItems(trendingTv.results, 'tv') },
    { id: 'top-rated-movies', title: 'Højt bedømt', items: mapItems(topRatedMovies.results, 'movie') },
    { id: 'top-rated-tv', title: 'Højt bedømt · Serier', items: mapItems(topRatedTv.results, 'tv') },
  ]

  const dkItems = dkResults.filter((item): item is BootstrapItem => Boolean(item))

  if (dkItems.length > 0) {
    baseSections.unshift({ id: 'dk-streaming', title: 'Ny på dansk streaming', items: dkItems })
  }

  const providerSections = streamingIds.flatMap((id, i) => {
    const provider = providerLookup[id]
    if (!provider) return []
    const movies = mapItems(providerResults[i * 2]?.results, 'movie', 6)
    const tv = mapItems(providerResults[i * 2 + 1]?.results, 'tv', 6)
    const interleaved: BootstrapItem[] = []
    for (let j = 0; j < Math.max(movies.length, tv.length); j++) {
      if (movies[j]) interleaved.push(movies[j])
      if (tv[j]) interleaved.push(tv[j])
    }
    if (interleaved.length === 0) return []
    return [{
      id: `provider-${id}`,
      title: `Ny på ${provider.name}`,
      providerLogo: provider.logo,
      items: interleaved.slice(0, 10),
    }]
  })

  const { data: content } = followingIds.length > 0
    ? await supabaseAdmin
        .from('user_content')
        .select('user_id, tmdb_id, media_type, rating, note, updated_at')
        .in('user_id', followingIds)
        .eq('watched', true)
        .order('updated_at', { ascending: false })
        .limit(40)
    : { data: [] }

  const { data: profiles } = followingIds.length > 0
    ? await supabaseAdmin
        .from('profiles')
        .select('id, name, username, avatar_url')
        .in('id', followingIds)
    : { data: [] }

  type FollowingContentRow = {
    user_id: string
    tmdb_id: number
    media_type: 'movie' | 'tv'
    rating: number | null
    note: string | null
    updated_at: string
  }

  type FollowingProfileRow = {
    id: string
    name: string
    username: string | null
    avatar_url: string | null
  }

  const contentRows = (content ?? []) as FollowingContentRow[]
  const profileRows = (profiles ?? []) as FollowingProfileRow[]

  const profileMap = Object.fromEntries(profileRows.map(p => [p.id, p]))
  const uniqueTmdb = [...new Map(contentRows.map(c => [`${c.tmdb_id}-${c.media_type}`, c])).values()]
  const tmdbMap = uniqueTmdb.length > 0
    ? await getTmdbItems(uniqueTmdb.map(c => ({ tmdb_id: c.tmdb_id, media_type: c.media_type })))
    : {}

  const feed = contentRows.map(c => {
    const profile = profileMap[c.user_id]
    const tmdb = tmdbMap[`${c.tmdb_id}-${c.media_type}`]
    return {
      user_id: c.user_id,
      user_name: profile?.name ?? 'Ukendt',
      user_username: profile?.username ?? null,
      user_avatar: profile?.avatar_url ?? null,
      tmdb_id: c.tmdb_id,
      media_type: c.media_type,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      rating: c.rating,
      note: c.note,
      watched_at: c.updated_at,
    }
  })

  const followingUsers = profileRows.map(p => ({
    id: p.id,
    name: p.name,
    username: p.username,
    avatar: p.avatar_url,
    is_following: true,
  }))

  const groups = (groupsResult.data ?? [])
    .map(g => g.groups)
    .filter(Boolean)

  const existingIds = (existingIdsResult.data ?? []).map((i: { tmdb_id: number; media_type: string }) => `${i.tmdb_id}-${i.media_type}`)

  return NextResponse.json({
    baseSections,
    providerSections,
    feed,
    followingUsers,
    groups,
    existingIds,
    streamingKey,
  }, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    },
  })
}
