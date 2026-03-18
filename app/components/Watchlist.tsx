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
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
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
      <motion.div
        className="flex flex-col gap-2"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden"
        animate="show"
      >
        {items.map(item_ => {
            return (
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
                            className="w-14 h-20 rounded-xl object-cover flex-shrink-0 shadow-lg" />
                    ) : (
                        <div className="w-14 h-20 rounded-xl bg-white/8 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-base leading-tight mb-1 truncate">{item_.title}</p>
                        <p className="text-white/40 text-sm">
                            {item_.media_type === 'tv' ? 'Serie' : 'Film'}{item_.year && ` · ${item_.year}`}
                        </p>
                        <div className="mt-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item_.status === 'watching'
                                    ? 'bg-white/10 text-green-400/70'
                                    : 'bg-white/10 text-white/40'}`}>
                                {item_.status === 'want' ? 'Vil se' : item_.status === 'watching' ? 'I gang' : 'Set'}
                            </span>
                        </div>
                    </div>
                    <div className="text-white/20 text-xl flex-shrink-0">›</div>
                </motion.a>
            )
        })}
      </motion.div>
    </div>
  )
}