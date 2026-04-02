'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import RatingSheet from './RatingSheet'

type Status = 'want' | 'watching' | 'done'

const glassInactive = {
  background: 'rgba(255, 255, 255, 0.07)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
}

const glassActive = {
  background: 'rgba(52, 199, 89, 0.15)',
  border: '1px solid rgba(52, 199, 89, 0.35)',
}


export default function StatusButtons({
  itemId: initialItemId,
  initialStatus,
  initialOnList,
  onStatusChange,
  ctx,
  tmdbId,
  mediaType,
  title,
  poster,
  compact,
}: {
  itemId?: string
  initialStatus?: Status
  initialOnList: boolean
  onStatusChange?: (status: string) => void
  ctx?: string
  tmdbId: number
  mediaType: string
  title?: string
  poster?: string | null
  compact?: boolean
}) {
  const [onList, setOnList] = useState(initialOnList)
  const [status, setStatus] = useState<Status | null>(initialStatus || null)
  const [itemId, setItemId] = useState<string | undefined>(initialItemId)
  const [showRating, setShowRating] = useState(false)
  const [showAlsoAdd, setShowAlsoAdd] = useState(false)

  const sz = compact ? 44 : 60
  const iconSz = compact ? 20 : 24
  const labelStyle: React.CSSProperties = {
    fontSize: compact ? 10 : 11,
    fontWeight: 500,
    letterSpacing: 0.2,
  }

  const addToList = async () => {
    if (navigator.vibrate) navigator.vibrate(8)
    window.umami?.track('add-to-watchlist', { media_type: mediaType })
    setOnList(true)
    setStatus('want')
    if (ctx) setShowAlsoAdd(true)
    const endpoint = ctx ? `/api/groups/${ctx}/watchlist` : '/api/watchlist'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType }),
    })
    const { data } = await res.json()
    if (data?.id) setItemId(data.id)
    window.dispatchEvent(new Event('watchlist-updated'))
  }

  const addToPersonalList = async () => {
    setShowAlsoAdd(false)
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType }),
    })
    if (navigator.vibrate) navigator.vibrate(8)
    window.dispatchEvent(new Event('watchlist-updated'))
  }

  const removeFromList = async () => {
    if (navigator.vibrate) navigator.vibrate(8)
    setOnList(false)
    setStatus(null)
    setItemId(undefined)
    setShowAlsoAdd(false)
    const endpoint = ctx ? `/api/groups/${ctx}/watchlist` : '/api/watchlist'
    await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType }),
    })
    window.dispatchEvent(new Event('watchlist-updated'))
  }

  const changeStatus = async (newStatus: Status) => {
    if (!onList || !itemId) return
    if (newStatus === 'done' && status === 'done') return
    if (navigator.vibrate) navigator.vibrate(8)
    setStatus(newStatus)
    onStatusChange?.(newStatus)
    if (ctx) {
      await fetch(`/api/groups/${ctx}/watchlist/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, status: newStatus }),
      })
    } else {
      await fetch('/api/watchlist/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, status: newStatus }),
      })
    }
    if (newStatus === 'done' && title) {
      window.umami?.track('mark-watched', { media_type: mediaType })
      setShowRating(true)
    }
  }

  // ♥ tap-logik:
  // Ikke på liste → tilføj
  // På liste, status=want → fjern (toggle)
  // På liste, status=watching/done → skift til want
  const handleHeart = () => {
    if (!onList) {
      addToList()
    } else if (status === 'want') {
      removeFromList()
    } else {
      changeStatus('want')
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
      <div className="flex gap-4 items-start">

        {/* ♥ Vil se — ramme altid neutral, kun ikonet farves */}
        <button
          onClick={handleHeart}
          className="flex flex-col items-center gap-1.5 transition-all active:scale-90"
        >
          <div style={{ width: sz, height: sz, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', ...glassInactive }}>
            <svg width={iconSz} height={iconSz} viewBox="0 0 24 24"
              fill={onList ? 'rgba(255,59,48,1)' : 'none'}
              stroke={onList ? 'rgba(255,59,48,1)' : 'rgba(255,255,255,0.3)'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span style={{ ...labelStyle, color: onList ? 'rgba(255,59,48,0.8)' : 'rgba(255,255,255,0.25)' }}>
            Vil se
          </span>
        </button>

        {/* 🍿 I gang — grå når inaktiv, grøn når aktiv */}
        <button
          onClick={() => status === 'watching' ? changeStatus('want') : changeStatus('watching')}
          disabled={!onList}
          className="flex flex-col items-center gap-1.5 transition-all active:scale-90 disabled:cursor-default"
          style={{ opacity: onList ? 1 : 0.3 }}
        >
          <div style={{ width: sz, height: sz, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(status === 'watching' ? glassActive : glassInactive) }}>
            <span style={{ fontSize: iconSz, filter: status === 'watching' ? 'none' : 'grayscale(1) opacity(0.6)' }}>🍿</span>
          </div>
          <span style={{ ...labelStyle, color: status === 'watching' ? 'rgba(52,199,89,0.9)' : 'rgba(255,255,255,0.55)' }}>
            I gang
          </span>
        </button>

        {/* ✓ Set */}
        <button
          onClick={() => changeStatus('done')}
          disabled={!onList}
          className="flex flex-col items-center gap-1.5 transition-all active:scale-90 disabled:cursor-default"
          style={{ opacity: onList ? 1 : 0.3 }}
        >
          <div style={{ width: sz, height: sz, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(status === 'done' ? glassActive : glassInactive) }}>
            <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none"
              stroke={status === 'done' ? 'rgba(52,199,89,0.9)' : 'rgba(255,255,255,0.35)'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span style={{ ...labelStyle, color: status === 'done' ? 'rgba(52,199,89,0.9)' : 'rgba(255,255,255,0.55)' }}>
            Set
          </span>
        </button>

      </div>

      <AnimatePresence>
        {showAlsoAdd && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <span className="text-white/50 text-xs flex-1">
              Også til <span className="text-white">din liste</span>?
            </span>
            <button
              onClick={addToPersonalList}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)', color: 'rgb(52,199,89)' }}
            >
              Tilføj
            </button>
            <button
              onClick={() => setShowAlsoAdd(false)}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
            >
              Nej
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      </div>

      <AnimatePresence>
        {showRating && title && (
          <RatingSheet
            tmdbId={tmdbId}
            mediaType={mediaType}
            title={title}
            poster={poster ?? null}
            onClose={() => setShowRating(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
