'use client'

import { useEffect, useRef, useState } from 'react'

type Result = {
  tmdb_id: number
  media_type: string
  title: string
  year?: string
  poster: string | null
}

export default function Search({ onAdd }: { onAdd?: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<number[]>([])
  const [existingIds, setExistingIds] = useState<number[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/watchlist/list')
      .then(res => res.json())
      .then(data => {
        const ids = (data.items || []).map((i: any) => i.tmdb_id)
        setExistingIds(ids)
      })
  }, [])

  // Luk liste ved klik udenfor
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data.results || [])
    setLoading(false)
  }

  const addToList = async (item: Result) => {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
      })
    })

    if (res.ok) {
      setAdded(prev => [...prev, item.tmdb_id])
      setExistingIds(prev => [...prev, item.tmdb_id])
      onAdd?.()
      setTimeout(() => {
        setResults([])
      }, 325)
    }
  }

  return (
    <div className="w-full max-w-md" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => search(e.target.value)}
        onFocus={() => query.length >= 2 && search(query)}
        placeholder="Søg efter film eller serie..."
        className="w-full bg-white/10 text-white placeholder-white/40 rounded-2xl px-5 py-4 text-base outline-none border border-white/10 focus:border-white/30 transition-all"
      />
      {loading && (
        <p className="text-white/40 text-sm mt-3 text-center">Søger...</p>
      )}
      {results.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {results.map((item) => (
            <div
              key={item.tmdb_id}
              onClick={() => !added.includes(item.tmdb_id) && !existingIds.includes(item.tmdb_id) && addToList(item)}
              className={`flex items-center gap-3 border rounded-2xl p-3 cursor-pointer transition-all ${
                added.includes(item.tmdb_id) || existingIds.includes(item.tmdb_id)
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              {item.poster ? (
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-10 h-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-14 rounded-lg bg-white/10 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-white/40 text-xs">
                  {item.media_type === 'tv' ? 'Serie' : 'Film'} {item.year && `· ${item.year}`}
                </p>
              </div>
              <div className="text-lg">
                {added.includes(item.tmdb_id) || existingIds.includes(item.tmdb_id) ? '✓' : '+'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}