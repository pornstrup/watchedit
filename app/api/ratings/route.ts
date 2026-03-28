import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/ratings?tmdb_id=X&media_type=Y
// Returnerer: din egen rating + følgeres ratings
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tmdb_id = searchParams.get('tmdb_id')
  const media_type = searchParams.get('media_type')
  if (!tmdb_id || !media_type) return NextResponse.json({ error: 'Mangler parametre' }, { status: 400 })

  // Din egen rating
  const { data: own } = await supabase
    .from('user_content')
    .select('rating, note')
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)
    .single()

  // Hvem følger jeg?
  const { data: followingRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (followingRows ?? []).map(f => f.following_id)

  let others: { name: string; username: string | null; avatar: string | null; rating: number; note: string | null }[] = []

  if (followingIds.length > 0) {
    const { data: content } = await supabaseAdmin
      .from('user_content')
      .select('user_id, rating, note')
      .in('user_id', followingIds)
      .eq('tmdb_id', tmdb_id)
      .eq('media_type', media_type)
      .eq('watched', true)
      .not('rating', 'is', null)

    if (content && content.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name, username, avatar_url')
        .in('id', content.map(c => c.user_id))

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

      others = content.map(c => ({
        name: profileMap[c.user_id]?.name ?? 'Ukendt',
        username: profileMap[c.user_id]?.username ?? null,
        avatar: profileMap[c.user_id]?.avatar_url ?? null,
        rating: c.rating,
        note: c.note,
      }))
    }
  }

  return NextResponse.json({
    own_rating: own?.rating ?? null,
    own_note: own?.note ?? null,
    others,
  })
}
