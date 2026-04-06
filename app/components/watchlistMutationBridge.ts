type MutationKind = 'add' | 'confirm' | 'remove'

type MinimalMutationItem = {
  id: string
  tmdb_id: number
  media_type: string
  status: string
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

type GroupMutationRecord = {
  groupId: string
  kind: MutationKind
  tempId: string
  item: MinimalMutationItem
  at: number
}

const STORAGE_KEY = 'flimr:group-watchlist-mutations:v1'
const TTL_MS = 15 * 60 * 1000
const MAX_RECORDS = 25

function readRecords(): GroupMutationRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return parsed.filter((record): record is GroupMutationRecord => {
      return record
        && typeof record === 'object'
        && typeof record.groupId === 'string'
        && typeof record.kind === 'string'
        && typeof record.tempId === 'string'
        && typeof record.at === 'number'
        && now - record.at <= TTL_MS
    })
  } catch {
    return []
  }
}

function writeRecords(records: GroupMutationRecord[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)))
  } catch {
    // Ignore storage quota or private mode failures.
  }
}

function sameItemKey(record: GroupMutationRecord, groupId: string, item: MinimalMutationItem) {
  return record.groupId === groupId
    && record.item.tmdb_id === item.tmdb_id
    && record.item.media_type === item.media_type
}

function matchesRecord(item: { id: string; tmdb_id: number; media_type: string }, record: GroupMutationRecord) {
  return item.id === record.tempId
    || item.id === record.item.id
    || (item.tmdb_id === record.item.tmdb_id && item.media_type === record.item.media_type)
}

export function recordGroupMutation(
  kind: MutationKind,
  detail: { groupId: string | null; tempId: string; item: MinimalMutationItem },
) {
  if (typeof window === 'undefined' || !detail.groupId) return

  const next = readRecords().filter(record => !sameItemKey(record, detail.groupId!, detail.item))
  next.push({
    groupId: detail.groupId,
    kind,
    tempId: detail.tempId,
    item: detail.item,
    at: Date.now(),
  })
  writeRecords(next)
}

export function applyGroupMutationOverlay<T extends { id: string; tmdb_id: number; media_type: string }>(
  items: T[],
  groupId: string,
) {
  const records = readRecords()
    .filter(record => record.groupId === groupId)
    .sort((a, b) => a.at - b.at)

  return records.reduce<T[]>((currentItems, record) => {
    if (record.kind === 'remove') {
      return currentItems.filter(item => !matchesRecord(item, record))
    }

    const next = currentItems.filter(item => !matchesRecord(item, record))
    return [record.item as unknown as T, ...next]
  }, items)
}
