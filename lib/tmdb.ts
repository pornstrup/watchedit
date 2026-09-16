import { unstable_cache } from 'next/cache'
import { SLOW_CALL_MS } from '@/lib/timing'

// Data holdes friskt i 24 timer. Derefter returneres den gamle værdi straks,
// mens en ny hentes i baggrunden (stale-while-revalidate) — brugeren venter aldrig.
// Cachen ligger på app-serveren (Next.js data cache), ikke i Supabase, så et
// opslag koster ingen database-rundtur. Cron'en /api/cron/warm-tmdb holder den varm.
const REVALIDATE_SECONDS = 60 * 60 * 24

// Max samtidige TMDB-kald ved kold cache (TMDB tillader ca. 50 req/s)
const MAX_PARALLEL = 10

export type TmdbItem = {
  title: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  genres: { id: number; name: string }[]
  runtime: number | null
  release_year: string | null
  vote_average: number | null
  number_of_episodes: number | null
  number_of_seasons: number | null
  last_season_aired: number | null
  tmdb_status: string | null
}

async function fetchTmdbItem(tmdb_id: number, media_type: string): Promise<TmdbItem> {
  const type = media_type === 'movie' ? 'movie' : 'tv'
  const started = performance.now()
  const res = await fetch(
    `https://api.themoviedb.org/3/${type}/${tmdb_id}?language=en-US`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, cache: 'no-store' }
  )
  const ms = Math.round(performance.now() - started)
  if (ms >= SLOW_CALL_MS) console.warn(`[slow] tmdb ${type}/${tmdb_id} ${res.status} ${ms}ms`)
  // Kast ved fejl, så et fejlsvar aldrig bliver gemt i cachen
  if (!res.ok) throw new Error(`TMDB ${type}/${tmdb_id} svarede ${res.status}`)
  const tmdb = await res.json()

  return {
    title: tmdb.title || tmdb.name || '',
    poster: tmdb.poster_path ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}` : null,
    backdrop: tmdb.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdb.backdrop_path}` : null,
    overview: tmdb.overview || null,
    genres: tmdb.genres || [],
    runtime: tmdb.runtime || tmdb.episode_run_time?.[0] || null,
    release_year: (tmdb.release_date || tmdb.first_air_date)?.split('-')[0] || null,
    vote_average: tmdb.vote_average || null,
    number_of_episodes: tmdb.number_of_episodes || null,
    number_of_seasons: tmdb.number_of_seasons ?? null,
    last_season_aired: tmdb.last_episode_to_air?.season_number ?? null,
    tmdb_status: tmdb.status ?? null,
  }
}

// Henter én titel. Kaster hvis TMDB fejler og intet ligger i cachen.
export const getTmdbItem = unstable_cache(fetchTmdbItem, ['tmdb-item-v2'], {
  revalidate: REVALIDATE_SECONDS,
  tags: ['tmdb'],
})

// Batch-version til endpoints der henter mange items på én gang.
// Titler der ikke kan hentes udelades fra resultatet (kalderne bruger `tmdb?.`).
export async function getTmdbItems(
  items: { tmdb_id: number; media_type: string }[]
): Promise<Record<string, TmdbItem>> {
  const result: Record<string, TmdbItem> = {}

  // Dedupliker — samme titel kan optræde flere gange
  const unique = [...new Map(items.map(i => [`${i.tmdb_id}-${i.media_type}`, i])).values()]

  let next = 0
  const worker = async () => {
    while (next < unique.length) {
      const item = unique[next++]
      try {
        result[`${item.tmdb_id}-${item.media_type}`] = await getTmdbItem(item.tmdb_id, item.media_type)
      } catch (e) {
        console.error('[tmdb]', e instanceof Error ? e.message : e)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL, unique.length) }, worker))

  return result
}
