'use client'

export type OpdagItem = {
  tmdb_id: number
  media_type: string
  title: string
  year?: string | null
  poster: string | null
  reason?: string
}

export type OpdagSection = {
  id: string
  title: string
  providerLogo?: string
  items: OpdagItem[]
}

export type DiscoveryFeedItem = {
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

export type DiscoveryUser = {
  id: string
  name: string
  username: string | null
  avatar: string | null
  is_following: boolean
}

export type DiscoveryGroup = {
  id: string
  name: string
}

export type DiscoveryBootstrapData = {
  baseSections?: OpdagSection[]
  providerSections?: OpdagSection[]
  feed?: DiscoveryFeedItem[]
  followingUsers?: DiscoveryUser[]
  groups?: DiscoveryGroup[]
  streamingKey?: string
  existingIds?: string[]
}

type ProfileResponse = {
  streaming_services?: number[]
}

type SectionsResponse = {
  sections?: OpdagSection[]
}

type FeedResponse = {
  items?: DiscoveryFeedItem[]
}

type UsersResponse = {
  users?: DiscoveryUser[]
}

type GroupsResponse = {
  groups?: DiscoveryGroup[]
}

type CacheEntry<T> = {
  value: T
  savedAt: number
}

const normalizeStreamingKey = (services: number[]) =>
  [...services]
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b)
    .join(',') || 'none'

const BASE_TTL_MS = 10 * 60 * 1000
const STREAMING_TTL_MS = 5 * 60 * 1000
const SOCIAL_TTL_MS = 5 * 60 * 1000

let baseSectionsCache: CacheEntry<OpdagSection[]> | null = null
let baseSectionsPromise: Promise<OpdagSection[]> | null = null

let feedCache: CacheEntry<DiscoveryFeedItem[]> | null = null
let feedPromise: Promise<DiscoveryFeedItem[]> | null = null

let followingUsersCache: CacheEntry<DiscoveryUser[]> | null = null
let followingUsersPromise: Promise<DiscoveryUser[]> | null = null

let groupsCache: CacheEntry<DiscoveryGroup[]> | null = null
let groupsPromise: Promise<DiscoveryGroup[]> | null = null

let streamingKeyCache: CacheEntry<string> | null = null
let streamingKeyPromise: Promise<string> | null = null

const providerSectionsCache = new Map<string, CacheEntry<OpdagSection[]>>()
const providerSectionsPromise = new Map<string, Promise<OpdagSection[]>>()

async function fetchSections(url: string): Promise<OpdagSection[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  const data = (await res.json()) as SectionsResponse
  return data.sections || []
}

async function fetchFeed(): Promise<DiscoveryFeedItem[]> {
  const res = await fetch('/api/follows/feed')
  if (!res.ok) throw new Error('Failed to fetch feed')
  const data = (await res.json()) as FeedResponse
  return data.items || []
}

async function fetchFollowingUsers(): Promise<DiscoveryUser[]> {
  const res = await fetch('/api/follows/list')
  if (!res.ok) throw new Error('Failed to fetch follows')
  const data = (await res.json()) as UsersResponse
  return data.users || []
}

async function fetchGroups(): Promise<DiscoveryGroup[]> {
  const res = await fetch('/api/groups')
  if (!res.ok) throw new Error('Failed to fetch groups')
  const data = (await res.json()) as GroupsResponse
  return data.groups || []
}

function isFresh(savedAt: number, ttlMs: number) {
  return Date.now() - savedAt < ttlMs
}

function cacheHasFreshValue<T>(entry: CacheEntry<T> | null, ttlMs: number) {
  return entry !== null && isFresh(entry.savedAt, ttlMs)
}

export function hydrateDiscoveryBootstrap(data: DiscoveryBootstrapData) {
  const now = Date.now()

  if (data.baseSections) {
    baseSectionsCache = { value: data.baseSections, savedAt: now }
    baseSectionsPromise = null
  }

  if (data.providerSections && data.streamingKey) {
    streamingKeyCache = { value: data.streamingKey, savedAt: now }
    providerSectionsCache.set(data.streamingKey, { value: data.providerSections, savedAt: now })
    providerSectionsPromise.delete(data.streamingKey)
    streamingKeyPromise = null
  }

  if (data.feed) {
    feedCache = { value: data.feed, savedAt: now }
    feedPromise = null
  }

  if (data.followingUsers) {
    followingUsersCache = { value: data.followingUsers, savedAt: now }
    followingUsersPromise = null
  }

  if (data.groups) {
    groupsCache = { value: data.groups, savedAt: now }
    groupsPromise = null
  }
}

export async function getDiscoveryBootstrap(activeContext: string | null = null, forceProfileRefresh = false): Promise<DiscoveryBootstrapData> {
  const params = new URLSearchParams()
  if (activeContext) params.set('ctx', activeContext)
  if (forceProfileRefresh) params.set('refresh', '1')
  const query = params.toString()
  const res = await fetch(`/api/opdag/bootstrap${query ? `?${query}` : ''}`)
  if (!res.ok) throw new Error('Failed to fetch discovery bootstrap')
  const data = (await res.json()) as DiscoveryBootstrapData
  hydrateDiscoveryBootstrap(data)
  return data
}

export async function getDiscoveryBaseSections(): Promise<OpdagSection[]> {
  if (cacheHasFreshValue(baseSectionsCache, BASE_TTL_MS)) {
    return baseSectionsCache!.value
  }
  if (!baseSectionsPromise) {
    baseSectionsPromise = fetchSections('/api/opdag/base')
      .then((sections) => {
        baseSectionsCache = { value: sections, savedAt: Date.now() }
        return sections
      })
      .finally(() => {
        baseSectionsPromise = null
      })
  }
  if (baseSectionsCache) return baseSectionsCache.value
  return baseSectionsPromise
}

export async function getStreamingServicesKey(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    streamingKeyCache = null
    streamingKeyPromise = null
  }

  if (cacheHasFreshValue(streamingKeyCache, STREAMING_TTL_MS)) {
    return streamingKeyCache!.value
  }

  if (!streamingKeyPromise) {
    streamingKeyPromise = fetch('/api/profile/me')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load profile')
        return res.json() as Promise<ProfileResponse>
      })
      .then((data) => {
        const key = normalizeStreamingKey(data.streaming_services || [])
        streamingKeyCache = { value: key, savedAt: Date.now() }
        return key
      })
      .catch(() => {
        streamingKeyCache = { value: 'none', savedAt: Date.now() }
        return 'none'
      })
      .finally(() => {
        streamingKeyPromise = null
      })
  }

  if (streamingKeyCache) return streamingKeyCache.value
  return streamingKeyPromise
}

export async function getDiscoveryProviderSections(forceProfileRefresh = false): Promise<{
  key: string
  sections: OpdagSection[]
}> {
  const key = await getStreamingServicesKey(forceProfileRefresh)
  const cachedEntry = providerSectionsCache.get(key)

  if (!forceProfileRefresh && cacheHasFreshValue(cachedEntry || null, BASE_TTL_MS)) {
    return { key, sections: cachedEntry!.value }
  }

  const cachedPromise = providerSectionsPromise.get(key)
  if (cachedPromise) {
    return { key, sections: await cachedPromise }
  }

  const promise = fetchSections('/api/opdag/providers')
    .then((sections) => {
      providerSectionsCache.set(key, { value: sections, savedAt: Date.now() })
      return sections
    })
    .finally(() => {
      providerSectionsPromise.delete(key)
    })

  providerSectionsPromise.set(key, promise)

  if (!forceProfileRefresh && cachedEntry) {
    return { key, sections: cachedEntry.value }
  }

  return { key, sections: await promise }
}

export async function prefetchDiscoveryData(forceProfileRefresh = false) {
  return Promise.all([
    getDiscoveryBaseSections(),
    getDiscoveryProviderSections(forceProfileRefresh),
  ])
}

export async function getDiscoveryFeed(forceRefresh = false): Promise<DiscoveryFeedItem[]> {
  if (!forceRefresh && cacheHasFreshValue(feedCache, SOCIAL_TTL_MS)) {
    return feedCache!.value
  }

  if (!feedPromise) {
    feedPromise = fetchFeed()
      .then((items) => {
        feedCache = { value: items, savedAt: Date.now() }
        return items
      })
      .finally(() => {
        feedPromise = null
      })
  }

  if (!forceRefresh && feedCache) return feedCache.value
  return feedPromise
}

export async function getFollowingUsers(forceRefresh = false): Promise<DiscoveryUser[]> {
  if (!forceRefresh && cacheHasFreshValue(followingUsersCache, SOCIAL_TTL_MS)) {
    return followingUsersCache!.value
  }

  if (!followingUsersPromise) {
    followingUsersPromise = fetchFollowingUsers()
      .then((users) => {
        followingUsersCache = { value: users, savedAt: Date.now() }
        return users
      })
      .finally(() => {
        followingUsersPromise = null
      })
  }

  if (!forceRefresh && followingUsersCache) return followingUsersCache.value
  return followingUsersPromise
}

export async function getDiscoveryGroups(forceRefresh = false): Promise<DiscoveryGroup[]> {
  if (!forceRefresh && cacheHasFreshValue(groupsCache, BASE_TTL_MS)) {
    return groupsCache!.value
  }

  if (!groupsPromise) {
    groupsPromise = fetchGroups()
      .then((groups) => {
        groupsCache = { value: groups, savedAt: Date.now() }
        return groups
      })
      .finally(() => {
        groupsPromise = null
      })
  }

  if (!forceRefresh && groupsCache) return groupsCache.value
  return groupsPromise
}

export async function prefetchSocialDiscoveryData(forceRefresh = false) {
  return Promise.all([
    getDiscoveryFeed(forceRefresh),
    getFollowingUsers(forceRefresh),
    getDiscoveryGroups(forceRefresh),
  ])
}

export async function refreshDiscoveryData() {
  streamingKeyCache = null
  streamingKeyPromise = null
  providerSectionsPromise.clear()
}

export async function refreshSocialDiscoveryData() {
  feedCache = null
  feedPromise = null
  followingUsersCache = null
  followingUsersPromise = null
  groupsCache = null
  groupsPromise = null
}
