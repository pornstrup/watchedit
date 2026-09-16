export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Genbrug forbindelser til Supabase/TMDB længere end Node's standard 4 s.
    // Målt i prod: 4 parallelle kald på nye forbindelser median 262 ms, genbrugte 121 ms.
    const { Agent, setGlobalDispatcher } = await import('undici')
    setGlobalDispatcher(new Agent({ keepAliveTimeout: 60_000, keepAliveMaxTimeout: 10 * 60_000 }))


    // Diagnostik: log hvis Node's event loop har været blokeret (fx CPU-tungt arbejde),
    // så alle requests samtidig ventede. Tjekkes hvert 10. sekund.
    const { monitorEventLoopDelay } = await import('node:perf_hooks')
    const loopDelay = monitorEventLoopDelay({ resolution: 20 })
    loopDelay.enable()
    setInterval(() => {
      const maxMs = Math.round(loopDelay.max / 1e6)
      if (maxMs >= 200) {
        console.warn(`[slow] event loop blokeret: max=${maxMs}ms p99=${Math.round(loopDelay.percentile(99) / 1e6)}ms (seneste 10 s)`)
      }
      loopDelay.reset()
    }, 10_000).unref()
    const { SLOW_CALL_MS, SLOW_REQUEST_MS } = await import('./lib/timing')
    console.log(`[timing] slow-logning aktiv (kald ≥ ${SLOW_CALL_MS} ms, requests ≥ ${SLOW_REQUEST_MS} ms, event loop ≥ 200 ms)`)

    const cron = (await import('node-cron')).default
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const runJob = async (name: string) => {
      try {
        const res = await fetch(`${base}/api/cron/${name}`, {
          headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
        })
        console.log(`[cron] ${name} kørte — status ${res.status}`)
      } catch (e) {
        console.error(`[cron] ${name} fejlede:`, e)
      }
    }

    cron.schedule('0 8 * * *', () => runJob('new-seasons'), { timezone: 'Europe/Copenhagen' })
    console.log('[cron] new-seasons scheduleret dagligt kl. 08:00 CPH')

    // Hver 6. time + kort efter opstart, så cachen er varm efter et deploy
    cron.schedule('15 */6 * * *', () => runJob('warm-tmdb'), { timezone: 'Europe/Copenhagen' })
    setTimeout(() => runJob('warm-tmdb'), 60_000)
    console.log('[cron] warm-tmdb scheduleret hver 6. time + 60 s efter opstart')
  }
}
