import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const body = await request.json()
  const { tmdb_id, media_type } = body

  // Tjek om der findes et soft-deleted item
  const { data: existing } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('owner_id', user.id)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)
    .not('deleted_at', 'is', null)
    .single()

  if (existing) {
    // Tjek om der er episode progress
    const { count } = await supabase
      .from('episode_progress')
      .select('*', { count: 'exact', head: true })
      .eq('watchlist_item_id', existing.id)

    const status = (count && count > 0) ? 'watching' : 'want'

    const { data, error } = await supabase
      .from('watchlist_items')
      .update({ deleted_at: null, status })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Opret nyt item
  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({
      owner_id: user.id,
      tmdb_id,
      media_type,
      status: 'want',
      visibility: 'private'
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { tmdb_id, media_type } = await request.json()

  const { error } = await supabase
    .from('watchlist_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('owner_id', user.id)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}