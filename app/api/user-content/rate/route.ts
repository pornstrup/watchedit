import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { tmdb_id, media_type, rating, note } = await request.json()

  if (!tmdb_id || !media_type) {
    return NextResponse.json({ error: 'tmdb_id og media_type er påkrævet' }, { status: 400 })
  }

  const row: Record<string, unknown> = {
    user_id: user.id,
    tmdb_id,
    media_type,
    watched: true,
    watched_at: new Date().toISOString(),
  }

  if (rating != null) row.rating = rating
  if (note != null && note !== '') row.note = note

  const { error } = await supabase
    .from('user_content')
    .upsert(row, { onConflict: 'user_id,tmdb_id,media_type' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
