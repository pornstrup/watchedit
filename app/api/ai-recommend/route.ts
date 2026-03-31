import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  // Hent brugerens ratings
  const { data: rated } = await supabase
    .from('user_content')
    .select('tmdb_id, media_type, rating')
    .eq('user_id', user.id)
    .not('rating', 'is', null)
    .order('rating', { ascending: false })
    .limit(20)

  if (!rated || rated.length < 5) {
    return NextResponse.json({ recommendations: [] })
  }

  // Hent titler fra tmdb_cache for at få navne
  const keys = rated.map(r => `${r.tmdb_id}-${r.media_type}`)
  const { data: cached } = await supabase
    .from('tmdb_cache')
    .select('tmdb_id, media_type, title')
    .in('tmdb_id', rated.map(r => r.tmdb_id))

  const titleMap: Record<string, string> = {}
  for (const c of cached || []) {
    titleMap[`${c.tmdb_id}-${c.media_type}`] = c.title
  }

  // Hent watchlist for at ekskludere dem fra anbefalinger
  const { data: watchlist } = await supabase
    .from('watchlist_items')
    .select('tmdb_id, media_type')
    .eq('owner_id', user.id)
    .is('deleted_at', null)

  const onList = new Set((watchlist || []).map(w => `${w.tmdb_id}-${w.media_type}`))

  // Byg prompt
  const ratedLines = rated
    .filter(r => titleMap[`${r.tmdb_id}-${r.media_type}`])
    .slice(0, 12)
    .map(r => `- ${titleMap[`${r.tmdb_id}-${r.media_type}`]} (${r.rating}★) [${r.media_type === 'tv' ? 'serie' : 'film'}]`)
    .join('\n')

  const excludeTitles = rated
    .map(r => titleMap[`${r.tmdb_id}-${r.media_type}`])
    .filter(Boolean)
    .join(', ')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: 'Du er en film- og serieekspert. Svar KUN med et JSON array, ingen tekst før eller efter.',
    messages: [
      {
        role: 'user',
        content: `Baseret på denne brugers smag, anbefal 5 titler de sandsynligvis vil elske.

Brugerens ratings:
${ratedLines}

Undgå disse titler: ${excludeTitles}

Returner PRÆCIS dette JSON-format:
[{"title":"Titel","media_type":"tv","reason":"Kort dansk begrundelse maks 40 tegn"}]

Regler:
- Bland film og serier
- Kun rigtige titler der eksisterer
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

  // Berig med TMDB
  const enriched = await Promise.all(
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
  )

  return NextResponse.json({ recommendations: enriched.filter(Boolean) })
}
