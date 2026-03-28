import { NextResponse } from 'next/server'
import { getDKWebSchedule } from '@/lib/tvmaze'

const KEY = process.env.TMDB_API_KEY

function tmdb(path: string, revalidate = 21600) {
  return fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
    next: { revalidate },
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
  const [trendingMovies, trendingTv, topRatedMovies, topRatedTv, dkSchedule] = await Promise.all([
    tmdb('/trending/movie/week?language=da-DK&region=DK'),
    tmdb('/trending/tv/week?language=da-DK&region=DK'),
    tmdb('/movie/top_rated?language=en-US&region=DK'),
    tmdb('/tv/top_rated?language=en-US&region=DK'),
    getDKWebSchedule(3),
  ])

  // Byg "Ny på dansk streaming" fra TVMaze DK-kalender
  const seenImdb = new Set<string>()
  const dkItems: any[] = []

  for (const ep of dkSchedule) {
    const imdb = ep.show?.externals?.imdb
    if (!imdb || seenImdb.has(imdb)) continue
    seenImdb.add(imdb)
    if (dkItems.length >= 12) break

    try {
      const found = await tmdb(`/find/${imdb}?external_source=imdb_id`, 86400)
      const result = found.tv_results?.[0] || found.movie_results?.[0]
      if (!result?.poster_path) continue
      const mediaType = found.tv_results?.[0] ? 'tv' : 'movie'
      dkItems.push({
        tmdb_id: result.id as number,
        media_type: mediaType,
        title: (result.title || result.name || ep.show?.name || '') as string,
        year: ((result.release_date || result.first_air_date) as string | undefined)?.split('-')[0] ?? null,
        poster: `https://image.tmdb.org/t/p/w300${result.poster_path}`,
      })
    } catch {
      // skip hvis TMDB ikke har showet
    }
  }

  const sections: any[] = [
    { id: 'trending-movies', title: 'Det snakkes om', items: mapItems(trendingMovies.results, 'movie') },
    { id: 'trending-tv', title: 'Trending serier', items: mapItems(trendingTv.results, 'tv') },
    { id: 'top-rated-movies', title: 'Højt bedømt', items: mapItems(topRatedMovies.results, 'movie') },
    { id: 'top-rated-tv', title: 'Højt bedømt · Serier', items: mapItems(topRatedTv.results, 'tv') },
  ]

  if (dkItems.length > 0) {
    sections.unshift({ id: 'dk-streaming', title: 'Ny på dansk streaming', items: dkItems })
  }

  return NextResponse.json({ sections })
}
