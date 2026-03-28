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

  const { data: hidden } = await supabaseAdmin
    .from('group_inspiration_hidden')
    .select('tmdb_id, media_type')
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (!hidden?.length) return NextResponse.json({ items: [] })

  const tmdbMap = await getTmdbItems(hidden.map(i => ({ tmdb_id: i.tmdb_id, media_type: i.media_type })))

  const enriched = hidden.map((item) => {
    const tmdb = tmdbMap[`${item.tmdb_id}-${item.media_type}`]
    return {
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      year: tmdb?.release_year ?? null,
    }
  })

  return NextResponse.json({ items: enriched })
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
    .from('group_inspiration_hidden')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}