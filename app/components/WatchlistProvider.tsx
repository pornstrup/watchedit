'use client'

import { useState, useCallback } from 'react'
import Search from './Search'
import Watchlist from './Watchlist'

export default function WatchlistProvider({ userName }: { userName: string }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <Search onAdd={refresh} />
      <Watchlist key={refreshKey} />
    </div>
  )
}