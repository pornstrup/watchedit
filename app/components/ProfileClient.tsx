'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SettingsSheet from './SettingsSheet'

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
}

type Stats = {
  total: number
  moviesTotal: number
  tvTotal: number
  done: number
  watching: number
  episodesWatched: number
  thisMonth: number
  topGenres: { name: string; count: number }[]
  memberSince: string
  recentItems: {
    tmdb_id: number
    media_type: string
    title: string
    poster: string | null
    status: string
  }[]
}

export default function ProfileClient({
  name,
  avatar,
  email,
}: {
  name: string
  avatar: string
  email: string
}) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    fetch('/api/profile/stats')
      .then(r => r.json())
      .then(d => {
        setStats(d.stats)
        setLoading(false)
      })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const memberSince = stats?.memberSince
    ? new Date(stats.memberSince).toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="flex flex-col gap-10">

      {/* HERO – profil */}
      <div className="flex flex-col items-center text-center pt-4 gap-4 relative">
        {/* Settings knap */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="absolute top-4 right-0 w-9 h-9 flex items-center justify-center rounded-full transition-all"
          style={glassStyle}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        <div className="relative">
          {avatar ? (
            <img src={avatar} alt={name} className="w-24 h-24 rounded-full ring-2 ring-white/10" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/10">
              <span className="text-white text-3xl font-bold">{name?.[0]}</span>
            </div>
          )}
          <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-black" />
        </div>
        <div>
          <h1 className="text-white text-2xl font-bold">{name}</h1>
          {memberSince && (
            <p className="text-white/30 text-sm mt-1">Medlem siden {memberSince}</p>
          )}
        </div>
      </div>

      {/* STORE TAL */}
      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 h-16 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex gap-3"
        >
          {[
            { value: stats.moviesTotal, label: 'Film' },
            { value: stats.tvTotal, label: 'Serier' },
            { value: stats.episodesWatched, label: 'Episoder' },
          ].map((s, i) => (
            <div key={i} className="flex-1 rounded-2xl px-4 py-3 flex flex-col gap-0.5" style={glassStyle}>
              <p className="text-white text-2xl font-bold">{s.value}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </div>
          ))}
        </motion.div>
      ) : null}

      {/* DENNE MÅNED + I GANG + FÆRDIGE */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex gap-3"
        >
          <div className="flex-1 rounded-2xl px-4 py-3" style={{
            ...glassStyle,
            border: '1px solid rgba(52, 211, 153, 0.2)',
          }}>
            <p className="text-white text-2xl font-bold">{stats.watching}</p>
            <p className="text-white/40 text-xs mt-0.5">I gang</p>
          </div>
          <div className="flex-1 rounded-2xl px-4 py-3" style={glassStyle}>
            <p className="text-white text-2xl font-bold">{stats.thisMonth}</p>
            <p className="text-white/40 text-xs mt-0.5">Denne måned</p>
          </div>
          <div className="flex-1 rounded-2xl px-4 py-3" style={glassStyle}>
            <p className="text-white text-2xl font-bold">{stats.done}</p>
            <p className="text-white/40 text-xs mt-0.5">Færdige</p>
          </div>
        </motion.div>
      )}

      {/* TOP GENRER */}
      {stats?.topGenres && stats.topGenres.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col gap-3"
        >
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Dine genrer</p>
          <div className="flex flex-wrap gap-2">
            {stats.topGenres.map((g, i) => (
              <span
                key={g.name}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  i === 0
                    ? 'bg-white text-black'
                    : i === 1
                    ? 'bg-white/20 text-white'
                    : 'text-white/50'
                }`}
                style={i >= 1 ? glassStyle : {}}
              >
                {g.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* SENEST TILFØJET */}
      {stats?.recentItems && stats.recentItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex flex-col gap-3"
        >
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Senest tilføjet</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            {stats.recentItems.map(item => (
              <a
                key={item.tmdb_id}
                href={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`}
                className="flex-shrink-0 no-underline"
              >
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="w-20 h-28 rounded-xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-28 rounded-xl bg-white/10" />
                )}
                <p className="text-white/60 text-xs mt-1.5 w-20 truncate">{item.title}</p>
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* SETTINGS SHEET */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={handleLogout}
      />

    </div>
  )
}