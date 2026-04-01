import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/ratings?tmdb_id=X&media_type=Y
// Returnerer: din egen rating + følgeres ratings + fremmede med høje ratings
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tmdb_id = searchParams.get('tmdb_id')
  const media_type = searchParams.get('media_type')
  if (!tmdb_id || !media_type) return NextResponse.json({ error: 'Mangler parametre' }, { status: 400 })

  // Din egen rating + hvem følger jeg — parallelst
  const [{ data: own }, { data: followingRows }] = await Promise.all([
    supabase.from('user_content').select('rating, note').eq('user_id', user.id).eq('tmdb_id', tmdb_id).eq('media_type', media_type).maybeSingle(),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
  ])

  const followingIds = (followingRows ?? []).map(f => f.following_id)

  // Hent vennernes ratings + fremmedes top-8 parallelt (i stedet for alle globalt)
  const baseQuery = supabaseAdmin
    .from('user_content')
    .select('user_id, rating, note')
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)
    .eq('watched', true)
    .not('rating', 'is', null)

  const [{ data: friendContent }, { data: strangerContent }] = await Promise.all([
    followingIds.length > 0
      ? baseQuery.in('user_id', followingIds).order('rating', { ascending: false })
      : Promise.resolve({ data: [] as { user_id: string; rating: number; note: string | null }[] }),
    baseQuery
      .not('user_id', 'in', `(${[user.id, ...followingIds].join(',')})`)
      .order('rating', { ascending: false })
      .limit(8),
  ])

  if ((!friendContent || friendContent.length === 0) && (!strangerContent || strangerContent.length === 0)) {
    return NextResponse.json({ own_rating: own?.rating ?? null, own_note: own?.note ?? null, others: [], strangers: [] })
  }

  // Hent profiler for begge grupper samlet
  const allUserIds = [...(friendContent ?? []).map(c => c.user_id), ...(strangerContent ?? []).map(c => c.user_id)]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, username, avatar_url, searchable')
    .in('id', allUserIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const toCard = (c: { user_id: string; rating: number; note: string | null }) => ({
    user_id: c.user_id,
    name: profileMap[c.user_id]?.name ?? 'Ukendt',
    username: profileMap[c.user_id]?.username ?? null,
    avatar: profileMap[c.user_id]?.avatar_url ?? null,
    rating: c.rating,
    note: c.note,
  })

  return NextResponse.json({
    own_rating: own?.rating ?? null,
    own_note: own?.note ?? null,
    others: (friendContent ?? []).map(toCard),
    strangers: (strangerContent ?? []).filter(c => profileMap[c.user_id]?.searchable).map(toCard),
  })
}
