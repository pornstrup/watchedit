import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  const { data: items, error } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('added_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const enriched = await Promise.all(
    items.map(async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.tmdb_id}?language=en-US`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
      )
      const tmdb = await res.json()

      let progress = null
      if (item.media_type === 'tv' && item.status === 'watching') {
        try {
          const tvRes = await fetch(
            `https://api.themoviedb.org/3/tv/${item.tmdb_id}?language=en-US`,
            { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
          )
          const tvData = await tvRes.json()
          const totalEpisodes = tvData.number_of_episodes || 0

          const { count: watchedCount } = await supabase
            .from('episode_progress')
            .select('*', { count: 'exact', head: true })
            .eq('watchlist_item_id', item.id)

          if (totalEpisodes > 0) {
            progress = {
              total_episodes: totalEpisodes,
              watched_episodes: watchedCount || 0
            }
          }
        } catch (err) {
          console.log('Progress error:', err)
        }
      }

      return {
        ...item,
        title: tmdb.title || tmdb.name,
        poster: tmdb.poster_path
          ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}`
          : null,
        year: (tmdb.release_date || tmdb.first_air_date)?.split('-')[0],
        progress,
      }
    })
  )

  return NextResponse.json({ items: enriched })
}