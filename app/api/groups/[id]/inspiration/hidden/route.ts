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

  const { data: hidden } = await supabaseAdmin
    .from('group_inspiration_hidden')
    .select('tmdb_id, media_type')
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (!hidden?.length) return NextResponse.json({ items: [] })

  const enriched = await Promise.all(
    hidden.map(async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.tmdb_id}?language=en-US`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
      )
      const tmdb = await res.json()
      return {
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        title: tmdb.title || tmdb.name,
        poster: tmdb.poster_path ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}` : null,
        year: (tmdb.release_date || tmdb.first_air_date)?.split('-')[0],
      }
    })
  )

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