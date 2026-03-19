'use client'

import { useState, useCallback } from 'react'
import Search from './Search'
import Watchlist from './Watchlist'

export default function WatchlistProvider({ userName }: { userName: string }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const firstName = userName?.split(' ')[0] || 'der'

  return (
    <div className="w-full max-w-md flex flex-col gap-12">
      <div className="flex flex-col gap-6">
        <h1 className="text-white text-3xl font-bold tracking-tight">
  Min liste
</h1>
        <Search onAdd={refresh} />
      </div>
      <Watchlist key={refreshKey} />
    </div>
  )
}