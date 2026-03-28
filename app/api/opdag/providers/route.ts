import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const KEY = process.env.TMDB_API_KEY

function tmdb(path: string, revalidate = 43200) {
  return fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
    next: { revalidate },
  }).then(r => r.json())
}

function mapItems(results: any[], mediaType: 'movie' | 'tv', limit = 6) {
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
  if (!user) return NextResponse.json({ sections: [] })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('streaming_services')
    .eq('id', user.id)
    .single()

  const streamingIds: number[] = profile?.streaming_services || []
  if (streamingIds.length === 0) return NextResponse.json({ sections: [] })

  const [providerMeta, ...discoverResults] = await Promise.all([
    tmdb('/watch/providers/movie?watch_region=DK', 86400),
    ...streamingIds.flatMap(id => [
      tmdb(`/discover/movie?with_watch_providers=${id}&watch_region=DK&sort_by=popularity.desc&language=en-US`),
      tmdb(`/discover/tv?with_watch_providers=${id}&watch_region=DK&sort_by=popularity.desc&language=en-US`),
    ]),
  ])

  const providerLookup: Record<number, { name: string; logo: string }> = {}
  for (const p of providerMeta.results || []) {
    if (p.logo_path) {
      providerLookup[p.provider_id] = {
        name: p.provider_name,
        logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
      }
    }
  }

  const sections = streamingIds.flatMap((id, i) => {
    const provider = providerLookup[id]
    if (!provider) return []
    const movies = mapItems(discoverResults[i * 2]?.results, 'movie')
    const tv = mapItems(discoverResults[i * 2 + 1]?.results, 'tv')
    const interleaved = []
    for (let j = 0; j < Math.max(movies.length, tv.length); j++) {
      if (movies[j]) interleaved.push(movies[j])
      if (tv[j]) interleaved.push(tv[j])
    }
    if (interleaved.length === 0) return []
    return [{
      id: `provider-${id}`,
      title: `Ny på ${provider.name}`,
      providerLogo: provider.logo,
      items: interleaved.slice(0, 10),
    }]
  })

  return NextResponse.json({ sections })
}
