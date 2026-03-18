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

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

const WatchlistItems = ({ items }: { items: WatchlistItem[] }) => (
  <motion.div
    className="flex flex-col gap-2"
    variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    initial="hidden"
    animate="show"
  >
    {items.map(item_ => (
      <motion.a
        key={item_.id}
        href={`/${item_.media_type === 'movie' ? 'movie' : 'tv'}/${item_.tmdb_id}`}
        variants={item}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-4 rounded-2xl p-3 hover:bg-white/5 transition-colors no-underline"
      >
        {item_.poster ? (
          <img
            src={item_.poster}
            alt={item_.title}
            className="w-14 h-20 rounded-xl object-cover flex-shrink-0 shadow-lg"
          />
        ) : (
          <div className="w-14 h-20 rounded-xl bg-white/8 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-tight mb-1 truncate">{item_.title}</p>
          <p className="text-white/40 text-sm">
            {item_.media_type === 'tv' ? 'Serie' : 'Film'}{item_.year && ` · ${item_.year}`}
          </p>
          
          {/* **PROCENT-CIRKEL** */}
          {item_.media_type === 'tv' && item_.progress && item_.status === 'watching' && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => {
                  const percentage = (item_.progress!.watched_episodes || 0) / item_.progress!.total_episodes
                  const filledDots = Math.ceil(percentage * 5)
                  return (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i < filledDots ? 'bg-emerald-400 scale-110' : 'bg-white/20'
                      }`}
                    />
                  )
                })}
              </div>
              <span className="text-emerald-400/80 text-xs font-medium">
                {Math.round(((item_.progress!.watched_episodes || 0) / item_.progress!.total_episodes) * 100)}%
              </span>
            </div>
          )}
        </div>
        <div className="text-white/20 text-xl flex-shrink-0">›</div>
      </motion.a>
    ))}
  </motion.div>
)

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

  const wantItems = items.filter(item => item.status === 'want')
  const watchingItems = items.filter(item => item.status === 'watching')
  const doneItems = items.filter(item => item.status === 'done')

  return (
    <div className="w-full flex flex-col space-y-8">
      {wantItems.length > 0 && (
        <section>
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-4">
            Vil se ({wantItems.length})
          </h3>
          <WatchlistItems items={wantItems} />
        </section>
      )}

      {watchingItems.length > 0 && (
        <section>
          <h3 className="text-emerald-400/80 text-xs uppercase tracking-widest font-semibold mb-4">
            I gang ({watchingItems.length})
          </h3>
          <WatchlistItems items={watchingItems} />
        </section>
      )}

      {doneItems.length > 0 && (
        <section>
          <h3 className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">
            Set ({doneItems.length})
          </h3>
          <WatchlistItems items={doneItems} />
        </section>
      )}
    </div>
  )
}
