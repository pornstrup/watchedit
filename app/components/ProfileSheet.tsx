'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import Image from 'next/image'

type Profile = {
  name: string
  avatar: string | null
  email: string
  username: string | null
  searchable: boolean
  streaming_services: number[]
}

type StreamingProvider = {
  id: number
  name: string
  logo: string
}

export default function ProfileSheet({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameState, setUsernameState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [usernameError, setUsernameError] = useState('')
  const [allProviders, setAllProviders] = useState<StreamingProvider[]>([])
  const [providerQuery, setProviderQuery] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragControls = useDragControls()

  useEffect(() => {
    Promise.all([
      fetch('/api/profile/me').then(r => r.json()),
      fetch('/api/streaming-providers').then(r => r.json()),
    ]).then(([profileData, providersData]) => {
      setProfile(profileData)
      setUsernameInput(profileData.username || '')
      setAllProviders(providersData.providers || [])
    })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const saveUsername = async (value: string) => {
    const trimmed = value.trim()
    if (trimmed === (profile?.username ?? '')) return
    if (trimmed && !/^[a-zA-Z0-9_]{2,20}$/.test(trimmed)) {
      setUsernameError('2-20 tegn, kun bogstaver, tal og _')
      setUsernameState('error')
      return
    }
    setUsernameState('saving')
    setUsernameError('')
    const res = await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed || null }),
    })
    if (res.ok) {
      setProfile(prev => prev ? { ...prev, username: trimmed || null } : prev)
      setUsernameState('saved')
      setTimeout(() => setUsernameState('idle'), 2000)
    } else {
      const data = await res.json()
      setUsernameError(data.error || 'Noget gik galt')
      setUsernameState('error')
    }
  }

  const toggleSearchable = async (val: boolean) => {
    setProfile(prev => prev ? { ...prev, searchable: val } : prev)
    await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchable: val }),
    })
  }

  const toggleProvider = async (id: number) => {
    if (!profile) return
    const current = profile.streaming_services || []
    const updated = current.includes(id)
      ? current.filter(p => p !== id)
      : [...current, id]
    setProfile(prev => prev ? { ...prev, streaming_services: updated } : prev)
    setProviderQuery('')
    await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streaming_services: updated }),
    })
  }

  const filteredProviders = providerQuery.length >= 1
    ? allProviders.filter(p =>
        p.name.toLowerCase().includes(providerQuery.toLowerCase()) &&
        !(profile?.streaming_services || []).includes(p.id)
      ).slice(0, 5)
    : []

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
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) onClose() }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl px-6 pt-5"
        style={{
          background: 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          borderBottom: 'none',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none', cursor: 'grab' }} />

        {/* PROFIL */}
        {profile && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <label className="relative cursor-pointer flex-shrink-0">
                {profile.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt={profile.name}
                    width={56}
                    height={56}
                    className="rounded-full object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/10">
                    <span className="text-white text-xl font-bold">{profile.name?.[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                  <span className="text-white text-xs">Skift</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const form = new FormData()
                    form.append('avatar', file)
                    const res = await fetch('/api/profile/avatar', { method: 'POST', body: form })
                    const data = await res.json()
                    if (data.url) setProfile(prev => prev ? { ...prev, avatar: data.url } : prev)
                  }}
                />
              </label>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-white font-semibold text-base truncate">{profile.name}</p>
                <p className="text-white/40 text-sm truncate">{profile.email}</p>
              </div>
            </div>

            {/* USERNAME */}
            <div className="mb-4">
              <p className="text-white/50 text-xs font-medium mb-2 px-1">Brugernavn</p>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: usernameState === 'error'
                    ? '1px solid rgba(255,59,48,0.4)'
                    : usernameState === 'saved'
                    ? '1px solid rgba(52,199,89,0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <span className="text-white/30 text-sm">@</span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={e => {
                    setUsernameInput(e.target.value)
                    setUsernameState('idle')
                    setUsernameError('')
                  }}
                  onBlur={() => saveUsername(usernameInput)}
                  placeholder="vælg et brugernavn"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <AnimatePresence mode="wait">
                  {usernameState === 'saving' && (
                    <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0"
                    />
                  )}
                  {usernameState === 'saved' && (
                    <motion.span key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="text-emerald-400 text-sm flex-shrink-0"
                    >✓</motion.span>
                  )}
                </AnimatePresence>
              </div>
              {usernameState === 'error' && (
                <p className="text-red-400 text-xs mt-1.5 px-1">{usernameError}</p>
              )}
              <p className="text-white/25 text-xs mt-1.5 px-1">
                Andre kan finde dig ved at søge på dit brugernavn
              </p>
            </div>

            {/* SØGBAR TOGGLE */}
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-2xl mb-6"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div>
                <p className="text-white text-sm font-medium">Søgbar</p>
                <p className="text-white/40 text-xs mt-0.5">Andre kan finde dig via søgning</p>
              </div>
              <button
                onClick={() => toggleSearchable(!profile.searchable)}
                className="relative flex-shrink-0"
                style={{ width: 44, height: 26 }}
              >
                <div
                  className="absolute inset-0 rounded-full transition-colors duration-200"
                  style={{ background: profile.searchable ? 'rgb(52,199,89)' : 'rgba(255,255,255,0.15)' }}
                />
                <motion.div
                  animate={{ x: profile.searchable ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                />
              </button>
            </div>

            {/* STREAMING TJENESTER */}
            <div className="mb-4">
              <p className="text-white/50 text-xs font-medium mb-2 px-1">Mine tjenester</p>

              {/* Valgte tjenester */}
              {(profile.streaming_services || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(profile.streaming_services || []).map(id => {
                    const provider = allProviders.find(p => p.id === id)
                    if (!provider) return null
                    return (
                      <motion.button
                        key={id}
                        onClick={() => toggleProvider(id)}
                        whileTap={{ scale: 0.9 }}
                        className="relative flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.18)',
                        }}
                      >
                        <Image src={provider.logo} alt={provider.name} width={22} height={22} className="rounded-md" />
                        <span className="text-white/80 text-xs font-medium">{provider.name}</span>
                        <span className="text-white/40 text-xs ml-0.5">×</span>
                      </motion.button>
                    )
                  })}
                </div>
              )}

              {/* Søgefelt */}
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  value={providerQuery}
                  onChange={e => setProviderQuery(e.target.value)}
                  placeholder="Tilføj tjeneste..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                {providerQuery.length > 0 && (
                  <button onClick={() => setProviderQuery('')} className="text-white/30 text-sm">×</button>
                )}
              </div>

              {/* Søgeresultater */}
              <AnimatePresence>
                {filteredProviders.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="mt-1 rounded-2xl overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {filteredProviders.map((provider, i) => (
                      <button
                        key={provider.id}
                        onClick={() => toggleProvider(provider.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/10 transition-colors"
                        style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.06)' } : {}}
                      >
                        <Image src={provider.logo} alt={provider.name} width={28} height={28} className="rounded-lg flex-shrink-0" />
                        <span className="text-white/80 text-sm">{provider.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {(profile.streaming_services || []).length === 0 && providerQuery.length === 0 && (
                <p className="text-white/25 text-xs mt-1.5 px-1">
                  Bruges til at vise indhold fra dine tjenester i Opdag
                </p>
              )}
            </div>

            <div className="h-px bg-white/8 mb-4" />
          </>
        )}

        {/* LOG UD */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
          style={{
            background: 'rgba(255, 59, 48, 0.08)',
            border: '1px solid rgba(255, 59, 48, 0.15)',
          }}
        >
          <span className="text-red-400 text-sm font-medium">Log ud</span>
        </button>
      </motion.div>
    </>
  )
}
