'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import UserSheet from './UserSheet'
import {
  getDiscoveryBaseSections,
  getDiscoveryFeed,
  getDiscoveryBootstrap,
  getDiscoveryProviderSections,
  getDiscoveryGroups,
  getFollowingUsers,
  prefetchDiscoveryData,
  prefetchSocialDiscoveryData,
  refreshDiscoveryData,
  refreshSocialDiscoveryData,
  type OpdagSection,
} from './discoveryCache'
import {
  loadSearchSheetSnapshot,
  saveSearchSheetSnapshot,
  loadRecommendationsCache,
  saveRecommendationsCache,
  type SearchFilter,
} from './searchSheetCache'
import {
  createWatchlistTempId,
  dispatchWatchlistOptimisticAdd,
  dispatchWatchlistOptimisticConfirm,
  dispatchWatchlistOptimisticRemove,
  type WatchlistMutationItem,
} from './watchlistEvents'

type FeedItem = {
  user_id: string
  user_name: string
  user_username: string | null
  user_avatar: string | null
  tmdb_id: number
  media_type: string
  title: string
  poster: string | null
  rating: number | null
  note: string | null
  watched_at: string
}

type Result = {
  tmdb_id: number
  media_type: string
  title: string
  year?: string | null
  poster: string | null
  reason?: string
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

type UserResult = {
  id: string
  name: string
  username: string | null
  avatar: string | null
  is_following: boolean
}

function buildWatchlistMutationItem(item: Result, id: string): WatchlistMutationItem {
  return {
    id,
    tmdb_id: item.tmdb_id,
    media_type: item.media_type,
    status: 'want',
    title: item.title,
    poster: item.poster,
    year: item.year ?? null,
    added_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    progress: null,
  }
}

export default function SearchSheet({
  onClose,
  initialGroupId,
  initialQuery = '',
  initialAiMode = false,
}: {
  onClose: () => void
  initialGroupId: string | null
  initialQuery?: string
  initialAiMode?: boolean
}) {
  const restoredSnapshotRef = useRef(loadSearchSheetSnapshot())
  const restoredSnapshot = restoredSnapshotRef.current
  const resolvedInitialQuery = initialQuery || restoredSnapshot?.query || ''
  const resolvedInitialAiMode = initialQuery ? initialAiMode : (restoredSnapshot?.aiMode ?? initialAiMode)
  const resolvedInitialFilter = restoredSnapshot?.filter || 'all'
  const resolvedInitialContext = initialGroupId ?? null

  const [query, setQuery] = useState(resolvedInitialQuery)
  const [results, setResults] = useState<Result[]>([])
  const [baseSections, setBaseSections] = useState<OpdagSection[]>([])
  const [providerSections, setProviderSections] = useState<OpdagSection[]>([])
  const [baseLoading, setBaseLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())
  const [groups, setGroups] = useState<Group[]>([])
  const [activeContext, setActiveContext] = useState<string | null>(resolvedInitialContext)
  const [showContextPicker, setShowContextPicker] = useState(false)
  const [alsoAddPrompt, setAlsoAddPrompt] = useState<Result | null>(null)
  const [providers, setProviders] = useState<Record<string, Provider[]>>({})
  const [filter, setFilter] = useState<SearchFilter>(resolvedInitialFilter)
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [followingUsers, setFollowingUsers] = useState<UserResult[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [aiMode, setAiMode] = useState(resolvedInitialAiMode)
  const [aiThinking, setAiThinking] = useState(false)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<Result[]>([])
  const [recLoading, setRecLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragControls = useDragControls()
  const sheetRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRequestId = useRef(0)
  const providerRequestId = useRef(0)
  const activeSearchAbort = useRef<AbortController | null>(null)
  const providersRef = useRef<Record<string, Provider[]>>({})
  const existingIdsRequestId = useRef(0)
  const latestSnapshotRef = useRef({
    query: resolvedInitialQuery,
    aiMode: resolvedInitialAiMode,
    filter: resolvedInitialFilter,
    activeContext: resolvedInitialContext,
  })

  const refreshExistingIds = useCallback((context: string | null = activeContext) => {
    const requestId = ++existingIdsRequestId.current
    const url = context
      ? `/api/groups/${context}/watchlist`
      : '/api/watchlist/list'

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (requestId !== existingIdsRequestId.current) return
        const ids = new Set<string>(
          (d.items || []).map((i: { tmdb_id: number; media_type: string }) => `${i.tmdb_id}-${i.media_type}`)
        )
        setExistingIds(ids)
      })
      .catch(() => {
        if (requestId !== existingIdsRequestId.current) return
      })
  }, [activeContext])

  // Lås baggrunds-scroll mens sheet er åben
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Auto-fokus — kun hvis ingen initial query
  useEffect(() => {
    if (!resolvedInitialQuery) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [resolvedInitialQuery])

  // Kør initial søgning hvis der er en query fra URL
  useEffect(() => {
    if (resolvedInitialQuery && resolvedInitialQuery.length >= 2) {
      handleInput(resolvedInitialQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedInitialQuery])

  useEffect(() => {
    latestSnapshotRef.current = {
      query,
      aiMode,
      filter,
      activeContext,
    }
    const timer = setTimeout(() => {
      saveSearchSheetSnapshot(latestSnapshotRef.current)
    }, 180)
    return () => clearTimeout(timer)
  }, [query, aiMode, filter, activeContext])

  useEffect(() => {
    return () => {
      saveSearchSheetSnapshot(latestSnapshotRef.current)
    }
  }, [])

  useEffect(() => {
    refreshExistingIds(activeContext)

    return () => {
      existingIdsRequestId.current += 1
    }
  }, [activeContext, refreshExistingIds])

  useEffect(() => {
    const handleWatchlistUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ groupId?: string | null }>).detail
      if (detail && detail.groupId !== activeContext) return
      refreshExistingIds(activeContext)
    }

    window.addEventListener('watchlist-updated', handleWatchlistUpdated)
    return () => window.removeEventListener('watchlist-updated', handleWatchlistUpdated)
  }, [activeContext, refreshExistingIds])

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

  // Hent AI-anbefalinger — stale-while-revalidate med roterende slots
  useEffect(() => {
    let cancelled = false
    const cached = loadRecommendationsCache()
    const current: Result[] = cached || []

    if (current.length > 0) {
      setRecommendations(current)
    } else {
      setRecLoading(true)
    }

    // Fetch altid i baggrunden
    fetch('/api/ai-recommend')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        const fresh: Result[] = d.recommendations || []
        if (fresh.length === 0) return

        // Behold de første 3 stabile, udskift de sidste 3 med nye kandidater
        const stable = current.slice(0, 3)
        const stableIds = new Set(stable.map(r => `${r.tmdb_id}-${r.media_type}`))
        const newSlots = fresh
          .filter(r => !stableIds.has(`${r.tmdb_id}-${r.media_type}`))
          .slice(0, 3)
        const merged = stable.length >= 3
          ? [...stable, ...newSlots]
          : fresh.slice(0, 6)

        if (cancelled) return
        setRecommendations(merged)
        saveRecommendationsCache(merged)
      })
      .finally(() => { if (!cancelled) setRecLoading(false) })

    return () => {
      cancelled = true
    }
  }, [])

  // Hent opdag-sektioner + feed + grupper ved mount
  useEffect(() => {
    let cancelled = false

    const applyBootstrap = async () => {
      try {
        const data = await getDiscoveryBootstrap(resolvedInitialContext)
        if (cancelled) return
        setBaseSections(data.baseSections || [])
        setProviderSections(data.providerSections || [])
        setFeed(data.feed || [])
        setFollowingUsers(data.followingUsers || [])
        setFollowing(new Set((data.followingUsers || []).map((u: UserResult) => u.id)))
        setGroups((data.groups || []).filter(Boolean))
        setExistingIds(new Set((data.existingIds || []).filter(Boolean)))
        setBaseLoading(false)
        setFeedLoading(false)
        return
      } catch {
        // Falder tilbage til de eksisterende fetches, hvis bootstrap ikke virker
      }

      void prefetchDiscoveryData()
      void prefetchSocialDiscoveryData()

      getDiscoveryBaseSections()
        .then((base) => {
          if (cancelled) return
          setBaseSections(base)
        })
        .catch(() => {
          if (!cancelled) setBaseSections([])
        })
        .finally(() => {
          if (!cancelled) setBaseLoading(false)
        })

      getDiscoveryProviderSections()
        .then((providers) => {
          if (cancelled) return
          setProviderSections(providers.sections)
        })
        .catch(() => {
          if (!cancelled) setProviderSections([])
        })

      getDiscoveryFeed()
        .then((items) => {
          if (!cancelled) setFeed(items)
        })
        .finally(() => {
          if (!cancelled) setFeedLoading(false)
        })

      getFollowingUsers()
        .then((users) => {
          if (cancelled) return
          setFollowingUsers(users)
          setFollowing(new Set(users.map((u: UserResult) => u.id)))
        })

      getDiscoveryGroups()
        .then((items) => {
          if (!cancelled) setGroups((items || []).filter(Boolean))
        })

      const currentIdsUrl = resolvedInitialContext
        ? `/api/groups/${resolvedInitialContext}/watchlist`
        : '/api/watchlist/list'

      fetch(currentIdsUrl)
        .then(r => r.json())
        .then(d => {
          if (cancelled) return
          const ids = new Set<string>(
            (d.items || []).map((i: { tmdb_id: number; media_type: string }) => `${i.tmdb_id}-${i.media_type}`)
          )
          setExistingIds(ids)
        })
    }

    void applyBootstrap()

    const handleProfileUpdate = () => {
      void refreshDiscoveryData()
      getDiscoveryBaseSections()
        .then((base) => {
          if (cancelled) return
          setBaseSections(base)
        })
        .catch(() => {
          if (!cancelled) setBaseSections([])
        })
      getDiscoveryProviderSections(true)
        .then((providers) => {
          if (cancelled) return
          setProviderSections(providers.sections)
        })
        .catch(() => {
          if (!cancelled) setProviderSections([])
        })
    }

    const handleSocialUpdate = () => {
      void refreshSocialDiscoveryData()
      getDiscoveryFeed(true)
        .then((items) => {
          if (!cancelled) setFeed(items)
        })
      getFollowingUsers(true)
        .then((users) => {
          if (cancelled) return
          setFollowingUsers(users)
          setFollowing(new Set(users.map((u: UserResult) => u.id)))
        })
      getDiscoveryGroups(true)
        .then((items) => {
          if (!cancelled) setGroups((items || []).filter(Boolean))
        })
    }

    window.addEventListener('profile-updated', handleProfileUpdate)
    window.addEventListener('follows-updated', handleSocialUpdate)
    window.addEventListener('groups-updated', handleSocialUpdate)

    return () => {
      cancelled = true
      window.removeEventListener('profile-updated', handleProfileUpdate)
      window.removeEventListener('follows-updated', handleSocialUpdate)
      window.removeEventListener('groups-updated', handleSocialUpdate)
    }
  }, [resolvedInitialContext])

  // Hent providers staggered for søgeresultater
  useEffect(() => {
    providersRef.current = providers
  }, [providers])

  useEffect(() => {
    if (query.length < 2) return
    const runId = ++providerRequestId.current
    const timers: ReturnType<typeof setTimeout>[] = []
    const toFetch = results.slice(0, 4).filter(item => {
      const key = `${item.tmdb_id}-${item.media_type}`
      return providersRef.current[key] === undefined
    })
    toFetch.forEach((item, i) => {
      const timer = setTimeout(() => {
        if (runId !== providerRequestId.current) return
        const key = `${item.tmdb_id}-${item.media_type}`
        fetch(`/api/tmdb/item-providers?id=${item.tmdb_id}&type=${item.media_type}`)
          .then(r => r.json())
          .then(d => {
            if (runId !== providerRequestId.current) return
            setProviders(prev => ({ ...prev, [key]: d.providers || [] }))
          })
      }, i * 80)
      timers.push(timer)
    })
    return () => {
      timers.forEach(clearTimeout)
      if (runId === providerRequestId.current) {
        providerRequestId.current += 1
      }
    }
  }, [results, query])

  const updateUrl = (q: string, ai: boolean) => {
    const params = new URLSearchParams(window.location.search)
    if (q.length >= 2) {
      params.set('search', q)
      if (ai) params.set('aiMode', '1')
      else params.delete('aiMode')
    } else {
      params.delete('search')
      params.delete('aiMode')
    }
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `/?${qs}` : '/')
  }

  const handleInput = (val: string) => {
    setQuery(val)
    if (filter !== 'users') setFilter('all')
    updateUrl(val, aiMode)
    cancelActiveSearch()
    if (val.length < 2) {
      setResults([])
      setUserResults([])
      setLoading(false)
      setAiThinking(false)
      return
    }

    const runId = searchRequestId.current
    const controller = new AbortController()
    activeSearchAbort.current = controller

    if (filter === 'users') {
      searchTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(val)}`, {
            signal: controller.signal,
          })
          if (!res.ok || runId !== searchRequestId.current || controller.signal.aborted) return
          const data = await res.json()
          if (runId !== searchRequestId.current || controller.signal.aborted) return
          setUserResults(data.users || [])
        } catch (error) {
          if ((error as { name?: string })?.name !== 'AbortError') {
            setUserResults([])
          }
        }
      }, 300)
      return
    }
    if (aiMode) {
      setAiThinking(true)
      setResults([])
      searchTimer.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/ai-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: val }),
            signal: controller.signal,
          })
          if (!res.ok || runId !== searchRequestId.current || controller.signal.aborted) return
          const data = await res.json()
          if (runId !== searchRequestId.current || controller.signal.aborted) return
          setResults(data.results || [])
        } catch (error) {
          if ((error as { name?: string })?.name !== 'AbortError' && runId === searchRequestId.current) {
            setResults([])
          }
        } finally {
          if (runId === searchRequestId.current && !controller.signal.aborted) {
            setAiThinking(false)
          }
        }
      }, 600)
    } else {
      setLoading(true)
      searchTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(val)}`, {
            signal: controller.signal,
          })
          if (!res.ok || runId !== searchRequestId.current || controller.signal.aborted) return
          const data = await res.json()
          if (runId !== searchRequestId.current || controller.signal.aborted) return
          setResults(data.results || [])
          window.umami?.track('search', { query: val })
        } catch (error) {
          if ((error as { name?: string })?.name !== 'AbortError' && runId === searchRequestId.current) {
            setResults([])
          }
        } finally {
          if (runId === searchRequestId.current && !controller.signal.aborted) {
            setLoading(false)
          }
        }
      }, 300)
    }
  }

  const toggleFollow = async (u: UserResult) => {
    if (navigator.vibrate) navigator.vibrate(8)
    const newFollowing = new Set(following)
    const optimisticFollowing = !u.is_following && !following.has(u.id)
    if (optimisticFollowing) {
      newFollowing.add(u.id)
    } else {
      newFollowing.delete(u.id)
    }
    setFollowing(newFollowing)
    setUserResults(prev => prev.map(x => x.id === u.id ? { ...x, is_following: optimisticFollowing } : x))
    if (!optimisticFollowing) {
      setFollowingUsers(prev => prev.filter(x => x.id !== u.id))
      setFeed(prev => prev.filter(x => x.user_id !== u.id))
    } else {
      setFollowingUsers(prev => [...prev, { ...u, is_following: true }])
    }

    if (optimisticFollowing) {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: u.id }),
      })
      if (!res.ok) return
    } else {
      const res = await fetch('/api/follows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: u.id }),
      })
      if (!res.ok) return
    }

    window.dispatchEvent(new Event('follows-updated'))
  }

  const toggleAiMode = () => {
    cancelActiveSearch()
    const newAi = !aiMode
    setAiMode(newAi)
    setQuery('')
    setResults([])
    setAiThinking(false)
    setLoading(false)
    updateUrl('', newAi)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const removeFromList = async (item: Result) => {
    const key = `${item.tmdb_id}-${item.media_type}`
    setAlsoAddPrompt(null)
    const url = activeContext ? `/api/groups/${activeContext}/watchlist` : '/api/watchlist'
    const scope = activeContext ? 'group' : 'personal'
    const tempId = createWatchlistTempId(scope, activeContext, item.tmdb_id, item.media_type)
    dispatchWatchlistOptimisticRemove({
      scope,
      groupId: activeContext,
      tempId,
      item: buildWatchlistMutationItem(item, tempId),
    })
    await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type })
    })
    setAdded(prev => { const s = new Set(prev); s.delete(key); return s })
    setExistingIds(prev => { const s = new Set(prev); s.delete(key); return s })
    if (navigator.vibrate) navigator.vibrate(8)
    window.dispatchEvent(new CustomEvent('watchlist-updated', { detail: { groupId: activeContext } }))
  }

  const addToList = async (item: Result) => {
    const key = `${item.tmdb_id}-${item.media_type}`
    if (existingIds.has(key) || added.has(key)) return
    setAdded(prev => new Set([...prev, key]))
    if (navigator.vibrate) navigator.vibrate(8)
    if (activeContext) setAlsoAddPrompt(item)
    const url = activeContext ? `/api/groups/${activeContext}/watchlist` : '/api/watchlist'
    const scope = activeContext ? 'group' : 'personal'
    const tempId = createWatchlistTempId(scope, activeContext, item.tmdb_id, item.media_type)
    dispatchWatchlistOptimisticAdd({
      scope,
      groupId: activeContext,
      tempId,
      item: buildWatchlistMutationItem(item, tempId),
    })
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type })
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.data?.id) {
        dispatchWatchlistOptimisticConfirm({
          scope,
          groupId: activeContext,
          tempId,
          item: buildWatchlistMutationItem(item, data.data.id),
        })
      }
      window.dispatchEvent(new CustomEvent('watchlist-updated', { detail: { groupId: activeContext } }))
    } else {
      // Fortryd optimistisk opdatering ved fejl
      setAdded(prev => { const s = new Set(prev); s.delete(key); return s })
      setAlsoAddPrompt(null)
      dispatchWatchlistOptimisticRemove({
        scope,
        groupId: activeContext,
        tempId,
        item: buildWatchlistMutationItem(item, tempId),
      })
    }
  }

  const addToPersonalList = async (item: Result) => {
    setAlsoAddPrompt(null)
    const tempId = createWatchlistTempId('personal', null, item.tmdb_id, item.media_type)
    dispatchWatchlistOptimisticAdd({
      scope: 'personal',
      groupId: null,
      tempId,
      item: buildWatchlistMutationItem(item, tempId),
    })
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type })
    })
    if (navigator.vibrate) navigator.vibrate(8)
    if (res.ok) {
      const data = await res.json()
      if (data?.data?.id) {
        dispatchWatchlistOptimisticConfirm({
          scope: 'personal',
          groupId: null,
          tempId,
          item: buildWatchlistMutationItem(item, data.data.id),
        })
      }
    } else {
      dispatchWatchlistOptimisticRemove({
        scope: 'personal',
        groupId: null,
        tempId,
        item: buildWatchlistMutationItem(item, tempId),
      })
    }
    window.dispatchEvent(new CustomEvent('watchlist-updated', { detail: { groupId: null } }))
  }

  const isAdded = (item: Result) => {
    const key = `${item.tmdb_id}-${item.media_type}`
    return existingIds.has(key) || added.has(key)
  }

  const activeContextName = activeContext
    ? groups.find(g => g.id === activeContext)?.name ?? '...'
    : 'Min liste'

  const showSearch = query.length >= 2 || filter === 'users'
  const filteredResults = filter === 'all' || filter === 'users' ? results : results.filter(r => r.media_type === filter)

  const cancelActiveSearch = () => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current)
      searchTimer.current = null
    }
    activeSearchAbort.current?.abort()
    activeSearchAbort.current = null
    searchRequestId.current += 1
  }

  useEffect(() => {
    return () => cancelActiveSearch()
  }, [])


  return (
    <>
      {/* Backdrop — lettere end før, indholdet skinner igennem */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) onClose() }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
        style={{
          background: 'rgba(16, 16, 18, 0.97)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          borderBottom: 'none',
          maxHeight: '88vh',
          transition: 'bottom 0.15s ease-out, max-height 0.15s ease-out',
        }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 flex-shrink-0" onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none', cursor: 'grab' }} />

        {/* INDHOLD — skifter mellem trending og søgeresultater */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ touchAction: 'pan-y' }}>
          <AnimatePresence mode="wait">
            {!showSearch && aiMode ? (
              /* ── AI IDLE ── */
              <motion.div
                key="ai-idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-6 pt-8 pb-4 flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <p className="text-white text-base font-semibold">Beskriv hvad du leder efter</p>
                  <p className="text-white/45 text-sm leading-relaxed">AI finder film og serier baseret på hvad du skriver — ikke kun titler.</p>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {[
                    'Noget der minder om Interstellar',
                    'En sjov dansk komedie fra 90\'erne',
                    'Sci-fi thriller med twist ending',
                    'Noget vi kan se med børnene',
                  ].map(example => (
                    <button
                      key={example}
                      onClick={() => { handleInput(example); inputRef.current?.focus() }}
                      className="text-left px-4 py-3 rounded-xl text-sm text-white/60 active:bg-white/10 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : !showSearch ? (
              /* ── IDLE: FEED + TRENDING ── */
              <motion.div
                key="trending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-4 pt-4 pb-2 flex flex-col gap-6"
              >
                {/* UDVALGT TIL DIG — fast teaser i toppen */}
                <div className="pb-1">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <p className="text-white/50 text-xs font-medium">Udvalgt til dig</p>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1 min-h-[9.75rem]">
                    {recLoading && recommendations.length === 0 ? (
                      [0, 1, 2, 3].map(i => (
                        <div key={i} className="flex-shrink-0 w-24">
                          <div className="w-24 h-36 rounded-xl bg-white/8 animate-pulse" />
                          <div className="mt-1.5 h-2 w-16 rounded-full bg-white/8 animate-pulse" />
                        </div>
                      ))
                    ) : recommendations.length > 0 ? (
                      recommendations.slice(0, 4).map(item => (
                        <div key={`${item.tmdb_id}-${item.media_type}`} className="flex-shrink-0 w-24">
                          <Link href={`/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}${activeContext ? `?ctx=${activeContext}` : ''}`}>
                            <div className="relative w-24 h-36 rounded-xl overflow-hidden bg-white/8">
                              {item.poster && (
                                <Image src={item.poster} alt={item.title} fill className="object-cover" sizes="96px" />
                              )}
                            </div>
                          </Link>
                          {item.reason && (
                            <p className="text-white/40 text-xs mt-1.5 leading-tight line-clamp-2">{item.reason}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex-shrink-0 w-[18rem] rounded-2xl px-4 py-4 flex flex-col justify-between"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          minHeight: '9.75rem',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-white/70 text-sm font-medium">Vi lærer din smag at kende</p>
                          <span className="text-white/30 text-[10px] uppercase tracking-[0.18em]">Beta</span>
                        </div>
                        <p className="text-white/35 text-xs leading-relaxed max-w-[13rem]">
                          Rate nogle titler eller brug Opdag lidt mere, så kommer der bedre forslag her.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* FEED */}
                <div>
                  <p className="text-white/50 text-xs font-medium mb-3 px-1">Dine venner ser</p>
                  <div className="flex gap-2.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
                    {feedLoading ? (
                      [0,1,2,3].map(i => (
                        <div key={i} className="flex-shrink-0 w-28">
                          <div className="w-28 h-40 rounded-xl bg-white/8 animate-pulse" />
                          <div className="mt-1.5 h-2.5 w-16 rounded bg-white/8 animate-pulse" />
                          <div className="mt-1 h-2.5 w-20 rounded bg-white/8 animate-pulse" />
                        </div>
                      ))
                    ) : feed.length > 0 ? (
                      feed.slice(0, 10).map((item, i) => (
                        <FeedCard key={`${item.user_id}-${item.tmdb_id}-${i}`} item={item} onUserClick={() => setOpenUserId(item.user_id)} />
                      ))
                    ) : (
                      <button
                        onClick={() => { setFilter('users'); setTimeout(() => inputRef.current?.focus(), 50) }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                        </svg>
                        <span className="text-white/40 text-xs">Find venner at følge</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* DU FØLGER — kompakt horisontal række */}
                {followingUsers.length > 0 && (
                  <div>
                    <p className="text-white/50 text-xs font-medium mb-3 px-1">Du følger</p>
                    <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
                      {followingUsers.map(u => (
                        <div
                          key={u.id}
                          className="flex-shrink-0 flex items-center gap-2 pl-1 pr-2 py-1 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <button
                            className="flex items-center gap-2"
                            onClick={() => setOpenUserId(u.id)}
                          >
                            <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                              {u.avatar ? (
                                <Image src={u.avatar} alt={u.name} width={24} height={24} className="object-cover" />
                              ) : (
                                <span className="text-white text-xs font-semibold flex items-center justify-center h-full">{u.name?.[0]}</span>
                              )}
                            </div>
                            <span className="text-white/80 text-xs font-medium whitespace-nowrap">{u.name.split(' ')[0]}</span>
                          </button>
                          <button
                            onClick={() => toggleFollow(u)}
                            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.12)' }}
                          >
                            <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                              <path d="M1 1L7 7M7 1L1 7" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {baseLoading ? (
                  [0, 1].map(i => (
                    <div key={i}>
                      <div className="h-2.5 w-28 rounded-full bg-white/8 animate-pulse mb-3 mx-1" />
                      <div className="flex gap-2.5 -mx-4 px-4 pb-1">
                        {[0,1,2,3,4].map(j => (
                          <div key={j} className="flex-shrink-0">
                            <div className="w-24 h-36 rounded-xl bg-white/8 animate-pulse" />
                            <div className="mt-1.5 h-2 w-16 rounded-full bg-white/8 animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  [...baseSections, ...providerSections].map(section => section.items.length > 0 && (
                    <div key={section.id}>
                      <div className="flex items-center gap-1.5 mb-3 px-1">
                        {section.providerLogo && (
                          <Image src={section.providerLogo} alt="" width={14} height={14} className="rounded" />
                        )}
                        <p className="text-white/50 text-xs font-medium">{section.title}</p>
                      </div>
                      <div className="flex gap-2.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
                        {section.items.map(item => (
                          <TrendingCard key={`${item.tmdb_id}-${item.media_type}`} item={item} isAdded={isAdded(item)} onAdd={() => addToList(item)} onRemove={() => removeFromList(item)} ctx={activeContext ?? undefined} />
                        ))}
                      </div>
                    </div>
                  ))
                )}

              </motion.div>
            ) : (
              /* ── SØGERESULTATER ── */
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col"
              >
                {/* Filter pills — kun i normal tilstand */}
                {!aiMode && (
                  <div className="flex gap-2 px-4 pt-4 pb-3 flex-shrink-0 overflow-x-auto scrollbar-none">
                    {(['all', 'movie', 'tv', 'users'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => {
                          setFilter(f)
                          if (f === 'users' && query.length >= 2) {
                            fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
                              .then(r => r.json())
                              .then(d => setUserResults(d.users || []))
                          }
                        }}
                        className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                        style={filter === f ? {
                          background: 'white',
                          color: 'black',
                        } : {
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {f === 'all' ? 'Top' : f === 'movie' ? 'Film' : f === 'tv' ? 'Serier' : 'Brugere'}
                      </button>
                    ))}
                    {loading && filter !== 'users' && (
                      <div className="ml-auto flex items-center flex-shrink-0">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                {/* AI thinking */}
                {aiMode && aiThinking && (
                  <div className="flex flex-col items-center gap-3 py-12 px-6">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ background: 'rgba(150,100,255,0.8)' }}
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                    <p className="text-white/40 text-sm">Finder forslag...</p>
                  </div>
                )}

                {/* AI label */}
                {aiMode && !aiThinking && results.length > 0 && (
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                    <span style={{ fontSize: 13 }}>✦</span>
                    <p className="text-white/40 text-xs">AI-forslag baseret på din beskrivelse</p>
                  </div>
                )}

                {/* Resultatliste */}
                {/* Bruger-resultater */}
                {filter === 'users' && (
                  <div className="flex flex-col px-4 pb-2">
                    {/* Idle: vis dem du følger */}
                    {query.length < 2 && followingUsers.length > 0 && (
                      <>
                        <p className="text-white/40 text-xs font-medium pt-2 pb-3 px-1">Følger</p>
                        {followingUsers.map(u => (
                          <div
                            key={u.id}
                            className="flex items-center gap-3 py-3"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setOpenUserId(u.id)}>
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {u.avatar ? (
                                  <Image src={u.avatar} alt={u.name} width={40} height={40} className="object-cover" />
                                ) : (
                                  <span className="text-white font-semibold text-base">{u.name?.[0]}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium">{u.name}</p>
                                {u.username && <p className="text-white/40 text-xs">@{u.username}</p>}
                              </div>
                            </button>
                            <button
                              onClick={() => toggleFollow(u)}
                              className="px-4 py-1.5 rounded-full text-xs font-medium flex-shrink-0"
                              style={{
                                background: 'rgba(52,199,89,0.15)',
                                border: '1px solid rgba(52,199,89,0.35)',
                                color: 'rgb(52,199,89)',
                              }}
                            >
                              Følger
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                    {query.length < 2 && followingUsers.length === 0 && (
                      <p className="text-white/30 text-sm text-center py-8">Du følger ingen endnu</p>
                    )}
                    {userResults.length === 0 && query.length >= 2 && (
                      <p className="text-white/40 text-sm text-center py-8">Ingen brugere fundet for &quot;{query}&quot;</p>
                    )}
                    {userResults.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 py-3"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setOpenUserId(u.id)}>
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {u.avatar ? (
                              <Image src={u.avatar} alt={u.name} width={40} height={40} className="object-cover" />
                            ) : (
                              <span className="text-white font-semibold text-base">{u.name?.[0]}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium leading-snug">{u.name}</p>
                            {u.username && <p className="text-white/40 text-xs">@{u.username}</p>}
                          </div>
                        </button>
                        <button
                          onClick={() => toggleFollow(u)}
                          className="px-4 py-1.5 rounded-full text-xs font-medium flex-shrink-0"
                          style={u.is_following ? {
                            background: 'rgba(52,199,89,0.15)',
                            border: '1px solid rgba(52,199,89,0.35)',
                            color: 'rgb(52,199,89)',
                          } : {
                            background: 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                          }}
                        >
                          {u.is_following ? 'Følger' : 'Følg'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col px-4 pb-2" style={{ display: filter === 'users' ? 'none' : undefined }}>
                  {filteredResults.length === 0 && !loading && !aiThinking && filter !== 'users' && (
                    <p className="text-white/40 text-sm text-center py-8">Ingen resultater for &quot;{query}&quot;</p>
                  )}
                  {filter !== 'users' && filteredResults.map(item => {
                    const itemAdded = isAdded(item)
                    const key = `${item.tmdb_id}-${item.media_type}`
                    const itemProviders = providers[key]
                    const href = `/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}${activeContext ? `?ctx=${activeContext}` : ''}`
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 py-2.5"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <Link href={href} className="flex items-center gap-3 flex-1 min-w-0 no-underline">
                          {item.poster ? (
                            <Image src={item.poster} alt={item.title} width={44} height={62} className="rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-11 h-16 rounded-lg bg-white/8 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium leading-snug">{item.title}</p>
                            <p className="text-white/45 text-xs mt-0.5">
                              {item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}
                            </p>
                            {item.reason && (
                              <p className="text-white/35 text-xs mt-0.5 italic">{item.reason}</p>
                            )}
                            {!aiMode && itemProviders && itemProviders.length > 0 && (
                              <div className="flex gap-1 mt-1.5">
                                {itemProviders.slice(0, 2).map(p => (
                                  <Image key={p.id} src={p.logo} alt={p.name} width={16} height={16} className="rounded-sm object-cover" />
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                        <button
                          onClick={() => itemAdded ? removeFromList(item) : addToList(item)}
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: itemAdded ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255,255,255,0.07)',
                            border: itemAdded ? '1px solid rgba(52,199,89,0.3)' : '1px solid rgba(255,255,255,0.1)',
                            color: itemAdded ? 'rgb(52,199,89)' : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          <span className="text-sm font-semibold">{itemAdded ? '✓' : '+'}</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BUND — kontekst + søgefelt */}
        <div
          className="flex-shrink-0 px-4 pb-6 pt-3 flex flex-col gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* "Også til din liste?" prompt */}
          <AnimatePresence>
            {alsoAddPrompt && (
              <motion.div
                key="also-add"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2 px-1 pb-2"
              >
                <span className="text-white/50 text-xs flex-1 truncate">
                  Også til <span className="text-white">din liste</span>?
                </span>
                <button
                  onClick={() => addToPersonalList(alsoAddPrompt)}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)', color: 'rgb(52,199,89)' }}
                >
                  Tilføj
                </button>
                <button
                  onClick={() => setAlsoAddPrompt(null)}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                >
                  Nej
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Kontekst-picker */}
          {(groups.length > 0 || activeContext !== null) && (
            <div className="relative">
              <button
                onClick={() => setShowContextPicker(p => !p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
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
                    background: 'rgba(28,28,30,0.98)',
                    border: '1px solid rgba(255,255,255,0.12)',
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

          {/* Søgefelt + luk-knap */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl flex-1"
              style={{
                background: aiMode ? 'rgba(120,80,255,0.12)' : 'rgba(255,255,255,0.07)',
                border: aiMode ? '1px solid rgba(150,100,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                transition: 'background 0.2s, border 0.2s',
              }}
            >
              {/* AI / Søg toggle */}
              <button
                onClick={toggleAiMode}
                className="flex-shrink-0 transition-transform active:scale-90"
                title={aiMode ? 'Skift til normal søgning' : 'Skift til AI-søgning'}
              >
                {aiMode ? (
                  <span style={{ fontSize: 16 }}>✦</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                )}
              </button>
              <input
                ref={inputRef}
                type="search"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                readOnly
                onTouchStart={e => e.currentTarget.removeAttribute('readonly')}
                value={query}
                onChange={e => handleInput(e.target.value)}
                placeholder={aiMode ? 'Beskriv hvad du leder efter...' : 'Søg efter film eller serie...'}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              {query.length > 0 && (
                <button
                  onClick={() => { setQuery(''); setResults([]); setFilter('all') }}
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1L7 7M7 1L1 7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Luk søgning */}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M11 1L1 11" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {openUserId && (
          <UserSheet userId={openUserId} onClose={() => setOpenUserId(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

function FeedCard({ item, onUserClick }: { item: FeedItem; onUserClick: () => void }) {
  const href = `/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`
  return (
    <div className="flex-shrink-0 w-28">
      <Link href={href} className="no-underline block">
        <div className="relative w-28 h-40 rounded-xl overflow-hidden">
          {item.poster ? (
            <Image src={item.poster} alt={item.title} fill className="object-cover" sizes="112px" />
          ) : (
            <div className="w-full h-full bg-white/8" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {/* Avatar overlay — klikbar */}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onUserClick() }}
            className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full overflow-hidden ring-1 ring-black/40 active:scale-110 transition-transform"
          >
            {item.user_avatar ? (
              <Image src={item.user_avatar} alt={item.user_name} width={24} height={24} className="object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{item.user_name[0]}</span>
              </div>
            )}
          </button>
          {/* Rating */}
          {item.rating && (
            <div className="absolute bottom-1.5 left-1.5 flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z"
                    fill={s <= item.rating! ? 'rgba(251,191,36,1)' : 'rgba(255,255,255,0.2)'} />
                </svg>
              ))}
            </div>
          )}
        </div>
      </Link>
      <button onClick={onUserClick} className="text-left px-0.5 mt-1.5 w-full">
        <p className="text-white/60 text-xs leading-tight line-clamp-1">{item.user_name.split(' ')[0]}</p>
      </button>
      <p className="text-white/80 text-xs leading-tight line-clamp-1 px-0.5 font-medium">{item.title}</p>
    </div>
  )
}

function TrendingCard({
  item,
  isAdded,
  onAdd,
  onRemove,
  ctx,
}: {
  item: Result
  isAdded: boolean
  onAdd: () => void
  onRemove: () => void
  ctx?: string
}) {
  const href = `/${item.media_type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}${ctx ? `?ctx=${ctx}` : ''}`
  return (
    <div className="flex-shrink-0 w-28 relative">
      <Link href={href} className="block no-underline">
        <div className="relative w-28 h-40 rounded-xl overflow-hidden">
          {item.poster ? (
            <Image src={item.poster} alt={item.title} fill className="object-cover" sizes="112px" />
          ) : (
            <div className="w-full h-full bg-white/8" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        <p className="text-white/70 text-xs mt-1.5 leading-tight line-clamp-2 px-0.5">{item.title}</p>
      </Link>
      <button
        onClick={e => {
          e.preventDefault()
          if (isAdded) onRemove()
          else onAdd()
        }}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: isAdded ? 'rgba(52,199,89,0.2)' : 'rgba(0,0,0,0.5)',
          border: isAdded ? '1px solid rgba(52,199,89,0.4)' : '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ color: isAdded ? 'rgb(52,199,89)' : 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
          {isAdded ? '✓' : '+'}
        </span>
      </button>
    </div>
  )
}
