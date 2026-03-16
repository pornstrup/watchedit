import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const response = await fetch(
    `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&language=da-DK&region=DK&include_adult=false`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const data = await response.json()

  const results = data.results
    ?.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
    ?.slice(0, 8)
    ?.map((item: any) => ({
      tmdb_id: item.id,
      media_type: item.media_type,
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date)?.split('-')[0],
      poster: item.poster_path
        ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
        : null,
    }))

  return NextResponse.json({ results: results || [] })
}