import { NextResponse } from 'next/server'

export async function GET() {
  const [moviesRes, tvRes] = await Promise.all([
    fetch('https://api.themoviedb.org/3/watch/providers/movie?watch_region=DK', {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      next: { revalidate: 86400 },
    }),
    fetch('https://api.themoviedb.org/3/watch/providers/tv?watch_region=DK', {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      next: { revalidate: 86400 },
    }),
  ])

  const [movies, tv] = await Promise.all([moviesRes.json(), tvRes.json()])

  const seen = new Set<number>()
  const providers: { id: number; name: string; logo: string; priority: number }[] = []

  for (const p of [...(movies.results || []), ...(tv.results || [])]) {
    if (seen.has(p.provider_id) || !p.logo_path) continue
    seen.add(p.provider_id)
    providers.push({
      id: p.provider_id,
      name: p.provider_name,
      logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
      priority: p.display_priority ?? 999,
    })
  }

  providers.sort((a, b) => a.priority - b.priority)

  return NextResponse.json({ providers })
}
