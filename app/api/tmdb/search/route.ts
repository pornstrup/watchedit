import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const type = searchParams.get('type') // 'movie' | 'tv' | null
  const genreId = searchParams.get('genre')
  const providerId = searchParams.get('provider')

  if (!query) return NextResponse.json({ results: [] })

  // Hvis type er specificeret, søg kun i den type
  const endpoints = type === 'movie'
    ? ['movie']
    : type === 'tv'
    ? ['tv']
    : ['movie', 'tv']

  const responses = await Promise.all(
    endpoints.map(t =>
      fetch(
        `https://api.themoviedb.org/3/search/${t}?query=${encodeURIComponent(query)}&language=en-US&include_adult=false`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
      ).then(r => r.json()).then(d => (d.results || []).map((i: any) => ({ ...i, media_type: t })))
    )
  )

  let results = responses.flat()
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 20)

  // Genre filter (client-side da TMDB search ikke støtter genre filter)
  if (genreId) {
    results = results.filter((i: any) => i.genre_ids?.includes(Number(genreId)))
  }

  const mapped = results.map((i: any) => ({
    tmdb_id: i.id,
    media_type: i.media_type,
    title: i.original_title || i.original_name || i.title || i.name,
    year: (i.release_date || i.first_air_date)?.split('-')[0],
    poster: i.poster_path ? `https://image.tmdb.org/t/p/w300${i.poster_path}` : null,
    genre_ids: i.genre_ids || [],
  }))

  return NextResponse.json({ results: mapped })
}