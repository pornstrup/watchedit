'use client'

export type SearchFilter = 'all' | 'movie' | 'tv' | 'users'

export type SearchSheetSnapshot = {
  query: string
  aiMode: boolean
  filter: SearchFilter
  activeContext: string | null
  savedAt: number
}

export type RecommendationItem = {
  tmdb_id: number
  media_type: string
  title: string
  year?: string | null
  poster: string | null
  reason?: string
}

type RecommendationPayload = {
  items?: RecommendationItem[]
  savedAt?: number
}

const SEARCH_STATE_KEY = 'flimr:search-sheet-state:v1'
const RECOMMENDATIONS_KEY = 'flimr:recommendations:v2'
const LEGACY_RECOMMENDATIONS_KEY = 'flimr:recommendations'

const SEARCH_STATE_TTL_MS = 5 * 60 * 1000
const RECOMMENDATIONS_TTL_MS = 24 * 60 * 60 * 1000
const SEARCH_FILTERS = new Set<SearchFilter>(['all', 'movie', 'tv', 'users'])

const canUseStorage = () => typeof window !== 'undefined'

export function loadSearchSheetSnapshot(): SearchSheetSnapshot | null {
  if (!canUseStorage()) return null
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SearchSheetSnapshot>
    if (
      typeof parsed.query !== 'string' ||
      typeof parsed.aiMode !== 'boolean' ||
      typeof parsed.filter !== 'string' ||
      typeof parsed.savedAt !== 'number' ||
      !SEARCH_FILTERS.has(parsed.filter as SearchFilter)
    ) {
      sessionStorage.removeItem(SEARCH_STATE_KEY)
      return null
    }
    if (Date.now() - parsed.savedAt > SEARCH_STATE_TTL_MS) {
      sessionStorage.removeItem(SEARCH_STATE_KEY)
      return null
    }
    return {
      query: parsed.query,
      aiMode: parsed.aiMode,
      filter: parsed.filter as SearchFilter,
      activeContext: typeof parsed.activeContext === 'string' ? parsed.activeContext : null,
      savedAt: parsed.savedAt,
    }
  } catch {
    return null
  }
}

export function saveSearchSheetSnapshot(snapshot: Omit<SearchSheetSnapshot, 'savedAt'>) {
  if (!canUseStorage()) return
  try {
    sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify({
      ...snapshot,
      savedAt: Date.now(),
    }))
  } catch {}
}

export function clearSearchSheetSnapshot() {
  if (!canUseStorage()) return
  try {
    sessionStorage.removeItem(SEARCH_STATE_KEY)
  } catch {}
}

export function loadRecommendationsCache(): RecommendationItem[] | null {
  if (!canUseStorage()) return null
  try {
    const rawKey = localStorage.getItem(RECOMMENDATIONS_KEY)
      ? RECOMMENDATIONS_KEY
      : localStorage.getItem(LEGACY_RECOMMENDATIONS_KEY)
      ? LEGACY_RECOMMENDATIONS_KEY
      : null
    if (!rawKey) return null
    const raw = localStorage.getItem(rawKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RecommendationPayload
    const items = parsed.items || []
    const savedAt = parsed.savedAt || 0
    if (!items.length || !savedAt) {
      localStorage.removeItem(RECOMMENDATIONS_KEY)
      localStorage.removeItem(LEGACY_RECOMMENDATIONS_KEY)
      return null
    }
    if (Date.now() - savedAt > RECOMMENDATIONS_TTL_MS) {
      localStorage.removeItem(RECOMMENDATIONS_KEY)
      localStorage.removeItem(LEGACY_RECOMMENDATIONS_KEY)
      return null
    }
    return items
  } catch {
    return null
  }
}

export function saveRecommendationsCache(items: RecommendationItem[]) {
  if (!canUseStorage()) return
  try {
    localStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify({
      items,
      savedAt: Date.now(),
    }))
    localStorage.removeItem(LEGACY_RECOMMENDATIONS_KEY)
  } catch {}
}

export function clearRecommendationsCache() {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem(RECOMMENDATIONS_KEY)
    localStorage.removeItem(LEGACY_RECOMMENDATIONS_KEY)
  } catch {}
}
