'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { createPortal } from 'react-dom'

export default function RatingSheet({
  tmdbId,
  mediaType,
  title,
  poster,
  onClose,
}: {
  tmdbId: number
  mediaType: string
  title: string
  poster: string | null
  onClose: () => void
}) {
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (skip: boolean) => {
    setSaving(true)
    await fetch('/api/user-content/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdb_id: tmdbId,
        media_type: mediaType,
        rating: !skip && rating > 0 ? rating : null,
        note: !skip && note.trim() ? note.trim() : null,
      }),
    })
    if (!skip && rating > 0) {
      try { localStorage.removeItem('flimr:recommendations') } catch {}
      window.umami?.track('rate', { rating, media_type: mediaType })
    }
    onClose()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onClick={() => !saving && submit(true)}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
        style={{
          background: 'rgba(22, 22, 24, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-6 pt-4 pb-2">
          {/* Film/serie info */}
          <div className="flex items-center gap-3 mb-6">
            {poster && (
              <Image
                src={poster}
                alt={title}
                width={44}
                height={66}
                className="rounded-lg object-cover flex-shrink-0 shadow-lg"
              />
            )}
            <div>
              <p className="text-white/50 text-xs mb-0.5">Du har set</p>
              <p className="text-white font-semibold text-base leading-tight">{title}</p>
            </div>
          </div>

          {/* Stjerner */}
          <p className="text-white/50 text-xs mb-3">
            Hvad syntes du? <span className="text-white/30">(valgfrit)</span>
          </p>
          <div className="flex gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(r => r === star ? 0 : star)}
                className="transition-transform active:scale-90"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill={star <= rating ? 'rgba(251,191,36,1)' : 'none'}
                    stroke={star <= rating ? 'rgba(251,191,36,1)' : 'rgba(255,255,255,0.2)'}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>

          {/* Note */}
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Tilføj en note... (valgfrit)"
            rows={2}
            className="w-full text-sm text-white placeholder:text-white/30 bg-transparent resize-none outline-none mb-6"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}
          />

          {/* Knapper */}
          <div className="flex gap-3">
            <button
              onClick={() => !saving && submit(true)}
              disabled={saving}
              className="flex-1 py-3 rounded-full text-sm font-medium text-white/55 transition-opacity disabled:opacity-40"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Spring over
            </button>
            <button
              onClick={() => !saving && submit(false)}
              disabled={saving}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-black bg-white transition-opacity disabled:opacity-50"
            >
              {saving ? '...' : 'Gem'}
            </button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  )
}
