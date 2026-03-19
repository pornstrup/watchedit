'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RemoveFromList({ tmdbId, mediaType }: { tmdbId: number, mediaType: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const remove = async () => {
    setLoading(true)
    await fetch('/api/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType })
    })
    router.push('/')
  }

  return (
    <button
      onClick={remove}
      disabled={loading}
      className="w-full py-3 rounded-2xl bg-white/5 border border-white/8 text-white/40 text-sm font-medium hover:bg-red-500/10 hover:text-red-400/70 hover:border-red-500/20 transition-all"
    >
      {loading ? 'Fjerner...' : 'Fjern fra liste'}
    </button>
  )
}