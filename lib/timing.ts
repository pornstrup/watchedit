// Diagnostik: logger kun det der er langsomt, med præfikset [slow] så det kan grep'es:
//   docker logs <container> 2>&1 | grep '\[slow\]'
// Grænser kan justeres med env SLOW_CALL_MS (enkeltkald) og SLOW_REQUEST_MS (hele requests).

export const SLOW_CALL_MS = Number(process.env.SLOW_CALL_MS ?? 500)
export const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS ?? 1000)

// Fetch til Supabase-klienter: logger kald over SLOW_CALL_MS.
// Kun metode + sti — query-strengen (filtre med bruger-id'er) logges ikke.
export const timedFetch: typeof fetch = async (input, init) => {
  const started = performance.now()
  const url = new URL(input instanceof Request ? input.url : input.toString())
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
  try {
    const res = await fetch(input, init)
    const ms = Math.round(performance.now() - started)
    if (ms >= SLOW_CALL_MS) console.warn(`[slow] supabase ${method} ${url.pathname} ${res.status} ${ms}ms`)
    return res
  } catch (e) {
    const ms = Math.round(performance.now() - started)
    console.warn(`[slow] supabase ${method} ${url.pathname} FEJL efter ${ms}ms: ${e instanceof Error ? e.message : e}`)
    throw e
  }
}

// Fase-tider for én request. Logges samlet, hvis hele forløbet tog over SLOW_REQUEST_MS.
export function createPhaseTimer(label: string) {
  const started = performance.now()
  let last = started
  const phases: string[] = []
  return {
    mark(name: string) {
      const now = performance.now()
      phases.push(`${name}=${Math.round(now - last)}`)
      last = now
    },
    done() {
      const total = Math.round(performance.now() - started)
      if (total >= SLOW_REQUEST_MS) console.warn(`[slow] ${label} total=${total}ms ${phases.join(' ')}`)
    },
  }
}
