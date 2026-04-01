'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import RatingSheet from './RatingSheet'

type WatchlistItem = {
  id: string
  tmdb_id: number
  media_type: string
  status: string
  title: string
  poster: string | null
  year?: string
  added_at?: string
  updated_at?: string
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
  onMarkNext,
  className,
  priority,
}: {
  item: WatchlistItem
  groups: Group[]
  onRemove: (id: string, tmdbId: number, mediaType: string) => void
  onStatusChange?: (id: string, status: string) => void
  onMarkNext?: () => void
  className?: string
  priority?: boolean
}) {
  const [pressing, setPressing] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [popupPos, setPopupPos] = useState<{ top?: number; bottom?: number; left: number }>({ bottom: 8, left: 0 })
  const [sharingTo, setSharingTo] = useState<string | null>(null)
  const [sharedGroups, setSharedGroups] = useState<string[]>([])
  const cardRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    let startX = 0
    let startY = 0

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      pressTimer.current = setTimeout(() => {
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect()
          const screenWidth = window.innerWidth
          const popupWidth = 220
          let left = rect.left
          if (left + popupWidth > screenWidth - 16) left = screenWidth - popupWidth - 16
          if (left < 16) left = 16
          const popupHeight = 280
          const spaceBelow = window.innerHeight - rect.bottom
          if (spaceBelow > popupHeight + 16) {
            setPopupPos({ top: rect.bottom + 8, left })
          } else {
            setPopupPos({ bottom: window.innerHeight - rect.top + 8, left })
          }
        }
        setShowOverlay(true)
        if (navigator.vibrate) navigator.vibrate(10)
      }, 600)
      setPressing(true)
    }
    const handleTouchMove = (e: TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - startX)
      const dy = Math.abs(e.touches[0].clientY - startY)
      if (dx > 8 || dy > 8) {
        if (pressTimer.current) clearTimeout(pressTimer.current)
        setPressing(false)
      }
    }
    const handleTouchEnd = () => {
      if (pressTimer.current) clearTimeout(pressTimer.current)
      setPressing(false)
    }
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const startPress = (e: React.MouseEvent) => {
    pressTimer.current = setTimeout(() => {
      setShowOverlay(true)
    }, 600)
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
        animate={{
          scale: showOverlay ? 1.05 : pressing && !showOverlay ? 0.95 : 1,
          filter: showOverlay ? 'brightness(1.15)' : 'brightness(1)',
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="block no-underline h-full"
      >
        <div className={`relative rounded-2xl overflow-hidden h-full ${item.status === 'done' ? 'opacity-70' : ''}`}>
          {item.poster ? (
            <Image
              src={item.poster}
              alt={item.title}
              fill
              className="object-cover"
              sizes="160px"
              priority={priority}
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
            {item.status === 'watching' && item.progress && item.media_type === 'tv' && (
              <div className="mt-1.5">
                <div className="w-full h-0.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${Math.round((item.progress.watched_episodes / item.progress.total_episodes) * 100)}%` }}
                  />
                </div>
                <p className="text-white/65 text-xs mt-1">
                  Afsnit {item.progress.watched_episodes + 1} af {item.progress.total_episodes}
                </p>
              </div>
            )}
            {item.status === 'watching' && item.media_type === 'movie' && (
              <p className="text-emerald-400/80 text-xs mt-1">I gang</p>
            )}
            {item.status !== 'watching' && (
              <p className="text-white/65 text-xs">{item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}</p>
            )}
          </div>
        </div>
      </motion.a>

{showOverlay && typeof document !== 'undefined' && createPortal(
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
              transition={{ type: 'spring', damping: 22, stiffness: 380 }}
              className="fixed z-50 flex flex-col overflow-hidden rounded-2xl"
              style={{
                top: popupPos.top,
                bottom: popupPos.bottom,
                left: popupPos.left,
                width: 220,
                transformOrigin: popupPos.top !== undefined ? 'top left' : 'bottom left',
                background: 'rgba(30, 30, 32, 0.98)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {item.poster && (
                  <Image src={item.poster} alt={item.title} width={32} height={48} className="rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                  <p className="text-white/50 text-xs">{item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}</p>
                </div>
              </div>

              {onMarkNext && item.media_type === 'tv' && item.progress && (
                <button
                  onClick={() => { setShowOverlay(false); onMarkNext() }}
                  className="flex items-center px-4 py-3 text-sm w-full"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="text-white font-medium">Jeg har set afsnit {item.progress.watched_episodes + 1}</span>
                </button>
              )}

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
                    if (s === 'done') setShowRating(true)
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
          </>,
          document.body
        )}

      <AnimatePresence>
        {showRating && (
          <RatingSheet
            tmdbId={item.tmdb_id}
            mediaType={item.media_type}
            title={item.title}
            poster={item.poster}
            onClose={() => setShowRating(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
function PersonalMonthSection({
  label,
  items,
  groups,
  defaultOpen,
  onRemove,
  onStatusChange,
}: {
  label: string
  items: WatchlistItem[]
  groups: Group[]
  defaultOpen: boolean
  onRemove: (id: string, tmdbId: number, mediaType: string) => void
  onStatusChange: (id: string, status: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full mb-3"
      >
        <p className="text-white/70 text-sm font-medium capitalize">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs">{items.length}</span>
          <span className="text-white/50 text-xs">{open ? '↑' : '↓'}</span>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-3 gap-2"
          >
            {items.map(item => (
              <PosterCard
                key={item.id}
                item={item}
                groups={groups}
                onRemove={onRemove}
                onStatusChange={onStatusChange}
                className="aspect-[2/3]"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Watchlist({ onRemove, groups = [] }: { onRemove?: () => void; groups?: Group[] }) {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/watchlist/list')
      .then(r => r.json())
      .then(watchlistData => {
        setItems(watchlistData.items || [])
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
          <div key={i} className="flex-shrink-0 w-40 h-60 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  )

 const watchingItems = items.filter(i => i.status === 'watching')
  const wantItems = items.filter(i => i.status === 'want')
  const doneItems = items.filter(i => i.status === 'done')

  const doneByMonth = doneItems.reduce((acc, item) => {
    const date = new Date(item.updated_at || item.added_at || '')
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = { label, items: [] }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { label: string; items: WatchlistItem[] }>)

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
              Fortsæt med
            </p>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-6 px-6">
              <AnimatePresence>
                {watchingItems.map((item, i) => (
                  <PosterCard
                    key={item.id}
                    item={item}
                    groups={groups}
                    onRemove={removeItem}
                    onStatusChange={updateStatus}
                    priority={i === 0}
                    onMarkNext={item.media_type === 'tv' ? () => {
                      setItems(prev => prev.map(i =>
                        i.id === item.id && i.progress
                          ? { ...i, progress: { ...i.progress, watched_episodes: i.progress.watched_episodes + 1 } }
                          : i
                      ))
                      fetch('/api/watchlist/mark-next', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ itemId: item.id, tmdbId: item.tmdb_id }),
                      })
                    } : undefined}
                    className="flex-shrink-0 w-40 h-60"
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* EMPTY STATE */}
      <AnimatePresence>
        {watchingItems.length === 0 && wantItems.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center justify-center py-16 gap-6"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                <line x1="7" y1="2" x2="7" y2="22"/>
                <line x1="17" y1="2" x2="17" y2="22"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <line x1="2" y1="7" x2="7" y2="7"/>
                <line x1="2" y1="17" x2="7" y2="17"/>
                <line x1="17" y1="17" x2="22" y2="17"/>
                <line x1="17" y1="7" x2="22" y2="7"/>
              </svg>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-white text-xl font-semibold">Hvad skal du se næste?</h2>
              <p className="text-white/55 text-sm leading-relaxed max-w-[220px]">Søg efter film og serier og tilføj dem til din liste</p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new Event('open-search'))}
              className="px-6 py-3 rounded-full text-black text-sm font-semibold"
              style={{ background: 'white' }}
            >
              Find noget at se
            </button>
          </motion.div>
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
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-4">
              Vil se ({wantItems.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence>
                {wantItems.map((item, i) => (
                  <PosterCard
                    key={item.id}
                    item={item}
                    groups={groups}
                    onRemove={removeItem}
                    onStatusChange={updateStatus}
                    priority={i === 0}
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
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-4">
              Set ({doneItems.length})
            </p>
            <div className="flex flex-col gap-4">
              {Object.entries(doneByMonth)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([key, { label, items: monthItems }], index) => (
                  <PersonalMonthSection
                    key={key}
                    label={label}
                    items={monthItems}
                    groups={groups}
                    defaultOpen={false}
                    onRemove={removeItem}
                    onStatusChange={updateStatus}
                  />
                ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  )
}