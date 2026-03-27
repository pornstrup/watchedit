import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  // Hent episode-counts for alle 'watching' TV-items på én gang
  const watchingTvIds = items
    .filter(i => i.media_type === 'tv' && i.status === 'watching')
    .map(i => i.id)

  const episodeCounts: Record<string, number> = {}
  if (watchingTvIds.length > 0) {
    await Promise.all(
      watchingTvIds.map(async (id) => {
        const { count } = await supabase
          .from('episode_progress')
          .select('*', { count: 'exact', head: true })
          .eq('watchlist_item_id', id)
        episodeCounts[id] = count || 0
      })
    )
  }

  const enriched = await Promise.all(
    items.map(async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.tmdb_id}?language=en-US`,
        {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
          next: { revalidate: 3600 },
        }
      )
      const tmdb = await res.json()

      let progress = null
      if (item.media_type === 'tv' && item.status === 'watching') {
        const totalEpisodes = tmdb.number_of_episodes || 0
        if (totalEpisodes > 0) {
          progress = { total_episodes: totalEpisodes, watched_episodes: episodeCounts[item.id] ?? 0 }
        }
      }

      return {
        ...item,
        title: tmdb.title || tmdb.name,
        poster: tmdb.poster_path ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}` : null,
        year: (tmdb.release_date || tmdb.first_air_date)?.split('-')[0],
        progress,
      }
    })
  )

  return NextResponse.json({ items: enriched })
}