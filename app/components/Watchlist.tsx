'use client'

import { useEffect, useState } from 'react'

type WatchlistItem = {
  id: string
  tmdb_id: number
  media_type: string
  status: string
  title: string
  poster: string | null
  year?: string
}

export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/watchlist/list')
      .then(res => res.json())
      .then(data => {
        setItems(data.items || [])
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <p className="text-white/40 text-sm">Henter din liste...</p>
  )

  if (items.length === 0) return (
    <p className="text-white/40 text-sm">Din liste er tom – søg efter noget at se!</p>
  )

  return (
    <div className="w-full flex flex-col gap-3">
      <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">Din liste</p>
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3"
        >
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              className="w-12 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-16 rounded-lg bg-white/10 flex-shrink-0" />
          )}
          <div>
            <p className="text-white font-semibold text-sm">{item.title}</p>
            <p className="text-white/40 text-xs">
              {item.media_type === 'tv' ? 'Serie' : 'Film'} {item.year && `· ${item.year}`}
            </p>
            <p className="text-white/30 text-xs mt-1">
              {item.status === 'want' ? 'Vil se' : item.status === 'watching' ? 'I gang' : 'Set'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}