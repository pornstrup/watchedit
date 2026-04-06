import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PROVIDER_NAMES: Record<number, string> = {
  8: 'Netflix',
  337: 'Disney+',
  119: 'Amazon Prime',
  384: 'HBO Max',
  2: 'Apple TV+',
  531: 'Paramount+',
  283: 'Crunchyroll',
}

type Suggestion = {
  title: string
  media_type: string
  reason?: string
}

function extractSuggestions(text: string): Suggestion[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const arrayText = fenced?.[1] || text.match(/\[[\s\S]*\]/)?.[0] || ''
  if (!arrayText) return []

  try {
    const parsed = JSON.parse(arrayText) as unknown
    if (!Array.isArray(parsed)) return []
    const items: Array<Suggestion | null> = parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const candidate = item as Record<string, unknown>
        const title = typeof candidate.title === 'string' ? candidate.title.trim() : ''
        const mediaType = typeof candidate.media_type === 'string' ? candidate.media_type.trim() : ''
        const reason = typeof candidate.reason === 'string' ? candidate.reason.trim() : undefined
        if (!title || !mediaType) return null
        return { title, media_type: mediaType, reason }
      })
    return items.filter((item): item is Suggestion => item !== null)
  } catch {
    return []
  }
}

async function searchTmdbSuggestion(
  title: string,
  preferredType?: string
): Promise<{
  tmdb_id: number
  media_type: string
  title: string
  year: string
  poster: string | null
} | null> {
  const endpoints = [
    `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}`,
    `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=en-US`,
  ]

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } })
    if (!res.ok) continue
    const data = await res.json()
    const results = Array.isArray(data.results) ? data.results : []
    const typed = preferredType
      ? results.find((r: { media_type?: string }) => r.media_type === preferredType)
      : null
    const hit = typed || results.find((r: { media_type?: string }) => r.media_type === 'movie' || r.media_type === 'tv')
    if (!hit) continue

    return {
      tmdb_id: hit.id,
      media_type: hit.media_type,
      title: hit.title || hit.name,
      year: (hit.release_date || hit.first_air_date)?.split('-')[0] ?? '',
      poster: hit.poster_path ? `https://image.tmdb.org/t/p/w300${hit.poster_path}` : null,
    }
  }

  return null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  // Hent ratings, watchlist og profil parallelt
  const [ratedResult, watchlistResult, profileResult] = await Promise.all([
    supabase
      .from('user_content')
      .select('tmdb_id, media_type, rating, note')
      .eq('user_id', user.id)
      .not('rating', 'is', null)
      .order('rating', { ascending: false })
      .limit(20),
    supabase
      .from('watchlist_items')
      .select('tmdb_id, media_type, status')
      .eq('owner_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('profiles')
      .select('streaming_services')
      .eq('id', user.id)
      .single(),
  ])

  const rated = ratedResult.data || []
  const watchlist = watchlistResult.data || []
  const streamingIds: number[] = profileResult.data?.streaming_services || []

  const hasSignal = rated.length > 0 || watchlist.length > 0 || streamingIds.length > 0
  if (!hasSignal) {
    return NextResponse.json({ recommendations: [] })
  }

  // Hent titler + genredata fra tmdb_cache
  const { data: cached } = await supabase
    .from('tmdb_cache')
    .select('tmdb_id, media_type, title, data')
    .in('tmdb_id', rated.map(r => r.tmdb_id))

  const cacheMap: Record<string, { title: string; genres: string }> = {}
  for (const c of cached || []) {
    const genres = (c.data?.genres as { name: string }[] | undefined)
      ?.slice(0, 2).map((g: { name: string }) => g.name).join('/') ?? ''
    cacheMap[`${c.tmdb_id}-${c.media_type}`] = { title: c.title, genres }
  }

  const onList = new Set((watchlist).map(w => `${w.tmdb_id}-${w.media_type}`))

  // Want-liste til svagt signal (hvis færre end 5 ratings)
  let wantLines = ''
  if (rated.length < 5) {
    const wantItems = watchlist.filter(w => w.status === 'want').slice(0, 5)
    const wantTmdbIds = wantItems.map(w => w.tmdb_id)
    if (wantTmdbIds.length > 0) {
      const { data: wantCached } = await supabase
        .from('tmdb_cache')
        .select('tmdb_id, media_type, title')
        .in('tmdb_id', wantTmdbIds)
      const wantTitleMap: Record<string, string> = {}
      for (const c of wantCached || []) {
        wantTitleMap[`${c.tmdb_id}-${c.media_type}`] = c.title
      }
      wantLines = wantItems
        .map(w => {
          const title = wantTitleMap[`${w.tmdb_id}-${w.media_type}`]
          const type = w.media_type === 'tv' ? 'serie' : 'film'
          return title ? `- ${title} [${type}]` : null
        })
        .filter(Boolean)
        .join('\n')
    }
  }

  // Byg prompt-linjer med genrer og noter
  const ratedLines = rated
    .filter(r => cacheMap[`${r.tmdb_id}-${r.media_type}`])
    .slice(0, 12)
    .map(r => {
      const { title, genres } = cacheMap[`${r.tmdb_id}-${r.media_type}`]
      const type = r.media_type === 'tv' ? 'serie' : 'film'
      const genrePart = genres ? ` {${genres}}` : ''
      const notePart = (r.note && r.rating >= 4)
        ? ` — "${r.note.trim().slice(0, 30)}"` : ''
      return `- ${title} (${r.rating}★) [${type}]${genrePart}${notePart}`
    })
    .join('\n')

  const excludeTitles = rated
    .map(r => cacheMap[`${r.tmdb_id}-${r.media_type}`]?.title)
    .filter(Boolean)
    .join(', ')

  const streamingLine = streamingIds
    .map(id => PROVIDER_NAMES[id])
    .filter(Boolean)
    .join(', ')

  const wantSection = wantLines
    ? `\nBrugerens ønskeliste (svagere signal):\n${wantLines}\n` : ''
  const streamingSection = streamingLine
    ? `\nBrugerens streaming-tjenester: ${streamingLine}\nPrioritér titler tilgængelige på disse tjenester, men anbefal gerne andre gode titler også.\n` : ''

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: 'Du er en film- og serieekspert. Svar KUN med et JSON array, ingen tekst før eller efter.',
    messages: [
      {
        role: 'user',
        content: `Baseret på denne brugers smag, anbefal 10 titler de sandsynligvis vil elske.

Brugerens ratings:
${ratedLines || 'Ingen ratings endnu'}
${wantSection}${streamingSection}
Undgå disse titler (allerede set eller på liste): ${excludeTitles}

Returner PRÆCIS dette JSON-format:
[{"title":"Titel på originalsprog","media_type":"tv","reason":"Kort dansk begrundelse maks 40 tegn"}]

Regler:
- Bland film og serier (medmindre smagsprofilet klart peger mod én type)
- Kun rigtige titler der eksisterer
- Brug titlen på originalsprog (engelsk/original) så TMDB kan finde den
- Begrundelsen må maks være 40 tegn`,
      },
    ],
  })

  const content = message.content
    .filter((block) => (block as { type?: string }).type === 'text')
    .map((block) => (block as { text?: string }).text || '')
    .join('\n')
  const suggestions = extractSuggestions(content)

  if (suggestions.length === 0) {
    return NextResponse.json({ recommendations: [] })
  }

  // Berig med TMDB — returnér så mange gyldige resultater som muligt
  const enriched = (await Promise.allSettled(
    suggestions.map(async (s) => {
      const hit = await searchTmdbSuggestion(s.title, s.media_type)
      if (!hit) return null
      if (onList.has(`${hit.tmdb_id}-${hit.media_type}`)) return null

      return {
        tmdb_id: hit.tmdb_id,
        media_type: hit.media_type,
        title: hit.title,
        year: hit.year,
        poster: hit.poster,
        reason: s.reason || '',
      }
    })
  ))
    .map(result => (result.status === 'fulfilled' ? result.value : null))
    .filter(Boolean)
    .slice(0, 8)

  return NextResponse.json({ recommendations: enriched })
}
