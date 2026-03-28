import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const KEY = process.env.TMDB_API_KEY

function tmdb(path: string, revalidate = 21600) {
  return fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
    next: { revalidate },
  }).then(r => r.json())
}

function mapItems(results: any[], mediaType: 'movie' | 'tv', limit = 8) {
  return (results || [])
    .filter((i: any) => i.poster_path)
    .slice(0, limit)
    .map((i: any) => ({
      tmdb_id: i.id as number,
      media_type: mediaType,
      title: (i.title || i.name || '') as string,
      year: ((i.release_date || i.first_air_date) as string | undefined)?.split('-')[0] ?? null,
      poster: `https://image.tmdb.org/t/p/w300${i.poster_path}`,
    }))
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('streaming_services')
    .eq('id', user.id)
    .single()

  const streamingIds: number[] = profile?.streaming_services || []

  // Paralleliser alle TMDB-kald
  const [trendingMovies, trendingTv, popularMovies, popularTv, providerMeta, ...providerResults] =
    await Promise.all([
      tmdb('/trending/movie/week?language=da-DK&region=DK'),
      tmdb('/trending/tv/week?language=da-DK&region=DK'),
      tmdb('/movie/top_rated?language=en-US&region=DK'),
      tmdb('/tv/top_rated?language=en-US&region=DK'),
      tmdb('/watch/providers/movie?watch_region=DK', 86400),
      ...streamingIds.flatMap(id => [
        tmdb(`/discover/movie?with_watch_providers=${id}&watch_region=DK&sort_by=popularity.desc&language=en-US`, 43200),
        tmdb(`/discover/tv?with_watch_providers=${id}&watch_region=DK&sort_by=popularity.desc&language=en-US`, 43200),
      ]),
    ])

  // Byg provider-lookup (id → navn + logo)
  const providerLookup: Record<number, { name: string; logo: string }> = {}
  for (const p of providerMeta.results || []) {
    if (p.logo_path) {
      providerLookup[p.provider_id] = {
        name: p.provider_name,
        logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
      }
    }
  }

  type Section = {
    id: string
    title: string
    providerLogo?: string
    items: ReturnType<typeof mapItems>
  }

  const sections: Section[] = [
    {
      id: 'trending-movies',
      title: 'Det snakkes om',
      items: mapItems(trendingMovies.results, 'movie'),
    },
    {
      id: 'trending-tv',
      title: 'Trending serier',
      items: mapItems(trendingTv.results, 'tv'),
    },
    {
      id: 'top-rated-movies',
      title: 'Højt bedømt',
      items: mapItems(popularMovies.results, 'movie'),
    },
    {
      id: 'top-rated-tv',
      title: 'Højt bedømt · Serier',
      items: mapItems(popularTv.results, 'tv'),
    },
  ]

  // Tilføj provider-sektioner
  streamingIds.forEach((id, i) => {
    const provider = providerLookup[id]
    if (!provider) return
    const movies = mapItems(providerResults[i * 2]?.results, 'movie', 6)
    const tv = mapItems(providerResults[i * 2 + 1]?.results, 'tv', 6)
    // Interleaver film og serier: m, t, m, t, ...
    const interleaved = []
    const len = Math.max(movies.length, tv.length)
    for (let j = 0; j < len; j++) {
      if (movies[j]) interleaved.push(movies[j])
      if (tv[j]) interleaved.push(tv[j])
    }
    if (interleaved.length > 0) {
      sections.push({
        id: `provider-${id}`,
        title: `Ny på ${provider.name}`,
        providerLogo: provider.logo,
        items: interleaved.slice(0, 10),
      })
    }
  })

  return NextResponse.json({ sections })
}
