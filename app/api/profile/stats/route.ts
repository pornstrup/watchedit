import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTmdbItems } from '@/lib/tmdb'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

const { data: items } = await supabase
  .from('watchlist_items')
  .select('*')
  .eq('owner_id', user.id)
  .is('group_id', null)

  if (!items) return NextResponse.json({ stats: null })

  const movies = items.filter(i => i.media_type === 'movie')
  const tv = items.filter(i => i.media_type === 'tv')
  const done = items.filter(i => i.status === 'done')
  const watching = items.filter(i => i.status === 'watching')

  const { count: episodesWatched } = await supabase
    .from('episode_progress')
    .select('*', { count: 'exact', head: true })
    .in('watchlist_item_id', tv.map(i => i.id))

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const thisMonth = items.filter(i => new Date(i.added_at) >= startOfMonth)

  const recentSorted = [...items].sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime()).slice(0, 5)
  const forGenres = done.slice(0, 20)
  const allNeeded = [...new Map([...forGenres, ...recentSorted].map(i => [`${i.tmdb_id}-${i.media_type}`, i])).values()]

  const tmdbMap = await getTmdbItems(allNeeded.map(i => ({ tmdb_id: i.tmdb_id, media_type: i.media_type })))

  const genreCounts: Record<number, { count: number; name: string }> = {}
  for (const item of forGenres) {
    const tmdb = tmdbMap[`${item.tmdb_id}-${item.media_type}`]
    for (const genre of tmdb?.genres ?? []) {
      if (!genreCounts[genre.id]) genreCounts[genre.id] = { count: 0, name: genre.name }
      genreCounts[genre.id].count++
    }
  }

  const topGenres = Object.values(genreCounts).sort((a, b) => b.count - a.count).slice(0, 5)

  const recentItems = recentSorted.map(item => {
    const tmdb = tmdbMap[`${item.tmdb_id}-${item.media_type}`]
    return {
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      status: item.status,
    }
  })

  return NextResponse.json({
    stats: {
      total: items.length,
      moviesTotal: movies.length,
      tvTotal: tv.length,
      done: done.length,
      watching: watching.length,
      episodesWatched: episodesWatched || 0,
      thisMonth: thisMonth.length,
      topGenres,
      memberSince: user.created_at,
      recentItems,
    }
  })
}