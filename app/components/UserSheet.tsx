'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, useDragControls } from 'framer-motion'
import Image from 'next/image'

type Tab = 'want' | 'watching' | 'done'

type Profile = {
  id: string
  name: string
  username: string | null
  avatar: string | null
  is_following: boolean
}

type ListItem = {
  tmdb_id: number
  media_type: string
  title: string
  poster: string | null
  rating: number | null
}

export default function UserSheet({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const dragControls = useDragControls()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('want')
  const [tabItems, setTabItems] = useState<Partial<Record<Tab, ListItem[]>>>({})
  const [loadingTab, setLoadingTab] = useState<Tab | null>('want')
  const [following, setFollowing] = useState(false)

  const fetchTab = useCallback(async (tab: Tab) => {
    if (tabItems[tab]) return
    setLoadingTab(tab)
    const res = await fetch(`/api/users/${userId}/list?status=${tab}`)
    const data = await res.json()
    if (data.profile) {
      setProfile(data.profile)
      setFollowing(data.profile.is_following)
    }
    setTabItems(prev => ({ ...prev, [tab]: data.items ?? [] }))
    setLoadingTab(null)
  }, [tabItems, userId])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchTab('want')
    })
  }, [fetchTab])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    fetchTab(tab)
  }

  const handleFollow = async () => {
    const newFollowing = !following
    setFollowing(newFollowing)
    const res = await fetch('/api/follows', {
      method: newFollowing ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    if (!res.ok) return
    window.dispatchEvent(new Event('follows-updated'))
  }

  const currentItems = tabItems[activeTab]
  const isLoading = loadingTab === activeTab || !currentItems

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[55]"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
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
        className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col rounded-t-3xl"
        style={{
          background: 'rgba(16, 16, 18, 0.97)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          borderBottom: 'none',
          maxHeight: '88vh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4 flex-shrink-0" onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none', cursor: 'grab' }} />

        {/* HEADER */}
        <div className="flex items-center gap-3 px-6 mb-5 flex-shrink-0">
          {profile ? (
            <>
              <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                {profile.avatar ? (
                  <Image src={profile.avatar} alt={profile.name} width={48} height={48} className="object-cover" />
                ) : (
                  <span className="text-white text-lg font-bold flex items-center justify-center h-full">{profile.name[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base leading-tight">{profile.name}</p>
                {profile.username && <p className="text-white/40 text-sm">@{profile.username}</p>}
              </div>
              <button
                onClick={handleFollow}
                className="px-4 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all"
                style={following ? {
                  background: 'rgba(52,199,89,0.15)',
                  border: '1px solid rgba(52,199,89,0.35)',
                  color: 'rgb(52,199,89)',
                } : {
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                }}
              >
                {following ? 'Følger' : 'Følg'}
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white/8 animate-pulse flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-3.5 w-28 rounded bg-white/8 animate-pulse" />
                <div className="h-3 w-20 rounded bg-white/8 animate-pulse" />
              </div>
            </>
          )}
        </div>

        {/* TABS */}
        <div className="flex gap-1.5 px-6 mb-4 flex-shrink-0">
          {(['want', 'watching', 'done'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={activeTab === tab ? {
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
              } : {
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.4)',
                border: '1px solid transparent',
              }}
            >
              {tab === 'want' ? 'Vil se' : tab === 'watching' ? 'I gang' : 'Set'}
            </button>
          ))}
        </div>

        {/* POSTER GRID */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6" style={{ touchAction: 'pan-y' }}>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2 pb-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white/8 animate-pulse" style={{ aspectRatio: '2/3' }} />
              ))}
            </div>
          ) : currentItems.length === 0 ? (
            <p className="text-white/30 text-sm text-center pt-12">Ingen indhold her endnu</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 pb-6">
              {currentItems.map(item => (
                <a
                  key={`${item.tmdb_id}-${item.media_type}`}
                  href={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`}
                  className="relative block rounded-xl overflow-hidden no-underline bg-white/8"
                  style={{ aspectRatio: '2/3' }}
                >
                  {item.poster && (
                    <Image
                      src={item.poster}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 220px"
                    />
                  )}
                  {activeTab === 'done' && item.rating && (
                    <div
                      className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
                    >
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="rgba(251,191,36,1)" />
                      </svg>
                      <span className="text-white text-xs font-semibold">{item.rating}</span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
