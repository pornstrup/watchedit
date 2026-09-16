import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTmdbItems } from '@/lib/tmdb'

// Holder TMDB-cachen på serveren varm for alle titler på brugernes lister,
// så ingen bruger venter på TMDB — heller ikke lige efter et deploy.
export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()

  const [personal, group] = await Promise.all([
    supabaseAdmin.from('watchlist_items').select('tmdb_id, media_type').is('deleted_at', null),
    supabaseAdmin.from('group_watchlist_items').select('tmdb_id, media_type').is('deleted_at', null),
  ])

  if (personal.error || group.error) {
    return NextResponse.json({ error: (personal.error ?? group.error)!.message }, { status: 500 })
  }

  const items = [...(personal.data ?? []), ...(group.data ?? [])]
  const result = await getTmdbItems(items)

  return NextResponse.json({
    titles: new Set(items.map(i => `${i.tmdb_id}-${i.media_type}`)).size,
    warmed: Object.keys(result).length,
    ms: Date.now() - started,
  })
}
