import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ results: [] })

  // Ask Claude for suggestions
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: 'Du er en filmekspert. Svar KUN med et JSON array, ingen tekst før eller efter.',
    messages: [
      {
        role: 'user',
        content: `Brugeren leder efter: "${query}"

Giv 5 forslag som JSON array med felterne: title (engelsk), media_type ("movie"/"tv"), reason (dansk, maks 55 tegn).
Eksempel: [{"title":"Inception","media_type":"movie","reason":"Mindbending thriller med lag på lag"}]`,
      },
    ],
  })

  let suggestions: { title: string; media_type: string; reason: string }[] = []
  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (match) suggestions = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ results: [] })
  }

  // Enrich each suggestion with TMDB data — parallel
  const enriched = await Promise.all(
    suggestions.map(async (s) => {
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(s.title)}&language=da-DK`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
      )
      const searchData = await searchRes.json()
      const hit = searchData.results?.find(
        (r: any) => r.media_type === 'movie' || r.media_type === 'tv'
      )
      if (!hit) return null

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

  return NextResponse.json({ results: enriched.filter(Boolean) })
}
