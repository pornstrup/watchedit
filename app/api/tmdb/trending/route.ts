import { NextResponse } from 'next/server'

export async function GET() {
  const [moviesRes, tvRes] = await Promise.all([
    fetch('https://api.themoviedb.org/3/trending/movie/week?language=da-DK&region=DK', {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
    }),
    fetch('https://api.themoviedb.org/3/trending/tv/week?language=da-DK&region=DK', {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
    })
  ])

  const [movies, tv] = await Promise.all([moviesRes.json(), tvRes.json()])

  const combined = [
    ...(movies.results || []).map((i: any) => ({ ...i, media_type: 'movie' })),
    ...(tv.results || []).map((i: any) => ({ ...i, media_type: 'tv' })),
  ]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 24)
    .map((i: any) => ({
      tmdb_id: i.id,
      media_type: i.media_type,
      title: i.title || i.name,
      year: (i.release_date || i.first_air_date)?.split('-')[0],
      poster: i.poster_path ? `https://image.tmdb.org/t/p/w300${i.poster_path}` : null,
      genre_ids: i.genre_ids || [],
    }))

  return NextResponse.json({ results: combined })
}