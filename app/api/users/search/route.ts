import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2)
    return NextResponse.json({ users: [] })

  // Søg på username (case-insensitive prefix-match) — kun searchable brugere
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('id, name, username, avatar_url')
    .eq('searchable', true)
    .ilike('username', `${q}%`)
    .neq('id', user.id)
    .limit(10)

  // Hent hvem jeg allerede følger for at vise følg/unfolg korrekt
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = new Set(following?.map(f => f.following_id) ?? [])

  return NextResponse.json({
    users: (users ?? []).map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      avatar: u.avatar_url,
      is_following: followingIds.has(u.id),
    }))
  })
}
