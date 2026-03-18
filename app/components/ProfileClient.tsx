'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

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
      <div className="flex flex-col items-center text-center pt-4 gap-4">
        <div className="relative">
          {avatar ? (
            <img src={avatar} alt={name} className="w-24 h-24 rounded-full ring-2 ring-white/10" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/10">
              <span className="text-white text-3xl font-bold">{name?.[0]}</span>
            </div>
          )}
          {/* Online dot */}
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
      <div key={i} className="flex-1 bg-white/5 border border-white/8 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
        <p className="text-white text-2xl font-bold">{s.value}</p>
        <p className="text-white/40 text-xs">{s.label}</p>
      </div>
    ))}
  </motion.div>
) : null}

{/* DENNE MÅNED + I GANG */}
{stats && (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.05 }}
    className="flex gap-3"
  >
    <div className="flex-1 bg-white-40 border border-emerald-400/20 rounded-2xl px-4 py-3">
      <p className="text-white-40 text-2xl font-bold">{stats.watching}</p>
      <p className="text-white-40 text-xs mt-0.5">I gang</p>
    </div>
    <div className="flex-1 bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
      <p className="text-white text-2xl font-bold">{stats.thisMonth}</p>
      <p className="text-white/40 text-xs mt-0.5">Denne måned</p>
    </div>
    <div className="flex-1 bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
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
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  i === 0
                    ? 'bg-white text-black'
                    : i === 1
                    ? 'bg-white/20 text-white'
                    : 'bg-white/8 text-white/50'
                }`}
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

      {/* LOG UD */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/8 text-white/40 text-sm font-medium hover:bg-white/10 hover:text-white/60 transition-all"
        >
          Log ud
        </button>
      </motion.div>

    </div>
  )
}