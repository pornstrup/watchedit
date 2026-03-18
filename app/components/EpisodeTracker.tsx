'use client'

import { useState, useEffect } from 'react'

type Season = {
  season_number: number
  episode_count: number
  name: string
}

type Episode = {
  episode_number: number
  name: string
  overview: string
  runtime: number
  still_path: string | null
}

type Progress = {
  season_number: number
  episode_number: number
}

export default function EpisodeTracker({
  itemId,
  seasons,
  progress,
  showId
}: {
  itemId: string
  seasons: Season[]
  progress: Progress[]
  showId: string
}) {
  const [activeSeason, setActiveSeason] = useState(seasons[0]?.season_number || 1)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [watched, setWatched] = useState<Set<string>>(
    new Set(progress.map(p => `${p.season_number}-${p.episode_number}`))
  )

  useEffect(() => {
    setLoading(true)
    fetch(`/api/tmdb/season?showId=${showId}&season=${activeSeason}`)
      .then(res => res.json())
      .then(data => {
        setEpisodes(data.episodes || [])
        setLoading(false)
      })
  }, [activeSeason, showId])

  const toggleEpisode = async (season: number, episode: number) => {
    const key = `${season}-${episode}`
    const isWatched = watched.has(key)
    const newWatched = new Set(watched)
    if (isWatched) {
      newWatched.delete(key)
    } else {
      newWatched.add(key)
    }
    setWatched(newWatched)

    await fetch('/api/watchlist/episode', {
      method: isWatched ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlist_item_id: itemId, season_number: season, episode_number: episode })
    })
  }

  const markSeasonWatched = async (season: number, episodeCount: number) => {
    const newWatched = new Set(watched)
    for (let ep = 1; ep <= episodeCount; ep++) {
      newWatched.add(`${season}-${ep}`)
    }
    setWatched(newWatched)

    await fetch('/api/watchlist/episode/season', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlist_item_id: itemId, season_number: season, episode_count: episodeCount })
    })
  }

  const currentSeason = seasons.find(s => s.season_number === activeSeason)
  const watchedInSeason = Array.from(watched).filter(k => k.startsWith(`${activeSeason}-`)).length

  return (
    <div>
      {/* SÆSON TABS */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none pb-1">
        {seasons.map(s => (
          <button
            key={s.season_number}
            onClick={() => setActiveSeason(s.season_number)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeSeason === s.season_number
                ? 'bg-white text-black'
                : 'bg-white/8 text-white/50'
            }`}
          >
            S{s.season_number}
          </button>
        ))}
      </div>

      {/* PROGRESS */}
      <p className="text-white/30 text-xs mb-3">
        {watchedInSeason} af {currentSeason?.episode_count || 0} episoder set
      </p>

      {/* EPISODE GRID */}
      {loading ? (
        <p className="text-white/30 text-sm py-4">Henter episoder...</p>
      ) : (
        <div className="grid grid-cols-6 gap-2 mb-4">
          {episodes.map(ep => {
            const isWatched = watched.has(`${activeSeason}-${ep.episode_number}`)
            return (
              <div
                key={ep.episode_number}
                onClick={() => toggleEpisode(activeSeason, ep.episode_number)}
                className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-95 aspect-video border ${
                  isWatched
                    ? 'border-white/20 opacity-40'
                    : 'border-white/8'
                }`}
              >
                {ep.still_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                    alt={ep.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white/50 text-xs">E{ep.episode_number}</p>
                  <p className="text-white text-xs font-medium leading-tight truncate">{ep.name}</p>
                </div>
                {isWatched && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-2xl">✓</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MARKER SÆSON */}
      <button
        onClick={() => markSeasonWatched(activeSeason, currentSeason?.episode_count || 0)}
        className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-sm font-medium hover:bg-white/10 transition-all"
      >
        Marker hele sæsonen som set
      </button>
    </div>
  )
}