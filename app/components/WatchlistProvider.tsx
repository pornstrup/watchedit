'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Search from './Search'
import Watchlist from './Watchlist'
import GroupView from './GroupView'

type Group = {
  id: string
  name: string
  created_by: string
  created_at: string
}

type SheetStep = 'name' | 'invite'

function NewGroupSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (group: Group) => void }) {
  const [step, setStep] = useState<SheetStep>('name')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createGroup = async () => {
    if (!name.trim()) return
    setLoading(true)

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const data = await res.json()
    if (!data.group) return setLoading(false)

    const inviteRes = await fetch('/api/groups/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: data.group.id }),
    })
    const inviteData = await inviteRes.json()
    setInviteUrl(inviteData.url)
    setLoading(false)
    setStep('invite')
    onCreated(data.group)
  }

  const copyLink = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = async () => {
    if (!inviteUrl) return
    if (navigator.share) {
      await navigator.share({ title: `Tilmeld dig ${name} på WatchedIt`, url: inviteUrl })
    } else {
      copyLink()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl px-6 pt-5 pb-32"
        style={{
          background: 'rgba(28, 28, 30, 0.85)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          borderBottom: 'none',
        }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />

        <AnimatePresence mode="wait">

          {/* STEP 1 – NAVN */}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-8"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-white text-2xl font-bold">Hvad kalder I det?</h2>
                <p className="text-white/30 text-sm">Du kan altid ændre det senere</p>
              </div>

              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && createGroup()}
                placeholder="Sofakveld, Os to, Film club..."
                className="w-full bg-transparent text-white text-xl outline-none placeholder:text-white/20 border-b border-white/10 pb-3 focus:border-white/30 transition-colors"
              />

              <motion.button
                onClick={createGroup}
                disabled={!name.trim() || loading}
                animate={{ opacity: name.trim() ? 1 : 0.3 }}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl text-black font-semibold text-base"
                style={{ background: 'white' }}
              >
                {loading ? 'Opretter...' : 'Fortsæt →'}
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2 – INVITE */}
          {step === 'invite' && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-white text-2xl font-bold">Inviter til {name}</h2>
                <p className="text-white/30 text-sm">Del linket med dem du vil se sammen med</p>
              </div>

              <div
                className="flex flex-col gap-2 p-4 rounded-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Invite-link</p>
                <p className="text-white/70 text-sm break-all leading-relaxed font-mono">{inviteUrl}</p>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={shareLink}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl text-black font-semibold text-base"
                  style={{ background: 'white' }}
                >
                  Del link
                </motion.button>

                <motion.button
                  onClick={copyLink}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: copied ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 255, 255, 0.07)',
                    border: copied ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: copied ? 'rgb(52, 199, 89)' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {copied ? '✓ Kopieret' : 'Kopier link'}
                </motion.button>

                <button
                  onClick={onClose}
                  className="text-white/30 text-sm text-center pt-1"
                >
                  Luk
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </>
  )
}

export default function WatchlistProvider({ userName, userId }: { userName: string; userId: string }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [groups, setGroups] = useState<Group[]>([])
  const router = useRouter()
const searchParams = useSearchParams()
const [activeGroupId, setActiveGroupId] = useState<string | null>(
  searchParams.get('group')
)
  const [loadingGroups, setLoadingGroups] = useState(true)

const switchGroup = (id: string | null) => {
  setActiveGroupId(id)
  if (id) {
    router.replace(`/?group=${id}`, { scroll: false })
  } else {
    router.replace('/', { scroll: false })
  }
}
  const [showNewGroupSheet, setShowNewGroupSheet] = useState(false)

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then(d => {
        setGroups((d.groups || []).filter(Boolean))
        setLoadingGroups(false)
      })
  }, [refreshKey])
useEffect(() => {
    const handler = () => refresh()
    window.addEventListener('watchlist-updated', handler)
    return () => window.removeEventListener('watchlist-updated', handler)
  }, [refresh])
  const handleGroupCreated = (group: Group) => {
  setGroups(prev => [...prev, group])
  switchGroup(group.id)
}

  const activeGroup = groups.find(g => g.id === activeGroupId) ?? null
  const title = activeGroup ? activeGroup.name : 'Min liste'

  return (
    <div className="w-full max-w-md flex flex-col gap-8">

      <div className="flex flex-col gap-4">

        {/* TITEL + OPRET GRUPPE (når ingen grupper) */}
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-white text-3xl font-bold tracking-tight"
            >
              {title}
            </motion.h1>
          </AnimatePresence>

          {!loadingGroups && groups.length === 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              onClick={() => setShowNewGroupSheet(true)}
              className="text-white/30 text-sm font-medium hover:text-white/60 transition-colors outline-none focus:outline-none"
            >
              + Gruppe
            </motion.button>
          )}
        </div>

        {/* SEGMENTED CONTROL + OPRET GRUPPE (når grupper findes) */}
        {!loadingGroups && groups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-1 rounded-2xl overflow-x-auto scrollbar-none"
          >
            <div
              className="flex gap-1 p-1 rounded-2xl flex-1"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* MIN LISTE */}
              <button
                onClick={() => switchGroup(null)}
                className="relative flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 outline-none focus:outline-none"
                style={{ color: activeGroupId === null ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)' }}
              >
                {activeGroupId === null && (
                  <motion.div
                    layoutId="segment-active"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                    }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}
                <span className="relative z-10">Min liste</span>
              </button>

              {/* GRUPPER */}
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => switchGroup(group.id)}
                  className="relative flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 outline-none focus:outline-none"
                  style={{ color: activeGroupId === group.id ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)' }}
                >
                  {activeGroupId === group.id && (
                    <motion.div
                      layoutId="segment-active"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                      }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    />
                  )}
                  <span className="relative z-10">{group.name}</span>
                </button>
              ))}
            </div>

            {/* + OPRET NY GRUPPE */}
            <button
              onClick={() => setShowNewGroupSheet(true)}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 transition-colors outline-none focus:outline-none"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </motion.div>
        )}

        
      </div>

      {/* INDHOLD */}
      <AnimatePresence mode="wait">
        {activeGroupId === null ? (
          <motion.div
            key="personal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Watchlist key={refreshKey} onRemove={refresh} />
          </motion.div>
        ) : (
          <motion.div
            key={activeGroupId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeGroup && (
              <GroupView groupId={activeGroupId} group={activeGroup} currentUserId={userId} onRefresh={refresh} refreshKey={refreshKey} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW GROUP SHEET */}
      <AnimatePresence>
        {showNewGroupSheet && (
          <NewGroupSheet
            onClose={() => setShowNewGroupSheet(false)}
            onCreated={handleGroupCreated}
          />
        )}
      </AnimatePresence>

    </div>
  )
}