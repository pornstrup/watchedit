'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'

const glassBtn = {
  background: 'rgba(0,0,0,0.35)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.18)',
}

export default function StickyHeader({
  title,
  poster,
  year,
  rating,
  tmdbId,
  mediaType,
  isOnList,
  ctx,
}: {
  title: string
  poster?: string | null
  year?: string
  rating?: number
  tmdbId?: number
  mediaType?: string
  isOnList?: boolean
  ctx?: string
}) {
  const dragControls = useDragControls()
  const [visible, setVisible] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const addToList = async () => {
    if (!tmdbId || !mediaType) return
    const url = ctx ? `/api/groups/${ctx}/watchlist` : '/api/watchlist'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType }),
    })
    if (res.ok) {
      setAdded(true)
      window.dispatchEvent(new CustomEvent('watchlist-updated'))
    }
  }

  const onList = isOnList || added

  return (
    <>
      {/* Sticky header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 gap-3 transition-all duration-300"
        style={{
          height: '56px',
          paddingTop: 'env(safe-area-inset-top)',
          background: visible ? 'rgba(0,0,0,0.7)' : 'transparent',
          backdropFilter: visible ? 'blur(40px) saturate(180%)' : 'none',
          WebkitBackdropFilter: visible ? 'blur(40px) saturate(180%)' : 'none',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transform: visible ? 'translateY(0)' : 'translateY(-6px)',
        }}
      >
        {/* Tilbage */}
        <button
          onClick={() => window.history.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          style={glassBtn}
        >
          <ChevronLeft size={17} strokeWidth={2.5} color="white" />
        </button>

        {/* Titel — diskret, centreret */}
        <p className="flex-1 text-white/80 font-medium text-sm truncate text-center">{title}</p>

        {/* Tre prikker */}
        {tmdbId && (
          <button
            onClick={() => setSheetOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            style={glassBtn}
          >
            <span style={{ color: 'white', fontSize: 16, letterSpacing: 1, lineHeight: 1 }}>···</span>
          </button>
        )}
      </div>

      {/* Sheet fra bunden */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60"
              style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
              onClick={() => setSheetOpen(false)}
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
              onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) setSheetOpen(false) }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
              style={{
                background: 'rgba(20,20,22,0.98)',
                backdropFilter: 'blur(60px) saturate(180%)',
                WebkitBackdropFilter: 'blur(60px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderBottom: 'none',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3" onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none', cursor: 'grab' }} />

              {/* Header: plakat + titel + meta */}
              <div className="flex items-center gap-4 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {poster && (
                  <Image src={poster} alt={title} width={52} height={78} className="rounded-xl object-cover flex-shrink-0 shadow-xl" />
                )}
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-white font-semibold text-base leading-snug">{title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {year && <span className="text-white/50 text-sm">{year}</span>}
                    {rating && rating > 0 && (
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="rgba(251,191,36,1)" />
                        </svg>
                        <span className="text-white/70 text-sm">{rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Handlinger */}
              <div className="flex flex-col py-2 px-2">
                {!onList ? (
                  <button
                    onClick={() => { addToList(); setSheetOpen(false) }}
                    className="flex items-center gap-3 px-4 py-4 rounded-xl text-left w-full active:bg-white/5 transition-colors"
                  >
                    <span className="text-white text-base">+</span>
                    <span className="text-white text-base">Tilføj til liste</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-4">
                    <span className="text-emerald-400 text-base">✓</span>
                    <span className="text-white/50 text-base">På din liste</span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
