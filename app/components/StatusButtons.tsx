'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import RatingSheet from './RatingSheet'

type Status = 'want' | 'watching' | 'done'

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
}

export default function StatusButtons({
  itemId,
  initialStatus,
  onStatusChange,
  ctx,
  tmdbId,
  mediaType,
  title,
  poster,
}: {
  itemId: string
  initialStatus: Status
  onStatusChange?: (status: string) => void
  ctx?: string
  tmdbId?: number
  mediaType?: string
  title?: string
  poster?: string | null
}) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [showRating, setShowRating] = useState(false)

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  const updateStatus = async (newStatus: Status) => {
    if (navigator.vibrate) navigator.vibrate(8)
    setStatus(newStatus)
    onStatusChange?.(newStatus)
    if (ctx) {
      await fetch(`/api/groups/${ctx}/watchlist/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, status: newStatus })
      })
    } else {
      await fetch('/api/watchlist/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, status: newStatus })
      })
    }
    if (newStatus === 'done' && tmdbId && mediaType && title) {
      setShowRating(true)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {(['want', 'watching', 'done'] as const).map((s) => (
          <button
            key={s}
            onClick={() => updateStatus(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              status === s
                ? 'bg-white text-black border border-transparent'
                : 'text-white/50 hover:text-white/80'
            }`}
            style={status === s ? {} : glassStyle}
          >
            {s === 'want' ? 'Vil se' : s === 'watching' ? 'I gang' : 'Set'}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showRating && tmdbId && mediaType && title && (
          <RatingSheet
            tmdbId={tmdbId}
            mediaType={mediaType}
            title={title}
            poster={poster ?? null}
            onClose={() => setShowRating(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
