'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

type EpisodeData = {
  done: boolean
  showName?: string
  season?: number
  episode?: number
  title?: string
  overview?: string
  still?: string | null
}

export default function NextEpisodeSheet({
  itemId,
  tmdbId,
  ctx,
  onClose,
  onMarked,
}: {
  itemId: string
  tmdbId: number
  ctx?: string
  onClose: () => void
  onMarked?: () => void
}) {
  const [data, setData] = useState<EpisodeData | null>(null)
  const [marking, setMarking] = useState(false)
  const [marked, setMarked] = useState(false)

  useEffect(() => {
    const url = `/api/watchlist/next-episode?itemId=${itemId}&tmdbId=${tmdbId}${ctx ? `&ctx=${ctx}` : ''}`
    fetch(url).then(r => r.json()).then(setData)
  }, [itemId, tmdbId, ctx])

  const markAsWatched = async () => {
    if (!data?.season || !data?.episode) return
    setMarking(true)

    if (ctx) {
      await fetch(`/api/groups/${ctx}/episode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_watchlist_item_id: itemId, season_number: data.season, episode_number: data.episode }),
      })
    } else {
      await fetch('/api/watchlist/episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist_item_id: itemId, season_number: data.season, episode_number: data.episode }),
      })
    }

    setMarking(false)
    setMarked(true)
    onMarked?.()
    setTimeout(onClose, 900)
  }

  const detailHref = ctx ? `/tv/${tmdbId}?ctx=${ctx}` : `/tv/${tmdbId}`

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/60"
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
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{
          background: 'rgba(18, 18, 20, 0.98)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3" />

        {/* Thumbnail */}
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {!data ? (
            <div className="w-full h-full bg-white/5 animate-pulse" />
          ) : data.still ? (
            <div className="relative w-full h-full">
              <Image src={data.still} alt={data.title || ''} fill className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(18,18,20,0.7)] via-transparent to-transparent" />
            </div>
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <span className="text-white/20 text-sm">Intet billede</span>
            </div>
          )}
        </div>

        <div className="px-6 pt-5 pb-10">
          {!data ? (
            <div className="flex flex-col gap-2.5">
              <div className="h-3 w-20 bg-white/10 rounded-full animate-pulse" />
              <div className="h-5 w-56 bg-white/15 rounded-full animate-pulse" />
              <div className="h-3 w-full bg-white/5 rounded-full animate-pulse mt-1" />
              <div className="h-3 w-3/4 bg-white/5 rounded-full animate-pulse" />
              <div className="h-14 w-full bg-white/10 rounded-2xl animate-pulse mt-3" />
            </div>
          ) : data.done ? (
            <div className="flex flex-col items-center py-4 gap-2">
              <p className="text-white text-lg font-semibold">Alt set ✓</p>
              <p className="text-white/50 text-sm">Du er helt opdateret</p>
            </div>
          ) : (
            <>
              <p className="text-white/45 text-xs mb-1">{data.showName}</p>
              <p className="text-white font-semibold text-base leading-snug mb-1">
                S{data.season} · E{data.episode}{data.title ? ` · ${data.title}` : ''}
              </p>
              {data.overview && (
                <p className="text-white/45 text-sm leading-relaxed mb-5 line-clamp-2">{data.overview}</p>
              )}

              <AnimatePresence mode="wait">
                {!marked ? (
                  <motion.button
                    key="mark"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={markAsWatched}
                    disabled={marking}
                    className="w-full py-4 rounded-2xl text-black text-base font-semibold transition-opacity"
                    style={{ background: marking ? 'rgba(255,255,255,0.7)' : 'white' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {marking ? '...' : 'Marker som set'}
                  </motion.button>
                ) : (
                  <motion.div
                    key="marked"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                    style={{
                      background: 'rgba(52, 199, 89, 0.12)',
                      border: '1px solid rgba(52, 199, 89, 0.25)',
                    }}
                  >
                    <span className="text-emerald-400 text-base font-semibold">Markeret som set ✓</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <a
                href={detailHref}
                className="block text-center text-white/35 text-sm mt-4 no-underline"
              >
                Se alle episoder →
              </a>
            </>
          )}
        </div>
      </motion.div>
    </>
  )
}
