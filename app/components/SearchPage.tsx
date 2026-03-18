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

// Danske genre-navne
const GENRES: { id: number; name: string }[] = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Komedie' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Gyser' },
  { id: 10749, name: 'Romantik' },
  { id: 878, name: 'Sci-fi' },
  { id: 99, name: 'Dokumentar' },
  { id: 16, name: 'Animation' },
  { id: 53, name: 'Thriller' },
  { id: 10751, name: 'Familie' },
]

const PLATFORMS = [
  { id: 8, name: 'Netflix' },
  { id: 119, name: 'Prime' },
  { id: 337, name: 'Disney+' },
  { id: 384, name: 'HBO' },
  { id: 283, name: 'Crunchyroll' },
]

const TYPES = [
  { value: null, label: 'Alle' },
  { value: 'movie', label: 'Film' },
  { value: 'tv', label: 'Serier' },
]

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [trending, setTrending] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/tmdb/trending')
      .then(r => r.json())
      .then(d => {
        setTrending(d.results || [])
        setTrendingLoading(false)
      })
  }, [])

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

  // Re-søg når filtre ændres
  useEffect(() => {
    if (query.length >= 2) search(query)
  }, [selectedType, selectedGenre])

  // Filtrér trending på valgte filtre (client-side)
  const filteredTrending = trending
    .filter(i => !selectedType || i.media_type === selectedType)
    .filter(i => !selectedGenre || i.genre_ids.includes(selectedGenre))

  const showResults = query.length >= 2
  const displayItems = showResults ? results : filteredTrending

  return (
    <div className="w-full">
      {/* TITEL */}
      <h1 className="text-white text-2xl font-bold mb-5">Søg</h1>

      {/* SØGEFELT */}
      <input
        type="text"
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Film, serier..."
        className="w-full bg-white/10 text-white placeholder-white/40 rounded-2xl px-5 py-4 text-base outline-none border border-white/10 focus:border-white/30 transition-all mb-4"
      />

      {/* FILTRE */}
      <div className="flex flex-col gap-3 mb-6">

        {/* Type */}
        <div className="flex gap-2">
          {TYPES.map(t => (
            <button
              key={String(t.value)}
              onClick={() => setSelectedType(t.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedType === t.value
                  ? 'bg-white text-black'
                  : 'bg-white/8 text-white/50 hover:bg-white/15'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Genre */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {GENRES.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(selectedGenre === g.id ? null : g.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedGenre === g.id
                  ? 'bg-white text-black'
                  : 'bg-white/8 text-white/50 hover:bg-white/15'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Platform */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(selectedPlatform === p.id ? null : p.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedPlatform === p.id
                  ? 'bg-white text-black'
                  : 'bg-white/8 text-white/50 hover:bg-white/15'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* LABEL */}
      {!showResults && (
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">
          Populært i Danmark
        </p>
      )}

      {/* RESULTATER */}
      <AnimatePresence mode="wait">
        {loading ? (
          <p className="text-white/40 text-sm text-center py-8">Søger...</p>
        ) : trendingLoading && !showResults ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : displayItems.length > 0 ? (
          <motion.div
            key={showResults ? 'search' : 'trending'}
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
                  <p className="text-white font-semibold text-base truncate">{item.title}</p>
                  <p className="text-white/40 text-sm">
                    {item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}
                  </p>
                </div>
                <div className="text-white/20 text-xl flex-shrink-0">›</div>
              </motion.a>
            ))}
          </motion.div>
        ) : (
          <p className="text-white/40 text-sm text-center py-8">
            {showResults ? `Ingen resultater for "${query}"` : 'Ingen resultater'}
          </p>
        )}
      </AnimatePresence>
    </div>
  )
}