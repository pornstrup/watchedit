'use client'

import { useState, useEffect } from 'react'

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
}: {
  itemId: string
  initialStatus: Status
  onStatusChange?: (status: string) => void
}) {
  const [status, setStatus] = useState<Status>(initialStatus)

  // Synkroniser hvis ekstern status ændres (fx fra EpisodeTracker)
  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  const updateStatus = async (newStatus: Status) => {
    setStatus(newStatus)
    onStatusChange?.(newStatus)
    await fetch('/api/watchlist/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, status: newStatus })
    })
  }

  return (
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
  )
}