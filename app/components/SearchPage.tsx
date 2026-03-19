'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Result = {
  tmdb_id: number
  media_type: string
  title: string
  year?: string
  poster: string | null
  genre_ids: number[]
}

type Genre = { id: number; name: string }
type Provider = { id: number; name: string; logo: string }

const TYPES = [
  { value: null, label: 'Alle' },
  { value: 'movie', label: 'Film' },
  { value: 'tv', label: 'Serier' },
]

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [discoverResults, setDiscoverResults] = useState<Result[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(false)
  const [discoverLoading, setDiscoverLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null)
  const [existingIds, setExistingIds] = useState<number[]>([])
  const [added, setAdded] = useState<number[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-fokus søgefelt
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/tmdb/genres').then(r => r.json()),
      fetch('/api/tmdb/providers').then(r => r.json()),
      fetch('/api/watchlist/list').then(r => r.json()),
    ]).then(([g, p, w]) => {
      setGenres(g.genres || [])
      setProviders(p.providers || [])
      setExistingIds((w.items || []).map((i: any) => i.tmdb_id))
    })
  }, [])

  useEffect(() => {
    if (query.length >= 2) return
    setDiscoverLoading(true)
    const params = new URLSearchParams()
    if (selectedType) params.set('type', selectedType)
    if (selectedGenre) params.set('genre', String(selectedGenre))
    if (selectedProvider) params.set('provider', String(selectedProvider))

    fetch(`/api/tmdb/discover?${params}`)
      .then(r => r.json())
      .then(d => {
        setDiscoverResults(d.results || [])
        setDiscoverLoading(false)
      })
  }, [selectedType, selectedGenre, selectedProvider, query])

  const search = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const params = new URLSearchParams({ query: q })
      if (selectedType) params.set('type', selectedType)
      if (selectedGenre) params.set('genre', String(selectedGenre))
      const res = await fetch(`/api/tmdb/search?${params}`)
      const data = await res.json()
      setResults(data.results || [])
      setLoading(false)
    }, 300)
  }

  useEffect(() => {
    if (query.length >= 2) search(query)
  }, [selectedType, selectedGenre])

  const addToList = async (item: Result, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
     if (navigator.vibrate) navigator.vibrate(8)
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type })
    })
    if (res.ok) {
      setAdded(prev => [...prev, item.tmdb_id])
      setExistingIds(prev => [...prev, item.tmdb_id])
    }
  }

  const isAdded = (tmdb_id: number) => added.includes(tmdb_id) || existingIds.includes(tmdb_id)

  const showResults = query.length >= 2
  const displayItems = showResults ? results : discoverResults
  const isLoading = showResults ? loading : discoverLoading
  const clearFilters = selectedType || selectedGenre || selectedProvider

  return (
    <div className="w-full">
      <h1 className="text-white text-2xl font-bold mb-5">Søg</h1>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Film, serier..."
        className="w-full bg-white/10 text-white placeholder-white/40 rounded-2xl px-5 py-4 text-base outline-none border border-white/10 focus:border-white/30 transition-all mb-4"
      />

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2">
          {TYPES.map(t => (
            <button
              key={String(t.value)}
              onClick={() => setSelectedType(selectedType === t.value ? null : t.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedType === t.value ? 'bg-white text-black' : 'text-white/50 hover:text-white/70'
              }`}
              style={selectedType === t.value ? {} : glassStyle}
            >
              {t.label}
            </button>
          ))}
        </div>

        {providers.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {providers.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(selectedProvider === p.id ? null : p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  selectedProvider === p.id ? 'bg-white text-black' : 'text-white/50 hover:text-white/70'
                }`}
                style={selectedProvider === p.id ? {} : glassStyle}
              >
                <img src={p.logo} alt={p.name} className="w-4 h-4 rounded-sm" />
                {p.name}
              </button>
            ))}
          </div>
        )}

        {genres.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {genres.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGenre(selectedGenre === g.id ? null : g.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  selectedGenre === g.id ? 'bg-white text-black' : 'text-white/50 hover:text-white/70'
                }`}
                style={selectedGenre === g.id ? {} : glassStyle}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {clearFilters && (
          <button
            onClick={() => { setSelectedType(null); setSelectedGenre(null); setSelectedProvider(null) }}
            className="text-white/40 text-xs self-start hover:text-white/70 transition-colors"
          >
            Ryd filtre ×
          </button>
        )}
      </div>

      {!showResults && (
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">
          {selectedProvider || selectedGenre ? 'Resultater' : 'Populært i Danmark'}
        </p>
      )}

      <AnimatePresence mode="wait">
        {isLoading ? (
          <div key="skeleton" className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : displayItems.length > 0 ? (
          <motion.div
            key={`${showResults ? 'search' : 'discover'}-${selectedType}-${selectedGenre}-${selectedProvider}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            {displayItems.map((item, i) => (
              <motion.a
                key={item.tmdb_id}
                href={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-4 bg-white/5 border border-white/8 rounded-2xl p-3 no-underline"
              >
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="w-12 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 rounded-xl bg-white/10 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{item.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}
                  </p>
                </div>
                <button
                  onClick={(e) => !isAdded(item.tmdb_id) && addToList(item, e)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isAdded(item.tmdb_id)
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {isAdded(item.tmdb_id) ? '✓' : '+'}
                </button>
              </motion.a>
            ))}
          </motion.div>
        ) : showResults ? (
          <p className="text-white/30 text-sm text-center py-8">Ingen resultater for "{query}"</p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}