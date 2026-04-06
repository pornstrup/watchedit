export type WatchlistScope = 'personal' | 'group'

export type WatchlistMutationItem = {
  id: string
  tmdb_id: number
  media_type: string
  status: 'want' | 'watching' | 'done'
  title: string
  poster: string | null
  year?: string | null
  added_at?: string
  updated_at?: string
  progress?: {
    total_episodes: number
    watched_episodes: number
  } | null
}

export type WatchlistMutationDetail = {
  scope: WatchlistScope
  groupId: string | null
  tempId: string
  item: WatchlistMutationItem
}

export type WatchlistMutationStatusDetail = {
  scope: WatchlistScope
  groupId: string | null
  itemId: string
  status: 'want' | 'watching' | 'done'
}

export const WATCHLIST_ITEM_OPTIMISTIC_ADD = 'watchlist-item-optimistic-add'
export const WATCHLIST_ITEM_OPTIMISTIC_CONFIRM = 'watchlist-item-optimistic-confirm'
export const WATCHLIST_ITEM_OPTIMISTIC_REMOVE = 'watchlist-item-optimistic-remove'
export const WATCHLIST_ITEM_OPTIMISTIC_STATUS = 'watchlist-item-optimistic-status'

export function createWatchlistTempId(scope: WatchlistScope, groupId: string | null, tmdbId: number, mediaType: string) {
  return `${scope}:${groupId ?? 'personal'}:${tmdbId}:${mediaType}:${Date.now()}`
}

export function dispatchWatchlistOptimisticAdd(detail: WatchlistMutationDetail) {
  window.dispatchEvent(new CustomEvent(WATCHLIST_ITEM_OPTIMISTIC_ADD, { detail }))
}

export function dispatchWatchlistOptimisticConfirm(detail: WatchlistMutationDetail) {
  window.dispatchEvent(new CustomEvent(WATCHLIST_ITEM_OPTIMISTIC_CONFIRM, { detail }))
}

export function dispatchWatchlistOptimisticRemove(detail: WatchlistMutationDetail) {
  window.dispatchEvent(new CustomEvent(WATCHLIST_ITEM_OPTIMISTIC_REMOVE, { detail }))
}

export function dispatchWatchlistOptimisticStatus(detail: WatchlistMutationStatusDetail) {
  window.dispatchEvent(new CustomEvent(WATCHLIST_ITEM_OPTIMISTIC_STATUS, { detail }))
}

type MinimalWatchlistItem = {
  id: string
  tmdb_id: number
  media_type: string
  status: string
}

function matchesOptimisticItem<T extends MinimalWatchlistItem>(item: T, detail: WatchlistMutationDetail) {
  return item.id === detail.tempId || (item.tmdb_id === detail.item.tmdb_id && item.media_type === detail.item.media_type)
}

export function applyWatchlistOptimisticAdd<T extends MinimalWatchlistItem>(
  items: T[],
  detail: WatchlistMutationDetail,
) {
  const next = items.filter(item => !matchesOptimisticItem(item, detail))
  return [detail.item as unknown as T, ...next]
}

export function applyWatchlistOptimisticConfirm<T extends MinimalWatchlistItem>(
  items: T[],
  detail: WatchlistMutationDetail,
) {
  const next = items.filter(item => !matchesOptimisticItem(item, detail))
  return [detail.item as unknown as T, ...next]
}

export function applyWatchlistOptimisticRemove<T extends MinimalWatchlistItem>(
  items: T[],
  detail: WatchlistMutationDetail,
) {
  return items.filter(item => !matchesOptimisticItem(item, detail))
}

export function applyWatchlistOptimisticStatus<T extends MinimalWatchlistItem>(
  items: T[],
  detail: WatchlistMutationStatusDetail,
) {
  return items.map(item => (item.id === detail.itemId ? { ...item, status: detail.status } : item))
}
