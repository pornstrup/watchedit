export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
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
