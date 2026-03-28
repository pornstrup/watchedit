import { NextResponse } from 'next/server'

const KEY = process.env.TMDB_API_KEY

function tmdb(path: string) {
  return fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
    next: { revalidate: 21600 },
  }).then(r => r.json())
}

function mapItems(results: any[], mediaType: 'movie' | 'tv', limit = 8) {
  return (results || [])
    .filter((i: any) => i.poster_path)
    .slice(0, limit)
    .map((i: any) => ({
      tmdb_id: i.id as number,
      media_type: mediaType,
      title: (i.title || i.name || '') as string,
      year: ((i.release_date || i.first_air_date) as string | undefined)?.split('-')[0] ?? null,
      poster: `https://image.tmdb.org/t/p/w300${i.poster_path}`,
    }))
}

export async function GET() {
  const [trendingMovies, trendingTv, topRatedMovies, topRatedTv] = await Promise.all([
    tmdb('/trending/movie/week?language=da-DK&region=DK'),
    tmdb('/trending/tv/week?language=da-DK&region=DK'),
    tmdb('/movie/top_rated?language=en-US&region=DK'),
    tmdb('/tv/top_rated?language=en-US&region=DK'),
  ])

  return NextResponse.json({
    sections: [
      { id: 'trending-movies', title: 'Det snakkes om', items: mapItems(trendingMovies.results, 'movie') },
      { id: 'trending-tv', title: 'Trending serier', items: mapItems(trendingTv.results, 'tv') },
      { id: 'top-rated-movies', title: 'Højt bedømt', items: mapItems(topRatedMovies.results, 'movie') },
      { id: 'top-rated-tv', title: 'Højt bedømt · Serier', items: mapItems(topRatedTv.results, 'tv') },
    ],
  })
}
