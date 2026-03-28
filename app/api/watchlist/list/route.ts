import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTmdbItems } from '@/lib/tmdb'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { data: items, error } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('owner_id', user.id)
    .is('group_id', null)
    .is('deleted_at', null)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Hent episode-counts + TMDB-data parallelt
  const watchingTvIds = items
    .filter(i => i.media_type === 'tv' && i.status === 'watching')
    .map(i => i.id)

  const [episodeCountsResult, tmdbMap] = await Promise.all([
    watchingTvIds.length > 0
      ? supabase
          .from('episode_progress')
          .select('watchlist_item_id')
          .in('watchlist_item_id', watchingTvIds)
          .then(({ data }) => {
            const counts: Record<string, number> = {}
            for (const row of data ?? []) {
              counts[row.watchlist_item_id] = (counts[row.watchlist_item_id] || 0) + 1
            }
            return counts
          })
      : Promise.resolve({} as Record<string, number>),
    getTmdbItems(items.map(i => ({ tmdb_id: i.tmdb_id, media_type: i.media_type }))),
  ])

  const enriched = items.map((item) => {
    const tmdb = tmdbMap[`${item.tmdb_id}-${item.media_type}`]
    let progress = null
    if (item.media_type === 'tv' && item.status === 'watching') {
      const totalEpisodes = tmdb?.number_of_episodes || 0
      if (totalEpisodes > 0) {
        progress = { total_episodes: totalEpisodes, watched_episodes: episodeCountsResult[item.id] ?? 0 }
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

  return NextResponse.json({ items: enriched })
}