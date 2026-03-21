'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Profile = {
  name: string
  avatar: string | null
  email: string
}

export default function ProfileSheet({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    fetch('/api/profile/me')
      .then(r => r.json())
      .then(d => setProfile(d))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/60"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl px-6 pt-5 pb-12"
        style={{
          background: 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          borderBottom: 'none',
        }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />

        {/* PROFIL */}
        {profile && (
          <div className="flex items-center gap-4 mb-8">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/10">
                <span className="text-white text-xl font-bold">{profile.name?.[0]}</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-white font-semibold text-base truncate">{profile.name}</p>
              <p className="text-white/40 text-sm truncate">{profile.email}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* NOTIFIKATIONER */}
          <div
            className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span className="text-white/30 text-sm">Notifikationer</span>
            <span className="text-white/20 text-xs">Kommer snart</span>
          </div>

          <div className="h-px bg-white/8 my-1" />

          {/* LOG UD */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all"
            style={{
              background: 'rgba(255, 59, 48, 0.08)',
              border: '1px solid rgba(255, 59, 48, 0.15)',
            }}
          >
            <span className="text-red-400 text-sm font-medium">Log ud</span>
          </button>
        </div>
      </motion.div>
    </>
  )
}