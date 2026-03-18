import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const showId = searchParams.get('showId')
  const season = searchParams.get('season')

  const res = await fetch(
    `https://api.themoviedb.org/3/tv/${showId}/season/${season}?language=en-US`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
  )
  const data = await res.json()

  const episodes = data.episodes?.map((ep: any) => ({
    episode_number: ep.episode_number,
    name: ep.name,
    overview: ep.overview,
    runtime: ep.runtime,
    still_path: ep.still_path
  }))

  return NextResponse.json({ episodes: episodes || [] })
}