import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTmdbItem } from '@/lib/tmdb'

export async function GET(request: Request) {
  // Valider CRON_SECRET
  const auth = request.headers.get('Authorization')
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Hent alle TV-serier på brugernes lister
  const { data: items, error } = await supabaseAdmin
    .from('watchlist_items')
    .select('id, owner_id, tmdb_id, status, known_seasons')
    .eq('media_type', 'tv')
    .is('deleted_at', null)
    .in('status', ['want', 'watching', 'done'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!items || items.length === 0) return NextResponse.json({ processed: 0, new_seasons_found: 0, notifications_sent: 0 })

  // Dedupliker tmdb_ids og hent TMDB-data (max 10 parallelt)
  const uniqueIds = [...new Set(items.map(i => i.tmdb_id))]
  const tmdbMap: Record<number, { last_season_aired: number | null }> = {}

  const chunks = []
  for (let i = 0; i < uniqueIds.length; i += 10) chunks.push(uniqueIds.slice(i, i + 10))

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (tmdb_id) => {
        try {
          const data = await getTmdbItem(tmdb_id, 'tv')
          tmdbMap[tmdb_id] = { last_season_aired: data.last_season_aired }
        } catch {
          // Skip shows der ikke kan hentes
        }
      })
    )
  }

  let new_seasons_found = 0
  let notifications_sent = 0

  for (const item of items) {
    const tmdb = tmdbMap[item.tmdb_id]
    if (!tmdb || tmdb.last_season_aired === null) continue

    const actualSeason = tmdb.last_season_aired

    // BASELINE: første gang vi ser dette item
    if (item.known_seasons === null) {
      await supabaseAdmin
        .from('watchlist_items')
        .update({ known_seasons: actualSeason })
        .eq('id', item.id)
      continue
    }

    // INGEN ÆNDRING
    if (actualSeason <= item.known_seasons) continue

    // NY SÆSON FUNDET
    new_seasons_found++

    // Tjek om notifikation allerede sendt for denne sæson
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', item.owner_id)
      .eq('tmdb_id', item.tmdb_id)
      .eq('type', 'new_season')
      .filter('payload->>season_number', 'eq', String(actualSeason))
      .maybeSingle()

    if (existing) {
      // Opdater known_seasons uden at sende ny notifikation
      await supabaseAdmin
        .from('watchlist_items')
        .update({ known_seasons: actualSeason })
        .eq('id', item.id)
      continue
    }

    // Hent title og poster til notifikation
    let title = ''
    let poster: string | null = null
    try {
      const tmdbFull = await getTmdbItem(item.tmdb_id, 'tv')
      title = tmdbFull.title
      poster = tmdbFull.poster
    } catch { /* fortsæt uden titel */ }

    const backOnList = item.status === 'done'

    // Opdater watchlist_items
    if (item.status === 'done') {
      await supabaseAdmin
        .from('watchlist_items')
        .update({ status: 'want', known_seasons: actualSeason, deleted_at: null })
        .eq('id', item.id)

      // Synkroniser user_content
      await supabaseAdmin
        .from('user_content')
        .upsert(
          { user_id: item.owner_id, tmdb_id: item.tmdb_id, media_type: 'tv', on_list: true },
          { onConflict: 'user_id,tmdb_id,media_type' }
        )
    } else {
      await supabaseAdmin
        .from('watchlist_items')
        .update({ known_seasons: actualSeason })
        .eq('id', item.id)
    }

    // Opret in-app notifikation
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: item.owner_id,
        type: 'new_season',
        tmdb_id: item.tmdb_id,
        media_type: 'tv',
        payload: {
          title,
          season_number: actualSeason,
          poster,
          back_on_list: backOnList,
        },
      })

    notifications_sent++
  }

  return NextResponse.json({ processed: items.length, new_seasons_found, notifications_sent })
}
