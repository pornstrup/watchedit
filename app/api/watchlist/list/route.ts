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
    .order('added_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const enriched = await Promise.all(
    items.map(async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.tmdb_id}?language=en-US`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          },
        }
      )
      const tmdb = await res.json()

      return {
        ...item,
        title: tmdb.title || tmdb.name,
        poster: tmdb.poster_path
          ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}`
          : null,
        year: (tmdb.release_date || tmdb.first_air_date)?.split('-')[0],
      }
    })
  )

  return NextResponse.json({ items: enriched })
}