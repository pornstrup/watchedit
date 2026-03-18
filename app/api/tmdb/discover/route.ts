import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'movie' | 'tv' | null
  const genreId = searchParams.get('genre')
  const providerId = searchParams.get('provider')
  const page = searchParams.get('page') || '1'

  const types = type === 'movie' ? ['movie'] : type === 'tv' ? ['tv'] : ['movie', 'tv']

  const results = await Promise.all(types.map(async t => {
    const params = new URLSearchParams({
      language: 'en-US',
      region: 'DK',
      watch_region: 'DK',
      sort_by: 'popularity.desc',
      page,
      include_adult: 'false',
    })

    if (genreId) params.set('with_genres', genreId)
    if (providerId) {
      params.set('with_watch_providers', providerId)
      params.set('with_watch_monetization_types', 'flatrate')
    }

    const res = await fetch(
      `https://api.themoviedb.org/3/discover/${t}?${params}`,
      { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, 
        cache: 'no-store'
    }
    )
    const data = await res.json()

    return (data.results || []).map((i: any) => ({
      tmdb_id: i.id,
      media_type: t,
      title: i.title || i.name,
      year: (i.release_date || i.first_air_date)?.split('-')[0],
      poster: i.poster_path ? `https://image.tmdb.org/t/p/w300${i.poster_path}` : null,
      genre_ids: i.genre_ids || [],
      popularity: i.popularity,
    }))
  }))

  const combined = results.flat()
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 24)

  return NextResponse.json({ results: combined })
}