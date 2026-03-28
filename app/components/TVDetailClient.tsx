'use client'

import { useState } from 'react'
import Image from 'next/image'
import ExpandableText from './ExpandableText'
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
  ctx,
  tmdbId,
  title,
  poster,
}: {
  item?: { id: string }
  seasons: Season[]
  episodeProgress: Progress[]
  showId: string
  initialStatus?: string
  providers: Provider[]
  overview: string
  ctx?: string
  tmdbId?: number
  title?: string
  poster?: string | null
}) {
  const [status, setStatus] = useState(initialStatus || 'want')

  return (
    <>
      {/* PLATFORMS */}
      {providers.length > 0 && (
        <div className="mb-6">
          <p className="text-white/50 text-sm mb-3">Hvor kan du se den</p>
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
                <Image src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} width={24} height={24} className="rounded-md" />
                <span className="text-white/70 text-sm font-medium">{p.provider_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HANDLING */}
      {overview && (
        <div className="mb-6">
          <ExpandableText text={overview} />
        </div>
      )}

      {/* EPISODER */}
      {item && seasons.length > 0 && (
        <div className="mb-6">
          <EpisodeTracker
            itemId={item.id}
            seasons={seasons}
            progress={episodeProgress}
            showId={showId}
            currentStatus={status}
            onStatusChange={setStatus}
            ctx={ctx}
          />
        </div>
      )}
    </>
  )
}