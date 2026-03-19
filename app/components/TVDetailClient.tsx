'use client'

import { useState } from 'react'
import StatusButtons from './StatusButtons'
import EpisodeTracker from './EpisodeTracker'

type Season = { season_number: number; episode_count: number; name: string }
type Progress = { season_number: number; episode_number: number }
type Provider = { provider_id: number; provider_name: string; logo_path: string }

export default function TVDetailClient({
  item,
  seasons,
  episodeProgress,
  showId,
  initialStatus,
  providers,
  overview,
}: {
  item: { id: string }
  seasons: Season[]
  episodeProgress: Progress[]
  showId: string
  initialStatus: string
  providers: Provider[]
  overview: string
}) {
  const [status, setStatus] = useState(initialStatus)

  return (
    <>
      {/* STATUS */}
      <div className="mb-6">
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Status</p>
        <StatusButtons
          itemId={item.id}
          initialStatus={status as 'want' | 'watching' | 'done'}
          onStatusChange={setStatus}
        />
      </div>

      {/* PLATFORMS */}
      {providers.length > 0 && (
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Hvor kan du se den</p>
          <div className="flex gap-3 flex-wrap">
            {providers.map((p) => (
              <div
                key={p.provider_id}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.07)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                }}
              >
                <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} className="w-6 h-6 rounded-md" />
                <span className="text-white/70 text-sm font-medium">{p.provider_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HANDLING */}
      {overview && (
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Handling</p>
          <p className="text-white/60 text-sm leading-relaxed">{overview}</p>
        </div>
      )}

      {/* EPISODER */}
      {seasons.length > 0 && (
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Episoder</p>
          <EpisodeTracker
            itemId={item.id}
            seasons={seasons}
            progress={episodeProgress}
            showId={showId}
            currentStatus={status}
            onStatusChange={setStatus}
          />
        </div>
      )}
    </>
  )
}