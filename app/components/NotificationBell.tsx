'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

type Notification = {
  id: string
  type: string
  tmdb_id: number
  media_type: string
  payload: {
    title: string
    season_number: number
    poster: string | null
    back_on_list: boolean
  }
  read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'I dag'
  if (days === 1) return 'I går'
  if (days < 7) return `${days} dage siden`
  if (days < 30) return `${Math.floor(days / 7)} uge${Math.floor(days / 7) > 1 ? 'r' : ''} siden`
  return `${Math.floor(days / 30)} måned${Math.floor(days / 30) > 1 ? 'er' : ''} siden`
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dragControls = useDragControls()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      document.body.style.overscrollBehavior = 'none'
    } else {
      document.body.style.overscrollBehavior = ''
    }
    return () => { document.body.style.overscrollBehavior = '' }
  }, [open])

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications || [])
        setUnreadCount(d.unread_count || 0)
      })
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
  }

  const sheet = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200]"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) setOpen(false) }}
            className="fixed bottom-0 left-0 right-0 z-[201] flex flex-col rounded-t-3xl"
            style={{
              background: 'rgba(28, 28, 30, 0.95)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderBottom: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              maxHeight: '80vh',
              paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
            }}
          >
            {/* Handle */}
            <div
              className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-4 mb-5 flex-shrink-0"
              onPointerDown={e => dragControls.start(e)}
              style={{ touchAction: 'none', cursor: 'grab' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-6 mb-4 flex-shrink-0">
              <h2 className="text-white text-xl font-bold">Nyheder</h2>
              {notifications.some(n => !n.read) && (
                <button onClick={markAllRead} className="text-white/50 text-sm">
                  Marker alle læst
                </button>
              )}
            </div>

            {/* Liste */}
            <div className="overflow-y-auto flex-1 px-4" style={{ overscrollBehavior: 'contain' }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <p className="text-white/30 text-3xl">🔔</p>
                  <p className="text-white/40 text-sm text-center">Ingen nyheder endnu.<br />Vi giver dig besked når dine serier får ny sæson.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pb-4">
                  {notifications.map(n => (
                    <Link
                      key={n.id}
                      href={`/tv/${n.tmdb_id}`}
                      onClick={() => { if (!n.read) markRead(n.id); setOpen(false) }}
                      className="flex items-center gap-3 p-3 rounded-2xl no-underline transition-colors"
                      style={{
                        background: n.read ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {n.payload.poster ? (
                        <Image src={n.payload.poster} alt={n.payload.title} width={40} height={60} className="rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-15 rounded-lg bg-white/10 flex-shrink-0" />
                      )}
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold leading-tight truncate">{n.payload.title}</p>
                        <p className="text-white/70 text-xs leading-snug">
                          Sæson {n.payload.season_number} er begyndt at udkomme
                          {n.payload.back_on_list && <span className="text-emerald-400"> · Tilføjet til din liste</span>}
                        </p>
                        <p className="text-white/35 text-xs mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#FF3B30' }} />}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {/* Klokke-knap */}
      <button
        onClick={() => { setOpen(true); if (unreadCount > 0) markAllRead() }}
        className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all duration-200"
        aria-label="Notifikationer"
        style={{
          background: open ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
          boxShadow: open ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        <div className="relative">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={open ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)'}
            strokeWidth={open ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: '#FF3B30' }} />
          )}
        </div>
        <span style={{ color: open ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>
          Nyheder
        </span>
      </button>

      {/* Sheet renderes direkte i body via portal for at undgå stacking context */}
      {mounted && createPortal(sheet, document.body)}
    </>
  )
}
