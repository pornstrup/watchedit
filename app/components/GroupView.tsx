'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

type Group = {
  id: string
  name: string
  created_by: string
  created_at: string
}

type ActivityEvent = {
  id: string
  type: 'added' | 'episode' | 'joined'
  user_name: string
  user_avatar: string | null
  title?: string
  tmdb_id?: number
  media_type?: string
  season?: number
  episode?: number
  timestamp: string
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'lige nu'
  if (mins < 60) return `${mins} min siden`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}t siden`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'i går'
  if (days < 7) return `${days} dage siden`
  return new Date(ts).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
}

function eventText(e: ActivityEvent): string {
  if (e.type === 'added') return `tilføjede${e.title ? ` ${e.title}` : ''}`
  if (e.type === 'episode') return `så S${e.season}E${e.episode}${e.title ? ` af ${e.title}` : ''}`
  return 'joined gruppen'
}

type Member = {
  id: string
  name: string
  avatar_url: string | null
  role: string
}

type GroupItem = {
  id: string
  tmdb_id: number
  media_type: string
  status: string
  title: string
  poster: string | null
  year?: string
  added_by: string
  added_at: string
  updated_at?: string
  progress?: {
    total_episodes: number
    watched_episodes: number
  }
}

type InspirationItem = {
  tmdb_id: number
  media_type: string
  title: string
  poster: string | null
  year?: string
  members: string[]
}

function Avatar({ url, name, size = 6 }: { url: string | null; name: string; size?: number }) {
  const px = size * 4
  return url ? (
    <Image
      src={url}
      alt={name}
      width={px}
      height={px}
      className="rounded-full ring-2 ring-black object-cover"
    />
  ) : (
    <div
      className="rounded-full ring-2 ring-black bg-white/20 flex items-center justify-center"
      style={{ width: px, height: px }}
    >
      <span className="text-white text-xs font-bold">{name?.[0]}</span>
    </div>
  )
}

function GroupPosterCard({
  item,
  groupId,
  onRemove,
  onStatusChange,
  onMarkNext,
  className,
  inScrollContainer,
}: {
  item: GroupItem
  groupId: string
  onRemove: (id: string, tmdbId: number, mediaType: string) => void
  onStatusChange?: (id: string, status: string) => void
  onMarkNext?: () => void
  className?: string
  inScrollContainer?: boolean
}) {
  const [pressing, setPressing] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [popupPos, setPopupPos] = useState<{ top?: number; bottom?: number; left: number }>({ bottom: 8, left: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
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
    const handleTouchEnd = () => {
      if (pressTimer.current) clearTimeout(pressTimer.current)
      setPressing(false)
    }
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const startPress = (e: React.MouseEvent) => {
    pressTimer.current = setTimeout(() => setShowOverlay(true), 500)
    setPressing(true)
  }

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    setPressing(false)
  }
  const href = `/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}?ctx=${groupId}`

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
        whileTap={showOverlay ? {} : { scale: 0.96 }}
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
              style={{ animation: 'fadeIn 0.3s ease-out' }}
            />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <p className="text-white/50 text-xs text-center px-2">{item.title}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

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
              <p className="text-white/50 text-xs">{item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}</p>
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
              {/* PREVIEW */}
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

              {/* STATUS KNAPPER */}
              {(['want', 'watching', 'done'] as const).map((s, i) => (
                <button
                  key={s}
                  onClick={async () => {
                    await fetch(`/api/groups/${groupId}/watchlist/status`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ item_id: item.id, status: s })
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

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />

              {/* FJERN */}
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
    </motion.div>
  )
}

function InspirationCard({
  item,
  groupId,
  onAddToWantSee,
  onHide,
  inScrollContainer,
}: {
  item: InspirationItem
  groupId: string
  onAddToWantSee: (item: InspirationItem) => void
  onHide: (item: InspirationItem) => void
  inScrollContainer?: boolean
}) {
  const [pressing, setPressing] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [popupPos, setPopupPos] = useState<{ top?: number; bottom?: number; left: number }>({ bottom: 8, left: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
const handleTouchStart = (_e: TouchEvent) => {
      pressTimer.current = setTimeout(() => {
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect()
          const screenWidth = window.innerWidth
          const popupWidth = 200
          let left = rect.left
          if (left + popupWidth > screenWidth - 16) left = screenWidth - popupWidth - 16
          if (left < 16) left = 16
          const popupHeight = 200
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
    const handleTouchEnd = () => {
      if (pressTimer.current) clearTimeout(pressTimer.current)
      setPressing(false)
    }
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const startPress = (e: React.MouseEvent) => {
    pressTimer.current = setTimeout(() => setShowOverlay(true), 500)
    setPressing(true)
  }

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    setPressing(false)
  }

  return (
    <motion.div
      ref={cardRef}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="relative flex-shrink-0 w-28"
    >
      <motion.div
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        animate={{
          scale: showOverlay ? 1.05 : pressing && !showOverlay ? 0.95 : 1,
          filter: showOverlay ? 'brightness(1.15)' : 'brightness(1)',
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="cursor-pointer"
      >
        <div className="relative w-28 rounded-xl overflow-hidden aspect-[2/3]">
          {item.poster ? (
            <Image
              src={item.poster}
              alt={item.title}
              fill
              className="object-cover opacity-70"
              sizes="112px"
              style={{ animation: 'fadeIn 0.3s ease-out' }}
            />
          ) : (
            <div className="w-full h-full bg-white/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className="text-white/70 text-xs font-medium leading-tight truncate">{item.title}</p>
          </div>
        </div>
      </motion.div>

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
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              className="fixed z-50 flex flex-col overflow-hidden rounded-2xl"
              style={{
                top: popupPos.top,
                bottom: popupPos.bottom,
                left: popupPos.left,
                width: 200,
                background: 'rgba(30, 30, 32, 0.98)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
                {item.poster && (
                  <Image src={item.poster} alt={item.title} width={32} height={48} className="rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                  <p className="text-white/55 text-xs truncate">{item.members.join(', ')} har denne</p>
                </div>
              </div>

              <button
                onClick={() => { onAddToWantSee(item); setShowOverlay(false) }}
                className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-white hover:bg-white/5 transition-colors border-b border-white/6"
              >
                Tilføj til Vil se
                <span className="text-white/55 text-base">+</span>
              </button>

              <button
                onClick={() => { onHide(item); setShowOverlay(false) }}
                className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-white/50 hover:bg-white/5 transition-colors"
              >
                Skjul denne
                <span className="text-white/20 text-base">✕</span>
              </button>
            </motion.div>
          </>,
          document.body
        )}
    </motion.div>
  )
}
function AllInspirationSheet({
  groupId,
  items,
  onClose,
  onAddToWantSee,
  onHide,
}: {
  groupId: string
  items: InspirationItem[]
  onClose: () => void
  onAddToWantSee: (item: InspirationItem) => void
  onHide: (item: InspirationItem) => void
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
        style={{
          background: 'rgba(18, 18, 18, 0.98)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          borderBottom: 'none',
          maxHeight: '85vh',
        }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-4 mb-4 flex-shrink-0" />
        <div className="flex items-center justify-between px-6 mb-4 flex-shrink-0">
          <p className="text-white font-semibold text-base">Al inspiration ({items.length})</p>
          <button onClick={onClose} className="text-white/60 text-sm">Luk</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-10">
          <div className="grid grid-cols-3 gap-3">
            {items.map(item => (
              <InspirationCard
                key={`${item.tmdb_id}-${item.media_type}`}
                item={item}
                groupId={groupId}
                onAddToWantSee={(i) => { onAddToWantSee(i); }}
                onHide={(i) => { onHide(i); }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}

function HiddenInspirationSheet({
  groupId,
  onClose,
  onRestore,
}: {
  groupId: string
  onClose: () => void
  onRestore: () => void
}) {
  const [items, setItems] = useState<{ tmdb_id: number; media_type: string; title: string; poster: string | null; year?: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/inspiration/hidden`)
      .then(r => r.json())
      .then(d => {
        setItems(d.items || [])
        setLoading(false)
      })
  }, [groupId])

  const restore = async (item: { tmdb_id: number; media_type: string }) => {
    await fetch(`/api/groups/${groupId}/inspiration/hidden`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type })
    })
    setItems(prev => prev.filter(i => !(i.tmdb_id === item.tmdb_id && i.media_type === item.media_type)))
    onRestore()
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
        style={{
          background: 'rgba(18, 18, 18, 0.98)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          borderBottom: 'none',
          maxHeight: '85vh',
        }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-4 mb-4 flex-shrink-0" />
        <div className="flex items-center justify-between px-6 mb-4 flex-shrink-0">
          <p className="text-white font-semibold text-base">Skjulte ({items.length})</p>
          <button onClick={onClose} className="text-white/60 text-sm">Luk</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-10">
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-white/60 text-sm text-center py-8">Ingen skjulte titler</p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map(item => (
                <div
                  key={`${item.tmdb_id}-${item.media_type}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {item.poster && (
                    <Image src={item.poster} alt={item.title} width={40} height={60} className="rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                    <p className="text-white/60 text-xs">{item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}</p>
                  </div>
                  <button
                    onClick={() => restore(item)}
                    className="text-white/50 text-xs px-3 py-1.5 rounded-xl flex-shrink-0"
                    style={{
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    Vis igen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
function GroupSettingsSheet({
  group,
  currentUserId,
  onClose,
  onLeave,
  onRename,
}: {
  group: Group
  currentUserId: string
  onClose: () => void
  onLeave: () => void
  onRename: (name: string) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(group.name)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/groups/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: group.id }),
    })
      .then(r => r.json())
      .then(d => setInviteUrl(d.url))
  }, [group.id])

  const copyInvite = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveRename = async () => {
    if (!newName.trim() || newName === group.name) return setRenaming(false)
    await fetch(`/api/groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    onRename(newName.trim())
    setRenaming(false)
  }

const isOwner = group.created_by === currentUserId

  const leave = async () => {
    if (isOwner) {
      await fetch(`/api/groups/${group.id}/delete`, { method: 'DELETE' })
    } else {
      await fetch(`/api/groups/${group.id}/leave`, { method: 'DELETE' })
    }
    onLeave()
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) onClose() }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl px-6 pt-5 pb-12"
        style={{
          background: 'rgba(28, 28, 30, 0.85)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          borderBottom: 'none',
        }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />
        <div className="flex flex-col gap-3">
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">{group.name}</p>

          {renaming ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveRename()}
                className="flex-1 bg-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none border border-white/20"
              />
              <button onClick={saveRename} className="px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold">Gem</button>
            </div>
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white text-sm font-medium text-left"
              style={{ background: 'rgba(255, 255, 255, 0.07)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <span className="text-lg">✏️</span> Omdøb gruppe
            </button>
          )}

          <button
            onClick={copyInvite}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-left transition-all duration-200"
            style={{
              background: copied ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 255, 255, 0.07)',
              border: copied ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: copied ? 'rgb(52, 199, 89)' : 'white',
            }}
          >
            <span className="text-lg">{copied ? '✓' : '🔗'}</span>
            {copied ? 'Kopieret!' : 'Kopier invite-link'}
          </button>

          <div className="h-px bg-white/10 my-1" />

         <button
            onClick={leave}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-400 text-sm font-medium text-left"
            style={{ background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.2)' }}
          >
            <span className="text-lg">{isOwner ? '🗑️' : '🚪'}</span>
            {isOwner ? 'Slet gruppe' : 'Forlad gruppe'}
          </button>
        </div>
      </motion.div>
    </>
  )
}

export default function GroupView({
  groupId,
  group,
  currentUserId,
  onRefresh,
  refreshKey,
}: {
  groupId: string
  group: Group
  currentUserId: string
  onRefresh: () => void
  refreshKey?: number
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [items, setItems] = useState<GroupItem[]>([])
  const [inspiration, setInspiration] = useState<InspirationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showAllInspiration, setShowAllInspiration] = useState(false)
  const [showHiddenInspiration, setShowHiddenInspiration] = useState(false)
  const [currentGroupName, setCurrentGroupName] = useState(group.name)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [showActivity, setShowActivity] = useState(false)

  useEffect(() => {
    setLoading(true)
    // Hent members + watchlist først så listen vises med det samme
    Promise.all([
      fetch(`/api/groups/${groupId}/members`).then(r => r.json()),
      fetch(`/api/groups/${groupId}/watchlist`).then(r => r.json()),
    ]).then(([membersData, itemsData]) => {
      setMembers(membersData.members || [])
      setItems(itemsData.items || [])
      setLoading(false)
    })
    // Inspiration hentes separat og vises når den er klar
    fetch(`/api/groups/${groupId}/inspiration`)
      .then(r => r.json())
      .then(d => setInspiration(d.items || []))
    // Aktivitet hentes baggrunden
    fetch(`/api/groups/${groupId}/activity`)
      .then(r => r.json())
      .then(d => setActivity(d.events || []))
  }, [groupId, refreshKey])
// Lyt på status-ændringer fra personlig liste og refresh inspiration
  useEffect(() => {
    const handler = () => {
      fetch(`/api/groups/${groupId}/inspiration`)
        .then(r => r.json())
        .then(d => setInspiration(d.items || []))
    }
    window.addEventListener('personal-status-updated', handler)
    return () => window.removeEventListener('personal-status-updated', handler)
  }, [groupId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_watchlist_items',
        filter: `group_id=eq.${groupId}`
      }, () => {
        fetch(`/api/groups/${groupId}/watchlist`)
          .then(r => r.json())
          .then(d => setItems(d.items || []))
        fetch(`/api/groups/${groupId}/inspiration`)
          .then(r => r.json())
          .then(d => setInspiration(d.items || []))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId])
  const removeItem = async (id: string, tmdbId: number, mediaType: string) => {
    if (navigator.vibrate) navigator.vibrate(8)
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/groups/${groupId}/watchlist`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType })
    })
    const inspirationRes = await fetch(`/api/groups/${groupId}/inspiration`)
    const inspirationData = await inspirationRes.json()
    setInspiration(inspirationData.items || [])
  }

  const updateStatus = (id: string, status: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  const addInspirationToWantSee = async (item: InspirationItem) => {
    const res = await fetch(`/api/groups/${groupId}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type })
    })
    const data = await res.json()
    setInspiration(prev => prev.filter(i => !(i.tmdb_id === item.tmdb_id && i.media_type === item.media_type)))
    if (data.data) {
      setItems(prev => [...prev, {
        ...data.data,
        title: item.title,
        poster: item.poster,
        year: item.year,
      }])
    }
  }

  const hideInspiration = async (item: InspirationItem) => {
    await fetch(`/api/groups/${groupId}/inspiration`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type })
    })
    setInspiration(prev => prev.filter(i => !(i.tmdb_id === item.tmdb_id && i.media_type === item.media_type)))
  }

  const watchingItems = items.filter(i => i.status === 'watching')
  const wantItems = items.filter(i => i.status === 'want')
  const doneItems = items.filter(i => i.status === 'done')

  const doneByMonth = doneItems.reduce((acc, item) => {
    const date = new Date(item.updated_at || item.added_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = { label, items: [] }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { label: string; items: GroupItem[] }>)

  const handleLeave = () => {
    setShowSettings(false)
    onRefresh()
    window.location.href = '/'
  }

  const handleRename = (name: string) => {
    setCurrentGroupName(name)
    onRefresh()
  }

  const featuredItem = watchingItems[0] || wantItems[0] || null
  const featuredAction = watchingItems.length > 0 ? 'Fortsæt' : 'Start'

  if (loading) return (
    <div className="flex flex-col gap-6">
      <div className="h-40 rounded-3xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  )

  if (items.length === 0) return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center justify-center py-20 gap-6"
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
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-white text-xl font-semibold">Ingen film endnu</h2>
        <p className="text-white/55 text-sm leading-relaxed max-w-[220px]">Tilføj film og serier I vil se sammen med gruppen</p>
      </div>
      <button
        onClick={() => window.dispatchEvent(new Event('open-search'))}
        className="px-6 py-3 rounded-full text-black text-sm font-semibold"
        style={{ background: 'white' }}
      >
        Tilføj noget
      </button>
    </motion.div>
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-8"
      >
        {/* SETTINGS KNAP */}
        <div className="flex justify-end -mt-6 mb-2">
          <button
            onClick={() => { setShowSettings(true); window.dispatchEvent(new Event('sheet-opened')) }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white/55 hover:text-white/80 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="19" cy="12" r="2"/>
            </svg>
          </button>
        </div>

        {/* MEDLEMMER + AKTIVITET */}
        {members.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <Avatar url={m.avatar_url} name={m.name} size={7} />
                  <span className="text-white/50 text-sm">{m.name?.split(' ')[0]}</span>
                </div>
              ))}
            </div>
            {activity.length > 0 && (
              <button
                onClick={() => { setShowActivity(true); window.dispatchEvent(new Event('sheet-opened')) }}
                className="flex items-center gap-2 text-left active:opacity-60 transition-opacity"
              >
                {activity[0].user_avatar ? (
                  <Image src={activity[0].user_avatar} alt={activity[0].user_name} width={16} height={16} className="rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-white/20 flex-shrink-0" />
                )}
                <span className="text-white/40 text-xs truncate">
                  <span className="text-white/60">{activity[0].user_name}</span>
                  {' '}{eventText(activity[0])}
                </span>
                <span className="text-white/22 text-xs flex-shrink-0">{relativeTime(activity[0].timestamp)}</span>
              </button>
            )}
          </div>
        )}

        {/* HVAD SER I I AFTEN */}
        {featuredItem ? (
          <div className="relative rounded-3xl overflow-hidden" style={{ minHeight: 160 }}>
            {featuredItem.poster && (
              <Image
                src={featuredItem.poster}
                alt={featuredItem.title}
                fill
                className="object-cover opacity-40"
                sizes="100vw"
                style={{ filter: 'blur(12px)', transform: 'scale(1.1)' }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="relative p-6 flex flex-col gap-4">
              <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">
                {watchingItems.length > 0 ? 'Fortsæt med' : 'Hvad ser I i aften?'}
              </p>
              <h2 className="text-white text-2xl font-bold leading-tight">{featuredItem.title}</h2>
              <div className="flex gap-2">
                <a
                  href={`/${featuredItem.media_type === 'movie' ? 'movie' : 'tv'}/${featuredItem.tmdb_id}?ctx=${groupId}`}
                  className="px-5 py-2.5 rounded-xl text-black text-sm font-semibold no-underline"
                  style={{ background: 'white' }}
                >
                  {featuredAction} →
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-white text-lg font-semibold">Ingen titler endnu</p>
            <p className="text-white/55 text-sm">Søg efter film og serier og tilføj dem til {currentGroupName}</p>
          </div>
        )}

        {/* I GANG */}
        {watchingItems.length > 0 && (
          <section>
            <p className="text-emerald-400/80 text-xs uppercase tracking-widest font-semibold mb-4">
              Fortsæt med
            </p>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-6 px-6">
              <AnimatePresence>
                {watchingItems.map(item => (
                    <GroupPosterCard
                      key={item.id}
                      item={item}
                      groupId={groupId}
                      onRemove={removeItem}
                      onStatusChange={updateStatus}
                      onMarkNext={item.media_type === 'tv' ? () => {
                        setItems(prev => prev.map(i =>
                          i.id === item.id && i.progress
                            ? { ...i, progress: { ...i.progress, watched_episodes: i.progress.watched_episodes + 1 } }
                            : i
                        ))
                        fetch('/api/watchlist/mark-next', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ itemId: item.id, tmdbId: item.tmdb_id, ctx: groupId }),
                        })
                      } : undefined}
                      className="flex-shrink-0 w-40 h-60"
                      inScrollContainer
                    />
                  ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* VIL SE */}
        {wantItems.length > 0 && (
          <section>
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-4">
              Vil se ({wantItems.length})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {wantItems.map(item => (
                  <GroupPosterCard
                    key={item.id}
                    item={item}
                    groupId={groupId}
                    onRemove={removeItem}
                    onStatusChange={updateStatus}
                    className="aspect-[2/3]"
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* INSPIRATION */}
        {inspiration.length > 0 && (
          <section>
            <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/25 text-xs uppercase tracking-widest font-semibold">
                  Inspiration ({inspiration.length})
                </p>
                <div className="flex items-center gap-3">
                  {inspiration.length > 10 && (
                    <button
                      onClick={() => { setShowAllInspiration(true); window.dispatchEvent(new Event('sheet-opened')) }}
                      className="text-white/25 text-xs"
                    >
                      Se alle →
                    </button>
                  )}
                  <button
                    onClick={() => { setShowHiddenInspiration(true); window.dispatchEvent(new Event('sheet-opened')) }}
                    className="text-white/20 text-xs"
                  >
                    Vis skjulte →
                  </button>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-6 px-6">
                <AnimatePresence>
                  {inspiration.slice(0, 10).map(item => (
                    <InspirationCard
                      key={`${item.tmdb_id}-${item.media_type}`}
                      item={item}
                      groupId={groupId}
                      onAddToWantSee={addInspirationToWantSee}
                      onHide={hideInspiration}
                      inScrollContainer
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </section>
        )}

        {/* SET */}
        {doneItems.length > 0 && (
          <section>
            <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-4">
                Set ({doneItems.length})
              </p>
              <div className="flex flex-col gap-4">
                {Object.entries(doneByMonth)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([key, { label, items: monthItems }], index) => (
                    <MonthSection
                      key={key}
                      label={label}
                      items={monthItems}
                      groupId={groupId}
                      defaultOpen={index === 0}
                      onStatusChange={updateStatus}
                      onRemove={removeItem}
                    />
                  ))}
              </div>
            </div>
          </section>
        )}
      </motion.div>

   <AnimatePresence>
        {showSettings && (
          <GroupSettingsSheet
            group={{ ...group, name: currentGroupName }}
            currentUserId={currentUserId}
            onClose={() => { setShowSettings(false); window.dispatchEvent(new Event('sheet-closed')) }}
            onLeave={handleLeave}
            onRename={handleRename}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAllInspiration && (
          <AllInspirationSheet
            groupId={groupId}
            items={inspiration}
            onClose={() => { setShowAllInspiration(false); window.dispatchEvent(new Event('sheet-closed')) }}
            onAddToWantSee={(item) => { addInspirationToWantSee(item); setShowAllInspiration(false) }}
            onHide={(item) => { hideInspiration(item); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHiddenInspiration && (
          <HiddenInspirationSheet
            groupId={groupId}
            onClose={() => { setShowHiddenInspiration(false); window.dispatchEvent(new Event('sheet-closed')) }}
            onRestore={async () => {
              const inspirationData = await fetch(`/api/groups/${groupId}/inspiration`).then(r => r.json())
              setInspiration(inspirationData.items || [])
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showActivity && (
          <ActivitySheet
            events={activity}
            onClose={() => { setShowActivity(false); window.dispatchEvent(new Event('sheet-closed')) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function MonthSection({
  label,
  items,
  groupId,
  defaultOpen,
  onStatusChange,
  onRemove,
}: {
  label: string
  items: GroupItem[]
  groupId: string
  defaultOpen: boolean
  onStatusChange: (id: string, status: string) => void
  onRemove: (id: string, tmdbId: number, mediaType: string) => void
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
              <GroupPosterCard
                key={item.id}
                item={item}
                groupId={groupId}
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

function ActivitySheet({
  events,
  onClose,
}: {
  events: ActivityEvent[]
  onClose: () => void
}) {
  const groups: { label: string; events: ActivityEvent[] }[] = []
  for (const e of events) {
    const d = new Date(e.timestamp)
    const isToday = d.toDateString() === new Date().toDateString()
    const isYesterday = d.toDateString() === new Date(Date.now() - 86400000).toDateString()
    const label = isToday ? 'I dag' : isYesterday ? 'I går' : d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })
    const last = groups[groups.length - 1]
    if (last?.label === label) last.events.push(e)
    else groups.push({ label, events: [e] })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/50"
        style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) onClose() }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background: 'rgba(28,28,30,0.97)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          maxHeight: '80vh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 flex-shrink-0" />

        <div className="px-5 pt-5 pb-4 flex-shrink-0">
          <p className="text-white font-semibold text-base">Aktivitet</p>
        </div>

        <div className="overflow-y-auto flex-1">
          {events.length === 0 && (
            <p className="text-white/35 text-sm text-center py-12">Ingen aktivitet endnu</p>
          )}

          {groups.map(group => (
            <div key={group.label}>
              <p className="text-white/25 text-xs px-5 pt-4 pb-2">{group.label}</p>

              {group.events.map((e, i) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 px-5 py-3"
                  style={i < group.events.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
                >
                  {e.user_avatar ? (
                    <Image src={e.user_avatar} alt={e.user_name} width={36} height={36} className="rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/12 flex items-center justify-center flex-shrink-0">
                      <span className="text-white/80 text-sm font-semibold">{e.user_name[0]}</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-white/85 text-[14px] leading-snug">
                      <span className="text-white font-medium">{e.user_name}</span>
                      {e.type === 'added' && <>{' '}<span className="text-white/50">tilføjede</span>{e.title && <>{' '}<span>{e.title}</span></>}</>}
                      {e.type === 'episode' && <>{' '}<span className="text-white/50">så</span>{' '}<span>S{e.season}E{e.episode}</span>{e.title && <>{' '}<span className="text-white/50">af</span>{' '}<span>{e.title}</span></>}</>}
                      {e.type === 'joined' && <>{' '}<span className="text-white/50">joined gruppen</span></>}
                    </p>
                  </div>

                  <span className="text-white/25 text-xs flex-shrink-0">{relativeTime(e.timestamp)}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="h-6" />
        </div>
      </motion.div>
    </>
  )
}