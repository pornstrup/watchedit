import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getTmdbItems } from '@/lib/tmdb'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { data: items, error } = await supabaseAdmin
    .from('group_watchlist_items')
    .select('*')
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const watchingTvIds = items
    .filter(i => i.media_type === 'tv' && i.status === 'watching')
    .map(i => i.id)

  const [episodeCounts, tmdbMap] = await Promise.all([
    watchingTvIds.length > 0
      ? supabaseAdmin
          .from('group_episode_progress')
          .select('group_watchlist_item_id')
          .in('group_watchlist_item_id', watchingTvIds)
          .then(({ data }) => {
            const counts: Record<string, number> = {}
            for (const row of data ?? []) {
              counts[row.group_watchlist_item_id] = (counts[row.group_watchlist_item_id] || 0) + 1
            }
            return counts
          })
      : Promise.resolve({} as Record<string, number>),
    getTmdbItems(items.map(i => ({ tmdb_id: i.tmdb_id, media_type: i.media_type }))),
  ])

  const enriched = items.map((item) => {
    const tmdb = tmdbMap[`${item.tmdb_id}-${item.media_type}`]
    let progress = null
    if (item.media_type === 'tv' && item.status === 'watching') {
      const totalEpisodes = tmdb?.number_of_episodes || 0
      if (totalEpisodes > 0) {
        progress = { total_episodes: totalEpisodes, watched_episodes: episodeCounts[item.id] ?? 0 }
      }
    }
    return {
      ...item,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      year: tmdb?.release_year ?? null,
      progress,
    }
  })

  return NextResponse.json({ items: enriched })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { tmdb_id, media_type } = await request.json()

  // Tjek om der findes et soft-deleted item
  const { data: existing } = await supabaseAdmin
    .from('group_watchlist_items')
    .select('*')
    .eq('group_id', groupId)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)
    .not('deleted_at', 'is', null)
    .single()

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('group_watchlist_items')
      .update({ deleted_at: null, status: 'want' })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Tjek om den allerede eksisterer (ikke deleted)
  const { data: alreadyExists } = await supabaseAdmin
    .from('group_watchlist_items')
    .select('id')
    .eq('group_id', groupId)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)
    .is('deleted_at', null)
    .single()

  if (alreadyExists) {
    return NextResponse.json({ error: 'Allerede på listen' }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from('group_watchlist_items')
    .insert({
      group_id: groupId,
      tmdb_id,
      media_type,
      status: 'want',
      added_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { tmdb_id, media_type } = await request.json()

  const { error } = await supabaseAdmin
    .from('group_watchlist_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('group_id', groupId)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}