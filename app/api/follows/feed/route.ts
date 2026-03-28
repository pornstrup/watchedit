import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getTmdbItems } from '@/lib/tmdb'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  // Hvem følger jeg?
  const { data: followingRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (followingRows ?? []).map(f => f.following_id)

  if (followingIds.length === 0) return NextResponse.json({ items: [] })

  // Hent deres seneste user_content (set + rating)
  const { data: content } = await supabaseAdmin
    .from('user_content')
    .select('user_id, tmdb_id, media_type, rating, note, updated_at')
    .in('user_id', followingIds)
    .eq('watched', true)
    .order('updated_at', { ascending: false })
    .limit(40)

  if (!content || content.length === 0) return NextResponse.json({ items: [] })

  // Hent profiler
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, username, avatar_url')
    .in('id', followingIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  // Hent TMDB-data for unikke film/serier via cache
  const uniqueTmdb = [...new Map(content.map(c => [`${c.tmdb_id}-${c.media_type}`, c])).values()]
  const tmdbMap = await getTmdbItems(uniqueTmdb.map(c => ({ tmdb_id: c.tmdb_id, media_type: c.media_type })))

  const items = content.map(c => {
    const profile = profileMap[c.user_id]
    const tmdb = tmdbMap[`${c.tmdb_id}-${c.media_type}`]
    return {
      user_id: c.user_id,
      user_name: profile?.name ?? 'Ukendt',
      user_username: profile?.username ?? null,
      user_avatar: profile?.avatar_url ?? null,
      tmdb_id: c.tmdb_id,
      media_type: c.media_type,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      rating: c.rating,
      note: c.note,
      watched_at: c.updated_at,
    }
  })

  return NextResponse.json({ items })
}
