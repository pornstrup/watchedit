'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type WatchlistItem = {
  id: string
  tmdb_id: number
  media_type: string
  status: string
  title: string
  poster: string | null
  year?: string
  progress?: {
    total_episodes: number
    watched_episodes: number
  }
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
    <div className="flex flex-col gap-8">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-36 h-52 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  )

  if (items.length === 0) return (
    <p className="text-white/40 text-sm text-center py-8">Din liste er tom – søg efter noget at se!</p>
  )

  const watchingItems = items.filter(i => i.status === 'watching')
  const wantItems = items.filter(i => i.status === 'want')
  const doneItems = items.filter(i => i.status === 'done')

  return (
    <div className="flex flex-col gap-10">

      {/* I GANG – horisontalt scroll .*/}
      {watchingItems.length > 0 && (
        <section>
          <p className="text-emerald-400/80 text-xs uppercase tracking-widest font-semibold mb-4">
            I gang ({watchingItems.length})
          </p>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-6 px-6">
            {watchingItems.map((item, i) => (
              <motion.a
                key={item.id}
                href={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.06 }}
                whileTap={{ scale: 0.96 }}
                className="flex-shrink-0 no-underline"
              >
                <div className="relative w-36 h-52 rounded-2xl overflow-hidden">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-semibold leading-tight truncate">{item.title}</p>
                    {item.progress && (
                      <div className="mt-1.5">
                        <div className="w-full h-0.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${Math.round((item.progress.watched_episodes / item.progress.total_episodes) * 100)}%` }}
                          />
                        </div>
                        <p className="text-white/50 text-xs mt-1">
                          {Math.round((item.progress.watched_episodes / item.progress.total_episodes) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </section>
      )}

      {/* VIL SE – 2-kolonne grid */}
      {wantItems.length > 0 && (
        <section>
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">
            Vil se ({wantItems.length})
          </p>
          <div className="grid grid-cols-2 gap-3">
            {wantItems.map((item, i) => (
              <motion.a
                key={item.id}
                href={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileTap={{ scale: 0.96 }}
                className="no-underline"
              >
                <div className="relative rounded-2xl overflow-hidden aspect-[2/3]">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                      <p className="text-white/30 text-xs text-center px-2">{item.title}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-semibold leading-tight truncate">{item.title}</p>
                    <p className="text-white/50 text-xs">{item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}</p>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </section>
      )}

      {/* SET – 3-kolonne grid */}
      {doneItems.length > 0 && (
        <section>
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">
            Set ({doneItems.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {doneItems.map((item, i) => (
              <motion.a
                key={item.id}
                href={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                whileTap={{ scale: 0.96 }}
                className="no-underline"
              >
                <div className="relative rounded-xl overflow-hidden aspect-[2/3]">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/60 text-lg">✓</span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}