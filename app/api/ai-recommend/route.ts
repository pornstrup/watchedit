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

  if (rated.length < 3) {
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
${ratedLines}
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

  let suggestions: { title: string; media_type: string; reason: string }[] = []
  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (match) suggestions = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ recommendations: [] })
  }

  // Berig med TMDB — returnér op til 8 gyldige resultater
  const enriched = (await Promise.all(
    suggestions.map(async (s) => {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(s.title)}&language=da-DK`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
      )
      const data = await res.json()
      const hit = data.results?.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
      if (!hit) return null
      if (onList.has(`${hit.id}-${hit.media_type}`)) return null

      return {
        tmdb_id: hit.id,
        media_type: hit.media_type,
        title: hit.title || hit.name,
        year: (hit.release_date || hit.first_air_date)?.split('-')[0] ?? '',
        poster: hit.poster_path ? `https://image.tmdb.org/t/p/w300${hit.poster_path}` : null,
        reason: s.reason,
      }
    })
  )).filter(Boolean).slice(0, 8)

  return NextResponse.json({ recommendations: enriched })
}
