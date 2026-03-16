'use client'

import { useState } from 'react'

type Status = 'want' | 'watching' | 'done'

export default function StatusButtons({ itemId, initialStatus }: { itemId: string, initialStatus: Status }) {
  const [status, setStatus] = useState<Status>(initialStatus)

  const updateStatus = async (newStatus: Status) => {
    setStatus(newStatus)
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
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            status === s
              ? 'bg-white text-black'
              : 'bg-white/8 text-white/50 hover:bg-white/15'
          }`}
        >
          {s === 'want' ? 'Vil se' : s === 'watching' ? 'I gang' : 'Set'}
        </button>
      ))}
    </div>
  )
}