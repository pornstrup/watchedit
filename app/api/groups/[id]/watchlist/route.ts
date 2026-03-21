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

  const enriched = await Promise.all(
    items.map(async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.tmdb_id}?language=en-US`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
      )
      const tmdb = await res.json()

      let progress = null
      if (item.media_type === 'tv' && item.status === 'watching') {
        try {
          const tvRes = await fetch(
            `https://api.themoviedb.org/3/tv/${item.tmdb_id}?language=en-US`,
            { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
          )
          const tvData = await tvRes.json()
          const totalEpisodes = tvData.number_of_episodes || 0
          const { count: watchedCount } = await supabaseAdmin
            .from('group_episode_progress')
            .select('*', { count: 'exact', head: true })
            .eq('group_watchlist_item_id', item.id)
          if (totalEpisodes > 0) {
            progress = { total_episodes: totalEpisodes, watched_episodes: watchedCount || 0 }
          }
        } catch (err) {
          console.log('Progress error:', err)
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