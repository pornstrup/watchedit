import { NextResponse } from 'next/server'

export async function GET() {
  const [movieRes, tvRes] = await Promise.all([
    fetch('https://api.themoviedb.org/3/genre/movie/list?language=en', {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
    }),
    fetch('https://api.themoviedb.org/3/genre/tv/list?language=en', {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
    })
  ])

  const [movies, tv] = await Promise.all([movieRes.json(), tvRes.json()])

  const all = [...(movies.genres || []), ...(tv.genres || [])]
  const unique = Array.from(new Map(all.map(g => [g.id, g])).values())
    .sort((a, b) => a.name.localeCompare(b.name, 'da'))

  return NextResponse.json({ genres: unique })
}