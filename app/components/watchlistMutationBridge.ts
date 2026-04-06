type MutationKind = 'add' | 'confirm' | 'remove' | 'status'

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

type GroupStatusMutationRecord = {
  groupId: string
  kind: 'status'
  itemId: string
  tmdb_id: number
  media_type: string
  status: 'want' | 'watching' | 'done'
  at: number
}

type StoredRecord = GroupMutationRecord | GroupStatusMutationRecord

const STORAGE_KEY = 'flimr:group-watchlist-mutations:v1'
const TTL_MS = 15 * 60 * 1000
const MAX_RECORDS = 25

function readRecords(): StoredRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return parsed.filter((record): record is StoredRecord => {
      if (!record || typeof record !== 'object') return false
      if (typeof record.groupId !== 'string') return false
      if (typeof record.kind !== 'string') return false
      if (typeof record.at !== 'number') return false
      if (now - record.at > TTL_MS) return false

      if (record.kind === 'status') {
        const statusRecord = record as GroupStatusMutationRecord
        return typeof statusRecord.itemId === 'string'
          && typeof statusRecord.tmdb_id === 'number'
          && typeof statusRecord.media_type === 'string'
          && typeof statusRecord.status === 'string'
      }

      const mutationRecord = record as GroupMutationRecord
      return typeof mutationRecord.tempId === 'string'
        && typeof mutationRecord.item === 'object'
    })
  } catch {
    return []
  }
}

function writeRecords(records: StoredRecord[]) {
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

function matchesStatusRecord(item: { id: string; tmdb_id: number; media_type: string }, record: GroupStatusMutationRecord) {
  return item.id === record.itemId
    || (item.tmdb_id === record.tmdb_id && item.media_type === record.media_type)
}

type GroupMutationDetail =
  | { groupId: string | null; tempId: string; item: MinimalMutationItem }
  | { groupId: string | null; itemId: string; tmdb_id: number; media_type: string; status: 'want' | 'watching' | 'done' }

export function recordGroupMutation(
  kind: MutationKind,
  detail: GroupMutationDetail,
) {
  if (typeof window === 'undefined' || !detail.groupId) return
  const groupId = detail.groupId

  if (kind === 'status') {
    const statusDetail = detail as Extract<GroupMutationDetail, { itemId: string }>
    const next = readRecords().filter(record => {
      if (record.groupId !== groupId) return true
      if (record.kind === 'status') {
        const statusRecord = record as GroupStatusMutationRecord
        return !(statusRecord.itemId === statusDetail.itemId
          || (statusRecord.tmdb_id === statusDetail.tmdb_id && statusRecord.media_type === statusDetail.media_type))
      }
      const mutationRecord = record as GroupMutationRecord
      return !(mutationRecord.item.id === statusDetail.itemId
        || (mutationRecord.item.tmdb_id === statusDetail.tmdb_id && mutationRecord.item.media_type === statusDetail.media_type))
    })

    next.push({
      groupId,
      kind: 'status',
      itemId: statusDetail.itemId,
      tmdb_id: statusDetail.tmdb_id,
      media_type: statusDetail.media_type,
      status: statusDetail.status,
      at: Date.now(),
    })
    writeRecords(next)
    return
  }

  const mutationDetail = detail as Extract<GroupMutationDetail, { tempId: string; item: MinimalMutationItem }>

  const next = readRecords().filter(record => {
    if (record.groupId !== groupId) return true
    if (record.kind === 'status') {
      const statusRecord = record as GroupStatusMutationRecord
      return !(statusRecord.tmdb_id === mutationDetail.item.tmdb_id && statusRecord.media_type === mutationDetail.item.media_type)
    }
    const mutationRecord = record as GroupMutationRecord
    return !sameItemKey(mutationRecord, groupId, mutationDetail.item)
  })

  next.push({
    groupId,
    kind,
    tempId: mutationDetail.tempId,
    item: mutationDetail.item,
    at: Date.now(),
  })
  writeRecords(next)
}

export function applyGroupMutationOverlay<T extends { id: string; tmdb_id: number; media_type: string; status?: string }>(
  items: T[],
  groupId: string,
) {
  const records = readRecords()
    .filter(record => record.groupId === groupId)
    .sort((a, b) => a.at - b.at)

  return records.reduce<T[]>((currentItems, record) => {
    if (record.kind === 'status') {
      const statusRecord = record as GroupStatusMutationRecord
      return currentItems.map(item => (
        matchesStatusRecord(item, statusRecord)
          ? { ...item, status: statusRecord.status }
          : item
      ))
    }

    if (record.kind === 'remove') {
      const mutationRecord = record as GroupMutationRecord
      return currentItems.filter(item => !matchesRecord(item, mutationRecord))
    }

    const mutationRecord = record as GroupMutationRecord
    const next = currentItems.filter(item => !matchesRecord(item, mutationRecord))
    return [mutationRecord.item as unknown as T, ...next]
  }, items)
}
