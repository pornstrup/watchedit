'use client'

import { useEffect } from 'react'
import {
  clearRecommendationsCache,
  clearSearchSheetSnapshot,
} from './searchSheetCache'
import {
  refreshDiscoveryData,
  refreshSocialDiscoveryData,
} from './discoveryCache'

export default function AppCacheBridge() {
  useEffect(() => {
    const handleWatchlistUpdated = () => {
      clearRecommendationsCache()
    }

    const handleFollowsUpdated = () => {
      void refreshSocialDiscoveryData()
    }

    const handleGroupsUpdated = () => {
      void refreshSocialDiscoveryData()
    }

    const handleProfileUpdated = () => {
      clearRecommendationsCache()
      void refreshDiscoveryData()
    }

    const handleLogout = () => {
      clearRecommendationsCache()
      clearSearchSheetSnapshot()
      void refreshDiscoveryData()
      void refreshSocialDiscoveryData()
    }

    window.addEventListener('watchlist-updated', handleWatchlistUpdated)
    window.addEventListener('follows-updated', handleFollowsUpdated)
    window.addEventListener('groups-updated', handleGroupsUpdated)
    window.addEventListener('profile-updated', handleProfileUpdated)
    window.addEventListener('app-logout', handleLogout)

    return () => {
      window.removeEventListener('watchlist-updated', handleWatchlistUpdated)
      window.removeEventListener('follows-updated', handleFollowsUpdated)
      window.removeEventListener('groups-updated', handleGroupsUpdated)
      window.removeEventListener('profile-updated', handleProfileUpdated)
      window.removeEventListener('app-logout', handleLogout)
    }
  }, [])

  return null
}
