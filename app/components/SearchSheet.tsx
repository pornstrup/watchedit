'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

type Result = {
  tmdb_id: number
  media_type: string
  title: string
  year?: string
  poster: string | null
}

type Group = {
  id: string
  name: string
}

type Provider = {
  id: number
  name: string
  logo: string
}

export default function SearchSheet({
  onClose,
  initialGroupId,
}: {
  onClose: () => void
  initialGroupId: string | null
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [trending, setTrending] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())
  const [groups, setGroups] = useState<Group[]>([])
  const [activeContext, setActiveContext] = useState<string | null>(initialGroupId)
  const [showContextPicker, setShowContextPicker] = useState(false)
  const [providers, setProviders] = useState<Record<string, Provider[]>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-fokus
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(timer)
  }, [])

  // Flyt sheet præcis over tastaturet (iOS visualViewport)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const adjust = () => {
      if (!sheetRef.current) return
      const keyboardHeight = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      sheetRef.current.style.bottom = `${keyboardHeight}px`
      sheetRef.current.style.maxHeight = `${vv.height * 0.94}px`
    }
    vv.addEventListener('resize', adjust)
    vv.addEventListener('scroll', adjust)
    return () => {
      vv.removeEventListener('resize', adjust)
      vv.removeEventListener('scroll', adjust)
    }
  }, [])

  // Hent trending ved mount
  useEffect(() => {
    fetch('/api/tmdb/trending')
      .then(r => r.json())
      .then(d => setTrending((d.results || []).slice(0, 10)))
  }, [])

  // Hent grupper + eksisterende ids
  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then(d => setGroups((d.groups || []).filter(Boolean)))

    const url = activeContext
      ? `/api/groups/${activeContext}/watchlist`
      : '/api/watchlist/list'
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const ids = new Set<string>(
          (d.items || []).map((i: any) => `${i.tmdb_id}-${i.media_type}`)
        )
        setExistingIds(ids)
      })
  }, [activeContext])

  // Hent providers staggered
  useEffect(() => {
    const toFetch = (results.length > 0 ? results : trending).slice(0, 6).filter(item => {
      const key = `${item.tmdb_id}-${item.media_type}`
      return providers[key] === undefined
    })
    toFetch.forEach((item, i) => {
      setTimeout(() => {
        const key = `${item.tmdb_id}-${item.media_type}`
        fetch(`/api/tmdb/item-providers?id=${item.tmdb_id}&type=${item.media_type}`)
          .then(r => r.json())
          .then(d => setProviders(prev => ({ ...prev, [key]: d.providers || [] })))
      }, i * 80)
    })
  }, [results, trending])

  const handleInput = (val: string) => {
    setQuery(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (val.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(val)}`)
      const data = await res.json()
      setResults(data.results || [])
      setLoading(false)
    }, 300)
  }

  const addToList = async (item: Result) => {
    const key = `${item.tmdb_id}-${item.media_type}`
    if (existingIds.has(key) || added.has(key)) return
    const url = activeContext ? `/api/groups/${activeContext}/watchlist` : '/api/watchlist'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type })
    })
    if (res.ok) {
      setAdded(prev => new Set([...prev, key]))
      if (navigator.vibrate) navigator.vibrate(8)
      window.dispatchEvent(new CustomEvent('watchlist-updated', { detail: { groupId: activeContext } }))
    }
  }

  const isAdded = (item: Result) => {
    const key = `${item.tmdb_id}-${item.media_type}`
    return existingIds.has(key) || added.has(key)
  }

  const activeContextName = activeContext
    ? groups.find(g => g.id === activeContext)?.name ?? '...'
    : 'Min liste'

  const displayItems = query.length >= 2 ? results : trending
  const showTrending = query.length < 2

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

      {/* Sheet — søgefelt i BUNDEN, resultater scroller opad */}
      <motion.div
        ref={sheetRef as any}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) onClose() }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
        style={{
          background: 'rgba(18, 18, 18, 0.98)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          borderBottom: 'none',
          maxHeight: '80vh',
          transition: 'bottom 0.15s ease-out, max-height 0.15s ease-out',
        }}
      >
        {/* RESULTATER — scroller opad over søgefeltet */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-2 flex flex-col gap-2 min-h-0" style={{ touchAction: 'pan-y' }}>

          {displayItems.length > 0 && (
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">
              {showTrending ? 'Populært lige nu' : 'Resultater'}
            </p>
          )}

          {!showTrending && results.length === 0 && !loading && (
            <p className="text-white/50 text-sm text-center py-6">Ingen resultater for &quot;{query}&quot;</p>
          )}

          {displayItems.map(item => {
            const itemAdded = isAdded(item)
            const key = `${item.tmdb_id}-${item.media_type}`
            const itemProviders = providers[key]
            const href = `/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`
            return (
              <div
                key={key}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl flex-shrink-0"
                style={{
                  background: itemAdded ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                  border: itemAdded ? '1px solid rgba(52, 199, 89, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <a href={href} className="flex items-center gap-3 flex-1 min-w-0 no-underline">
                  {item.poster ? (
                    <Image src={item.poster} alt={item.title} width={40} height={56} className="rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-14 rounded-lg bg-white/10 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                    <p className="text-white/60 text-xs mt-0.5">
                      {item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}
                    </p>
                    {itemProviders === undefined && (
                      <div className="flex gap-1 mt-1.5">
                        <div className="w-4 h-4 rounded-sm bg-white/10 animate-pulse" />
                        <div className="w-4 h-4 rounded-sm bg-white/10 animate-pulse" />
                      </div>
                    )}
                    {itemProviders && itemProviders.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {itemProviders.slice(0, 3).map(p => (
                          <div
                            key={p.id}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <Image src={p.logo} alt={p.name} width={14} height={14} className="rounded-sm object-cover flex-shrink-0" />
                            <span className="text-white/60 text-xs leading-none">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {itemProviders && itemProviders.length === 0 && (
                      <p className="text-white/35 text-xs mt-1.5">Ikke på DK streaming</p>
                    )}
                  </div>
                </a>
                <button
                  onClick={() => !itemAdded && addToList(item)}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: itemAdded ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255,255,255,0.08)',
                    border: itemAdded ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                    color: itemAdded ? 'rgb(52, 199, 89)' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  <span className="text-sm font-semibold">{itemAdded ? '✓' : '+'}</span>
                </button>
              </div>
            )
          })}
        </div>

        {/* BUND — kontekst + søgefelt sidder tæt på tastaturet */}
        <div className="flex-shrink-0 px-4 pb-6 pt-2 flex flex-col gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Kontekst-picker — kun hvis grupper */}
          {groups.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowContextPicker(p => !p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                <span>Tilføjer til: <span className="text-white">{activeContextName}</span></span>
                <span className="text-white/30">▾</span>
              </button>

              {showContextPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full left-0 mb-1 rounded-2xl overflow-hidden z-10"
                  style={{
                    background: 'rgba(28, 28, 30, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    minWidth: 180,
                  }}
                >
                  <button
                    onClick={() => { setActiveContext(null); setShowContextPicker(false) }}
                    className={`flex items-center gap-3 px-4 py-3 text-sm text-left w-full ${activeContext === null ? 'text-white' : 'text-white/50'}`}
                  >
                    {activeContext === null && <span className="text-emerald-400">✓</span>}
                    Min liste
                  </button>
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setActiveContext(g.id); setShowContextPicker(false) }}
                      className={`flex items-center gap-3 px-4 py-3 text-sm text-left border-t border-white/5 w-full ${activeContext === g.id ? 'text-white' : 'text-white/50'}`}
                    >
                      {activeContext === g.id && <span className="text-emerald-400">✓</span>}
                      {g.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {/* Søgefelt */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder="Søg efter film eller serie..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            )}
            {query.length > 0 && !loading && (
              <button onClick={() => { setQuery(''); setResults([]) }} className="text-white/40 text-sm">✕</button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
