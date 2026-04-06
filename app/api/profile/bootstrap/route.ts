import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function tmdbProviders() {
  const KEY = process.env.TMDB_API_KEY
  return Promise.all([
    fetch('https://api.themoviedb.org/3/watch/providers/movie?watch_region=DK', {
      headers: { Authorization: `Bearer ${KEY}` },
      next: { revalidate: 86400 },
    }),
    fetch('https://api.themoviedb.org/3/watch/providers/tv?watch_region=DK', {
      headers: { Authorization: `Bearer ${KEY}` },
      next: { revalidate: 86400 },
    }),
  ]).then(async ([moviesRes, tvRes]) => {
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
    return providers
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const [profileResult, providers] = await Promise.all([
    supabase
      .from('profiles')
      .select('avatar_url, name, username, searchable, streaming_services')
      .eq('id', user.id)
      .single(),
    tmdbProviders(),
  ])

  const profile = profileResult.data

  return NextResponse.json({
    profile: {
      name: profile?.name || user.user_metadata.full_name,
      avatar: profile?.avatar_url || user.user_metadata.avatar_url,
      email: user.email,
      username: profile?.username || null,
      searchable: profile?.searchable ?? true,
      streaming_services: profile?.streaming_services || [],
    },
    providers,
  }, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    },
  })
}
