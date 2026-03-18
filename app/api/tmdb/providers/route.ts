import { NextResponse } from 'next/server'

export async function GET() {
  const [movieRes, tvRes] = await Promise.all([
    fetch('https://api.themoviedb.org/3/watch/providers/movie?watch_region=DK&language=da', {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
    }),
    fetch('https://api.themoviedb.org/3/watch/providers/tv?watch_region=DK&language=da', {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
    })
  ])

  const [movies, tv] = await Promise.all([movieRes.json(), tvRes.json()])

  const all = [...(movies.results || []), ...(tv.results || [])]
  const unique = Array.from(
    new Map(all.map(p => [p.provider_id, p])).values()
  ).sort((a, b) => a.display_priority - b.display_priority)
    .slice(0, 20) // top 20 mest relevante i DK

  return NextResponse.json({
    providers: unique.map(p => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`
    }))
  })
}