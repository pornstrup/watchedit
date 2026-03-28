import { supabaseAdmin } from './supabase/admin'

const CACHE_TTL_DAYS = 7

export type TmdbItem = {
  title: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  genres: { id: number; name: string }[]
  runtime: number | null
  release_year: string | null
  vote_average: number | null
}

export async function getTmdbItem(tmdb_id: number, media_type: string): Promise<TmdbItem> {
  // 1. Slå op i cache
  const { data: cached } = await supabaseAdmin
    .from('tmdb_cache')
    .select('data, cached_at')
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)
    .maybeSingle()

  if (cached) {
    const age = (Date.now() - new Date(cached.cached_at).getTime()) / (1000 * 60 * 60 * 24)
    if (age < CACHE_TTL_DAYS) {
      return cached.data as TmdbItem
    }
  }

  // 2. Hent fra TMDB
  const type = media_type === 'movie' ? 'movie' : 'tv'
  const res = await fetch(
    `https://api.themoviedb.org/3/${type}/${tmdb_id}?language=en-US`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 3600 } }
  )
  const tmdb = await res.json()

  const item: TmdbItem = {
    title: tmdb.title || tmdb.name || '',
    poster: tmdb.poster_path ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}` : null,
    backdrop: tmdb.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdb.backdrop_path}` : null,
    overview: tmdb.overview || null,
    genres: tmdb.genres || [],
    runtime: tmdb.runtime || tmdb.episode_run_time?.[0] || null,
    release_year: (tmdb.release_date || tmdb.first_air_date)?.split('-')[0] || null,
    vote_average: tmdb.vote_average || null,
  }

  // 3. Gem i cache (upsert)
  await supabaseAdmin
    .from('tmdb_cache')
    .upsert(
      { tmdb_id, media_type, data: item, cached_at: new Date().toISOString() },
      { onConflict: 'tmdb_id,media_type' }
    )

  return item
}

// Batch-version til endpoints der henter mange items på én gang
export async function getTmdbItems(
  items: { tmdb_id: number; media_type: string }[]
): Promise<Record<string, TmdbItem>> {
  if (items.length === 0) return {}

  // Hent alt der er i cachen på én gang
  const { data: cached } = await supabaseAdmin
    .from('tmdb_cache')
    .select('tmdb_id, media_type, data, cached_at')
    .in('tmdb_id', items.map(i => i.tmdb_id))

  const now = Date.now()
  const result: Record<string, TmdbItem> = {}
  const missing: { tmdb_id: number; media_type: string }[] = []

  for (const item of items) {
    const key = `${item.tmdb_id}-${item.media_type}`
    const hit = cached?.find(c => c.tmdb_id === item.tmdb_id && c.media_type === item.media_type)
    if (hit) {
      const age = (now - new Date(hit.cached_at).getTime()) / (1000 * 60 * 60 * 24)
      if (age < CACHE_TTL_DAYS) {
        result[key] = hit.data as TmdbItem
        continue
      }
    }
    missing.push(item)
  }

  if (missing.length === 0) return result

  // Hent manglende fra TMDB i parallel
  await Promise.all(
    missing.map(async (item) => {
      const key = `${item.tmdb_id}-${item.media_type}`
      result[key] = await getTmdbItem(item.tmdb_id, item.media_type)
    })
  )

  return result
}
