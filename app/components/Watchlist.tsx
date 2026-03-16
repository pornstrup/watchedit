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
    <p className="text-white/40 text-sm text-center py-8">Henter din liste...</p>
  )

  if (items.length === 0) return (
    <p className="text-white/40 text-sm text-center py-8">Din liste er tom – søg efter noget at se!</p>
  )

  return (
    <div className="w-full flex flex-col gap-2">
      <p className="text-white/40 text-xs uppercase tracking-widest font-semibold px-1 mb-2">Din liste</p>
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-4 rounded-2xl p-3 cursor-pointer hover:bg-white/5 transition-all active:scale-98"
        >
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              className="w-14 h-20 rounded-xl object-cover flex-shrink-0 shadow-lg"
            />
          ) : (
            <div className="w-14 h-20 rounded-xl bg-white/8 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-base leading-tight mb-1 truncate">{item.title}</p>
            <p className="text-white/40 text-sm">
              {item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}
            </p>
            <div className="mt-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    item.status === 'watching'
                    ? 'bg-white/10 text-green-400/70'
                    : item.status === 'done'
                    ? 'bg-white/10 text-white/40'
                    : 'bg-white/10 text-white/40'
                }`}>
                {item.status === 'want' ? 'Vil se' : item.status === 'watching' ? 'I gang' : 'Set'}
              </span>
            </div>
          </div>
          <div className="text-white/20 text-xl flex-shrink-0">›</div>
        </div>
      ))}
    </div>
  )
}