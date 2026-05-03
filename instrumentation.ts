export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = (await import('node-cron')).default
    cron.schedule(
      '0 8 * * *',
      async () => {
        try {
          const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          const res = await fetch(`${base}/api/cron/new-seasons`, {
            headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
          })
          console.log(`[cron] new-seasons kørte — status ${res.status}`)
        } catch (e) {
          console.error('[cron] new-seasons fejlede:', e)
        }
      },
      { timezone: 'Europe/Copenhagen' }
    )
    console.log('[cron] new-seasons scheduleret dagligt kl. 08:00 CPH')
  }
}
