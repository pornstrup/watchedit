import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  const tmdbId = searchParams.get('tmdbId')
  const ctx = searchParams.get('ctx')

  if (!itemId || !tmdbId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  // Hent sete episoder
  let watched: { season_number: number; episode_number: number }[] = []
  if (ctx) {
    const { data } = await supabaseAdmin
      .from('group_episode_progress')
      .select('season_number, episode_number')
      .eq('group_watchlist_item_id', itemId)
    watched = data || []
  } else {
    const { data } = await supabase
      .from('episode_progress')
      .select('season_number, episode_number')
      .eq('watchlist_item_id', itemId)
    watched = data || []
  }

  const watchedSet = new Set(watched.map(e => `${e.season_number}-${e.episode_number}`))

  // Hent TV-show fra TMDB
  const showRes = await fetch(
    `https://api.themoviedb.org/3/tv/${tmdbId}?language=en-US`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 3600 } }
  )
  const show = await showRes.json()
  const seasons = (show.seasons || []).filter((s: { season_number: number }) => s.season_number > 0)

  // Find næste uset afsnit
  let nextSeason: number | null = null
  let nextEpisode: number | null = null
  outer: for (const season of seasons) {
    for (let ep = 1; ep <= season.episode_count; ep++) {
      if (!watchedSet.has(`${season.season_number}-${ep}`)) {
        nextSeason = season.season_number
        nextEpisode = ep
        break outer
      }
    }
  }

  if (!nextSeason || !nextEpisode) {
    return NextResponse.json({ done: true, showName: show.name })
  }

  // Hent episode-detaljer
  const epRes = await fetch(
    `https://api.themoviedb.org/3/tv/${tmdbId}/season/${nextSeason}/episode/${nextEpisode}?language=en-US`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 3600 } }
  )
  const ep = await epRes.json()

  return NextResponse.json({
    done: false,
    showName: show.name,
    season: nextSeason,
    episode: nextEpisode,
    title: ep.name,
    overview: ep.overview,
    still: ep.still_path ? `https://image.tmdb.org/t/p/w780${ep.still_path}` : null,
  })
}
