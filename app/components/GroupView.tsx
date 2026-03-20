'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Group = {
  id: string
  name: string
  created_by: string
  created_at: string
}

type Member = {
  id: string
  name: string
  avatar_url: string | null
  role: string
}

type WatchlistItem = {
  id: string
  tmdb_id: number
  media_type: string
  status: string
  title: string
  poster: string | null
  year?: string
  added_by?: string
  progress?: {
    total_episodes: number
    watched_episodes: number
  }
}

function Avatar({ url, name, size = 6 }: { url: string | null; name: string; size?: number }) {
  const px = size * 4
  return url ? (
    <img
      src={url}
      alt={name}
      className="rounded-full ring-2 ring-black object-cover"
      style={{ width: px, height: px }}
    />
  ) : (
    <div
      className="rounded-full ring-2 ring-black bg-white/20 flex items-center justify-center"
      style={{ width: px, height: px }}
    >
      <span className="text-white text-xs font-bold">{name?.[0]}</span>
    </div>
  )
}

function GroupSettingsSheet({
  group,
  onClose,
  onLeave,
  onRename,
}: {
  group: Group
  onClose: () => void
  onLeave: () => void
  onRename: (name: string) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(group.name)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/groups/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: group.id }),
    })
      .then(r => r.json())
      .then(d => setInviteUrl(d.url))
  }, [group.id])

  const copyInvite = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveRename = async () => {
    if (!newName.trim() || newName === group.name) return setRenaming(false)
    await fetch(`/api/groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    onRename(newName.trim())
    setRenaming(false)
  }

  const leave = async () => {
    await fetch(`/api/groups/${group.id}/leave`, { method: 'DELETE' })
    onLeave()
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
          background: 'rgba(28, 28, 30, 0.85)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          borderBottom: 'none',
        }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />

        <div className="flex flex-col gap-3">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-1">{group.name}</p>

          {renaming ? (
            <div className="flex gap-2">
                
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveRename()}
                className="flex-1 bg-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none border border-white/20"
              />
              <button
                onClick={saveRename}
                className="px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold"
              >
                Gem
              </button>
            </div>
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white text-sm font-medium text-left"
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span className="text-lg">✏️</span> Omdøb gruppe
            </button>
          )}

          <button
            onClick={copyInvite}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-left transition-all duration-200"
            style={{
              background: copied ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 255, 255, 0.07)',
              border: copied ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: copied ? 'rgb(52, 199, 89)' : 'white',
            }}
          >
            <span className="text-lg">{copied ? '✓' : '🔗'}</span>
            {copied ? 'Kopieret!' : 'Kopier invite-link'}
          </button>

          <div className="h-px bg-white/10 my-1" />

          <button
            onClick={leave}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-400 text-sm font-medium text-left"
            style={{
              background: 'rgba(255, 59, 48, 0.08)',
              border: '1px solid rgba(255, 59, 48, 0.2)',
            }}
          >
            <span className="text-lg">🚪</span> Forlad gruppe
          </button>
        </div>
      </motion.div>
    </>
  )
}

export default function GroupView({
  groupId,
  group,
  onRefresh,
}: {
  groupId: string
  group: Group
  onRefresh: () => void
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [currentGroupName, setCurrentGroupName] = useState(group.name)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/groups/${groupId}/members`).then(r => r.json()),
      fetch(`/api/watchlist/list?group_id=${groupId}`).then(r => r.json()),
    ]).then(([membersData, itemsData]) => {
      setMembers(membersData.members || [])
      setItems(itemsData.items || [])
      setLoading(false)
    })
  }, [groupId])

  const watchingItems = items.filter(i => i.status === 'watching')
  const wantItems = items.filter(i => i.status === 'want')

  const handleLeave = () => {
    setShowSettings(false)
    onRefresh()
  }

  const handleRename = (name: string) => {
    setCurrentGroupName(name)
    onRefresh()
  }

  if (loading) return (
    <div className="flex flex-col gap-6">
      <div className="h-32 rounded-3xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-8"
      >
        {/* SETTINGS KNAP */}
        <div className="flex justify-end -mt-6 mb-2">
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
            </svg>
          </button>
        </div>

        {/* MEDLEMMER */}
        {members.length > 0 && (
          <div className="flex gap-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar url={m.avatar_url} name={m.name} size={7} />
                <span className="text-white/50 text-sm">{m.name?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        )}

        {/* HVAD SER I I AFTEN */}
        {wantItems.length > 0 && (
          <div className="relative rounded-3xl overflow-hidden" style={{ minHeight: 160 }}>
            {wantItems[0].poster && (
              <img
                src={wantItems[0].poster}
                alt={wantItems[0].title}
                className="absolute inset-0 w-full h-full object-cover opacity-40"
                style={{ filter: 'blur(12px)', transform: 'scale(1.1)' }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="relative p-6 flex flex-col gap-4">
              <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">Hvad ser I i aften?</p>
              <h2 className="text-white text-2xl font-bold leading-tight">{wantItems[0].title}</h2>
              <div className="flex gap-2">
                        <a
                  href={`/${wantItems[0].media_type === 'movie' ? 'movie' : 'tv'}/${wantItems[0].tmdb_id}?ctx=${groupId}`}
                  className="px-5 py-2.5 rounded-xl text-black text-sm font-semibold no-underline"
                  style={{ background: 'white' }}
                >
                  Se nu
                </a>
              </div>
            </div>
          </div>
        )}

        {/* INGEN ITEMS ENDNU */}
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-white text-lg font-semibold">Ingen titler endnu</p>
            <p className="text-white/30 text-sm">Søg efter film og serier og tilføj dem til {currentGroupName}</p>
          </div>
        )}

        {/* I GANG */}
        {watchingItems.length > 0 && (
          <section>
            <p className="text-emerald-400/80 text-xs uppercase tracking-widest font-semibold mb-4">
              I gang ({watchingItems.length})
            </p>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-6 px-6">
              {watchingItems.map(item => (
                <a
                  key={item.id}
                  href={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}?ctx=${groupId}`}
                  className="flex-shrink-0 w-36 no-underline"
                >
                  <div className="relative w-36 h-52 rounded-2xl overflow-hidden">
                    {item.poster ? (
                      <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                    </div>
                    <div className="absolute top-2 right-2 flex -space-x-1">
                      {members.slice(0, 2).map(m => (
                        <Avatar key={m.id} url={m.avatar_url} name={m.name} size={5} />
                      ))}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* VIL SE */}
        {wantItems.length > 0 && (
          <section>
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">
              Vil se ({wantItems.length})
            </p>
            <div className="grid grid-cols-2 gap-3">
              {wantItems.map(item => (
                <a
                  key={item.id}
                  href={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}?ctx=${groupId}`}
                  className="no-underline"
                >
                  <div className="relative rounded-2xl overflow-hidden aspect-[2/3]">
                    {item.poster ? (
                      <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </motion.div>

      <AnimatePresence>
        {showSettings && (
          <GroupSettingsSheet
            group={{ ...group, name: currentGroupName }}
            onClose={() => setShowSettings(false)}
            onLeave={handleLeave}
            onRename={handleRename}
          />
        )}
      </AnimatePresence>
    </>
  )
}