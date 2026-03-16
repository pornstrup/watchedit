'use client'

import { useState } from 'react'

type Result = {
  tmdb_id: number
  media_type: string
  title: string
  year?: string
  poster: string | null
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  const search = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data.results || [])
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => search(e.target.value)}
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
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 cursor-pointer hover:bg-white/10 transition-all"
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
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-white/40 text-xs">
                  {item.media_type === 'tv' ? 'Serie' : 'Film'} {item.year && `· ${item.year}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
