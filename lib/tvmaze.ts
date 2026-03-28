export type TVMazeEpisode = {
  id: number
  name: string
  season: number
  number: number
  airstamp: string | null
  show?: {
    id: number
    name: string
    externals?: { imdb?: string | null; thetvdb?: number | null }
    image: { medium: string; original: string } | null
  }
}

export async function getDKWebSchedule(daysAhead = 6): Promise<TVMazeEpisode[]> {
  const today = new Date()
  const fetches = Array.from({ length: daysAhead + 1 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    return fetch(`https://api.tvmaze.com/schedule/web?country=DK&date=${dateStr}`, {
      next: { revalidate: 3600 },
    }).then(r => (r.ok ? (r.json() as Promise<TVMazeEpisode[]>) : []))
  })
  const results = await Promise.all(fetches)
  return results.flat()
}

export function formatDanishDate(airstamp: string): string | null {
  const date = new Date(airstamp)
  const now = new Date()
  const diffDays = Math.round((date.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000)
  if (diffDays < 0) return null
  if (diffDays === 0) return 'i dag'
  if (diffDays === 1) return 'i morgen'
  if (diffDays <= 6) return `på ${new Date(airstamp).toLocaleDateString('da-DK', { weekday: 'long' })}`
  return new Date(airstamp).toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })
}
