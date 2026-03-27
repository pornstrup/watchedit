import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

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

  // Hent episode-counts for alle 'watching' TV-items på én gang
  const watchingTvIds = items
    .filter(i => i.media_type === 'tv' && i.status === 'watching')
    .map(i => i.id)

  const episodeCounts: Record<string, number> = {}
  if (watchingTvIds.length > 0) {
    await Promise.all(
      watchingTvIds.map(async (id) => {
        const { count } = await supabaseAdmin
          .from('group_episode_progress')
          .select('*', { count: 'exact', head: true })
          .eq('group_watchlist_item_id', id)
        episodeCounts[id] = count || 0
      })
    )
  }

  const enriched = await Promise.all(
    items.map(async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.tmdb_id}?language=en-US`,
        {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
          next: { revalidate: 3600 },
        }
      )
      const tmdb = await res.json()

      let progress = null
      if (item.media_type === 'tv' && item.status === 'watching') {
        const totalEpisodes = tmdb.number_of_episodes || 0
        if (totalEpisodes > 0) {
          progress = { total_episodes: totalEpisodes, watched_episodes: episodeCounts[item.id] ?? 0 }
        }
      }

      return {
        ...item,
        title: tmdb.title || tmdb.name,
        poster: tmdb.poster_path ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}` : null,
        year: (tmdb.release_date || tmdb.first_air_date)?.split('-')[0],
        progress,
      }
    })
  )

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