// Starter gruppens bootstrap-kald så snart gruppe-id'et kendes (i WatchlistProvider),
// i stedet for at vente på /api/groups og GroupView's mount.

type Prefetch = { promise: Promise<unknown>; startedAt: number }

// Ældre forhåndshentninger kasseres, så man aldrig får forældede data
const MAX_AGE_MS = 10_000

const pending = new Map<string, Prefetch>()

function fetchGroupBootstrap(groupId: string): Promise<unknown> {
  return fetch(`/api/groups/${groupId}/bootstrap`).then(async (r) => {
    if (!r.ok) throw new Error('bootstrap failed')
    return r.json()
  })
}

export function prefetchGroupBootstrap(groupId: string) {
  const existing = pending.get(groupId)
  if (existing && Date.now() - existing.startedAt < MAX_AGE_MS) return

  const promise = fetchGroupBootstrap(groupId)
  promise.catch(() => pending.delete(groupId))
  pending.set(groupId, { promise, startedAt: Date.now() })
}

// Bruger en frisk forhåndshentning én gang, ellers hentes der på ny
export function loadGroupBootstrap<T>(groupId: string): Promise<T> {
  const existing = pending.get(groupId)
  pending.delete(groupId)
  if (existing && Date.now() - existing.startedAt < MAX_AGE_MS) return existing.promise as Promise<T>
  return fetchGroupBootstrap(groupId) as Promise<T>
}
