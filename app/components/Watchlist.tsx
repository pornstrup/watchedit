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

type Group = {
  id: string
  name: string
}

function PosterCard({
  item,
  groups,
  onRemove,
  onStatusChange,
  className,
}: {
  item: WatchlistItem
  groups: Group[]
  onRemove: (id: string, tmdbId: number, mediaType: string) => void
  onStatusChange?: (id: string, status: string) => void
  className?: string
}) {
  const [pressing, setPressing] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })
  const [sharingTo, setSharingTo] = useState<string | null>(null)
  const [sharedGroups, setSharedGroups] = useState<string[]>([])
  const cardRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startPress = () => {
    pressTimer.current = setTimeout(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        const screenWidth = window.innerWidth
        const popupWidth = 220
        let left = rect.left
        if (left + popupWidth > screenWidth - 16) left = screenWidth - popupWidth - 16
        if (left < 16) left = 16
        const popupHeight = 260
        let top = rect.bottom + 8
        if (top + popupHeight > window.innerHeight - 100) top = rect.top - popupHeight - 8
        setPopupPos({ top, left })
      }
      setShowOverlay(true)
      if (navigator.vibrate) navigator.vibrate(10)
    }, 500)
    setPressing(true)
  }

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    setPressing(false)
  }

  const shareToGroup = async (groupId: string) => {
    setSharingTo(groupId)
    await fetch(`/api/groups/${groupId}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type })
    })
    setSharedGroups(prev => [...prev, groupId])
    setSharingTo(null)
    if (groups.length === 1) setShowOverlay(false)
  }

  const href = `/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`

  return (
    <motion.div
      ref={cardRef}
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
        animate={{ scale: pressing || showOverlay ? 0.96 : 1 }}
        transition={{ duration: 0.15 }}
        whileTap={showOverlay ? {} : { scale: 0.96 }}
        className="block no-underline h-full"
      >
        <div className={`relative rounded-2xl overflow-hidden h-full ${item.status === 'done' ? 'opacity-70' : ''}`}>
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              className="w-full h-full object-cover"
              style={{ animation: 'fadeIn 0.3s ease-out' }}
            />
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
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              onClick={() => setShowOverlay(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              className="fixed z-50 flex flex-col overflow-hidden rounded-2xl"
              style={{
                top: popupPos.top,
                left: popupPos.left,
                width: 220,
                background: 'rgba(30, 30, 32, 0.98)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              {/* PREVIEW */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {item.poster && (
                  <img src={item.poster} alt={item.title} className="w-8 rounded-lg object-cover flex-shrink-0" style={{ aspectRatio: '2/3' }} />
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                  <p className="text-white/30 text-xs">{item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}</p>
                </div>
              </div>

              {/* STATUS */}
              {(['want', 'watching', 'done'] as const).map((s, i) => (
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
                  className="flex items-center justify-between px-4 py-3 text-sm transition-colors"
                  style={{
                    borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    color: item.status === s ? 'white' : 'rgba(255,255,255,0.5)',
                    fontWeight: item.status === s ? 600 : 400,
                  }}
                >
                  {s === 'want' ? 'Vil se' : s === 'watching' ? 'I gang' : 'Set'}
                  {item.status === s && <span className="text-emerald-400 text-xs">✓</span>}
                </button>
              ))}

              {/* DEL MED GRUPPE */}
              {groups.length > 0 && (
                <>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                  {groups.length === 1 ? (
                    <button
                      onClick={() => shareToGroup(groups[0].id)}
                      className="flex items-center justify-between px-4 py-3 text-sm transition-colors"
                      style={{ color: sharedGroups.includes(groups[0].id) ? 'rgba(52,199,89,0.9)' : 'rgba(255,255,255,0.6)' }}
                    >
                      {sharedGroups.includes(groups[0].id) ? `Delt med ${groups[0].name} ✓` : `Del med ${groups[0].name}`}
                      {sharingTo === groups[0].id && <span className="text-white/30 text-xs">...</span>}
                    </button>
                  ) : (
                    groups.map((g, i) => (
                      <button
                        key={g.id}
                        onClick={() => shareToGroup(g.id)}
                        className="flex items-center justify-between px-4 py-3 text-sm transition-colors"
                        style={{
                          borderBottom: i < groups.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          color: sharedGroups.includes(g.id) ? 'rgba(52,199,89,0.9)' : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {sharedGroups.includes(g.id) ? `${g.name} ✓` : `Del med ${g.name}`}
                        {sharingTo === g.id && <span className="text-white/30 text-xs">...</span>}
                      </button>
                    ))
                  )}
                </>
              )}

              {/* FJERN */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
              <button
                onClick={() => {
                  onRemove(item.id, item.tmdb_id, item.media_type)
                  setShowOverlay(false)
                }}
                className="flex items-center justify-between px-4 py-3 text-sm"
                style={{ color: 'rgba(255, 59, 48, 0.9)' }}
              >
                Fjern fra liste
                <span className="text-base">×</span>
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
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/watchlist/list').then(r => r.json()),
      fetch('/api/groups').then(r => r.json()),
    ]).then(([watchlistData, groupsData]) => {
      setItems(watchlistData.items || [])
      setGroups((groupsData.groups || []).filter(Boolean))
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
  window.dispatchEvent(new CustomEvent('personal-status-updated'))
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
                    groups={groups}
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
                    groups={groups}
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
                    groups={groups}
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