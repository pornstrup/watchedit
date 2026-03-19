'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

function PosterCard({
  item,
  onRemove,
  onStatusChange,
  className,
}: {
  item: WatchlistItem
  onRemove: (id: string, tmdbId: number, mediaType: string) => void
  onStatusChange?: (id: string, status: string) => void
  className?: string
}) {
  const [pressing, setPressing] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startPress = () => {
    pressTimer.current = setTimeout(() => {
      setShowOverlay(true)
      if (navigator.vibrate) navigator.vibrate(10)
    }, 500)
    setPressing(true)
  }

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    setPressing(false)
  }

  const href = `/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`

  return (
    <motion.div
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative group ${className || ''}`}
    >
      <motion.a
        href={showOverlay ? undefined : href}
        onClick={e => showOverlay && e.preventDefault()}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        animate={{ scale: pressing && !showOverlay ? 0.95 : 1 }}
        transition={{ duration: 0.15 }}
        whileTap={showOverlay ? {} : { scale: 0.96 }}
        className="block no-underline h-full"
      >
        <div className={`relative rounded-2xl overflow-hidden h-full ${item.status === 'done' ? 'opacity-70' : ''}`}>
          {item.poster ? (
            <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <p className="text-white/30 text-xs text-center px-2">{item.title}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />

          {item.status === 'done' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/60 text-2xl">✓</span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white text-xs font-semibold leading-tight truncate">{item.title}</p>
            {item.status === 'watching' && item.progress && (
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
            {item.status !== 'watching' && (
              <p className="text-white/50 text-xs">{item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}</p>
            )}
          </div>
        </div>
      </motion.a>

      <AnimatePresence>
        {showOverlay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowOverlay(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="absolute top-2 right-2 z-50 flex flex-col gap-1"
            >
              {(['want', 'watching', 'done'] as const).map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    await fetch('/api/watchlist/status', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: item.id, status: s })
                    })
                    onStatusChange?.(item.id, s)
                    setShowOverlay(false)
                  }}
                  className={`flex items-center px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                    item.status === s ? 'text-white' : 'text-white/50'
                  }`}
                  style={{
                    background: item.status === s
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(20, 20, 20, 0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: item.status === s
                      ? '1px solid rgba(255, 255, 255, 0.2)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {s === 'want' ? 'Vil se' : s === 'watching' ? 'I gang' : 'Set'}
                </button>
              ))}

              <div className="h-px bg-white/10 my-0.5" />

              <button
                onClick={() => {
                  onRemove(item.id, item.tmdb_id, item.media_type)
                  setShowOverlay(false)
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 text-xs font-semibold whitespace-nowrap"
                style={{
                  background: 'rgba(20, 20, 20, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 59, 48, 0.2)',
                }}
              >
                Fjern fra liste
              </button>

              <button
                onClick={() => setShowOverlay(false)}
                className="flex items-center justify-center px-3 py-2 rounded-xl text-white/50 text-xs font-medium"
                style={{
                  background: 'rgba(20, 20, 20, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                Annuller
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Watchlist({ onRemove }: { onRemove?: () => void }) {
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

  const removeItem = async (id: string, tmdbId: number, mediaType: string) => {
    if (navigator.vibrate) navigator.vibrate(8)
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch('/api/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType })
    })
    onRemove?.()
  }

  const updateStatus = (id: string, status: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

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
    <motion.div
      className="flex flex-col gap-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >

      {/* I GANG */}
      <AnimatePresence>
        {watchingItems.length > 0 && (
          <motion.section
            key="watching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <p className="text-emerald-400/80 text-xs uppercase tracking-widest font-semibold mb-4">
              I gang ({watchingItems.length})
            </p>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-6 px-6">
              <AnimatePresence>
                {watchingItems.map((item) => (
                  <PosterCard
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onStatusChange={updateStatus}
                    className="flex-shrink-0 w-36 h-52"
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* VIL SE */}
      <AnimatePresence>
        {wantItems.length > 0 && (
          <motion.section
            key="want"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">
              Vil se ({wantItems.length})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {wantItems.map((item) => (
                  <PosterCard
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onStatusChange={updateStatus}
                    className="aspect-[2/3]"
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* SET */}
      <AnimatePresence>
        {doneItems.length > 0 && (
          <motion.section
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">
              Set ({doneItems.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence>
                {doneItems.map((item) => (
                  <PosterCard
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onStatusChange={updateStatus}
                    className="aspect-[2/3]"
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

    </motion.div>
  )
}