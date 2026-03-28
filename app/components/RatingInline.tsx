'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import UserSheet from './UserSheet'

type OtherRating = {
  user_id: string
  name: string
  username: string | null
  avatar: string | null
  rating: number
  note: string | null
}

function Stars({ rating, onRate, size = 20 }: { rating: number | null; onRate?: (r: number) => void; size?: number }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const active = hovered ?? rating ?? 0
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => onRate?.(i)}
          onMouseEnter={() => onRate && setHovered(i)}
          onMouseLeave={() => onRate && setHovered(null)}
          className={onRate ? 'transition-transform active:scale-90' : 'cursor-default'}
          disabled={!onRate}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill={i <= active ? 'rgba(251,191,36,1)' : 'rgba(255,255,255,0.15)'}
              stroke={i <= active ? 'rgba(251,191,36,0.6)' : 'none'}
              strokeWidth="1"
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function RatingInline({
  tmdbId,
  mediaType,
}: {
  tmdbId: number
  mediaType: string
}) {
  const [ownRating, setOwnRating] = useState<number | null>(null)
  const [ownNote, setOwnNote] = useState<string>('')
  const [others, setOthers] = useState<OtherRating[]>([])
  const [strangers, setStrangers] = useState<OtherRating[]>([])
  const [saving, setSaving] = useState(false)
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/ratings?tmdb_id=${tmdbId}&media_type=${mediaType}`)
      .then(r => r.json())
      .then(d => {
        setOwnRating(d.own_rating)
        setOwnNote(d.own_note ?? '')
        setOthers(d.others ?? [])
        setStrangers(d.strangers ?? [])
      })
  }, [tmdbId, mediaType])

  const save = (rating: number | null, note: string) => {
    setSaving(true)
    fetch('/api/user-content/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType, rating, note }),
    }).finally(() => setSaving(false))
  }

  const handleRate = (r: number) => {
    const newRating = r === ownRating ? null : r
    const newNote = newRating == null ? '' : ownNote
    setOwnRating(newRating)
    setOwnNote(newNote)
    save(newRating, newNote)
  }

  const handleNote = (text: string) => {
    setOwnNote(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(ownRating, text), 1000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Egne stjerner */}
      <div className="flex items-center gap-3">
        <Stars rating={ownRating} onRate={handleRate} size={24} />
        {saving ? (
          <div className="w-3 h-3 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
        ) : ownRating ? (
          <span className="text-white/25 text-xs">{ownRating}/5</span>
        ) : (
          <span className="text-white/20 text-xs">Tryk for at vurdere</span>
        )}
      </div>

      {/* Note */}
      {ownRating && (
        <textarea
          value={ownNote}
          onChange={e => handleNote(e.target.value)}
          placeholder="Skriv en kort anmeldelse…"
          rows={2}
          className="w-full rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/25 resize-none outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      )}

      {/* Andres ratings */}
      {(others.length > 0 || strangers.length > 0) && (
        <div className="flex flex-col gap-5">
          {others.length > 0 && (
            <div>
              <p className="text-white/40 text-xs font-medium mb-3">Venner der har set den</p>
              <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-6 px-6 pb-1">
                {others.map((o) => (
                  <RatingCard key={o.user_id} o={o} onClick={() => setOpenUserId(o.user_id)} />
                ))}
              </div>
            </div>
          )}
          {strangers.length > 0 && (
            <div>
              <p className="text-white/40 text-xs font-medium mb-3">Andre der har set den</p>
              <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-6 px-6 pb-1">
                {strangers.map((o) => (
                  <RatingCard key={o.user_id} o={o} onClick={() => setOpenUserId(o.user_id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {openUserId && (
          <UserSheet userId={openUserId} onClose={() => setOpenUserId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function RatingCard({ o, onClick }: { o: OtherRating; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col gap-1.5 p-3 rounded-2xl text-left active:scale-95 transition-transform"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 140,
        maxWidth: 180,
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
          {o.avatar ? (
            <Image src={o.avatar} alt={o.name} width={24} height={24} className="object-cover" />
          ) : (
            <span className="text-white text-xs font-semibold flex items-center justify-center h-full">{o.name[0]}</span>
          )}
        </div>
        <span className="text-white/70 text-xs font-medium truncate">{o.name.split(' ')[0]}</span>
      </div>
      <Stars rating={o.rating} size={13} />
      {o.note && (
        <p className="text-white/40 text-xs italic leading-snug line-clamp-2">&quot;{o.note}&quot;</p>
      )}
    </button>
  )
}
