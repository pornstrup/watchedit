import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { data: followingRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const ids = (followingRows ?? []).map(f => f.following_id)
  if (ids.length === 0) return NextResponse.json({ users: [] })

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, username, avatar_url')
    .in('id', ids)

  return NextResponse.json({
    users: (profiles ?? []).map(p => ({
      id: p.id,
      name: p.name,
      username: p.username,
      avatar: p.avatar_url,
      is_following: true,
    }))
  })
}
