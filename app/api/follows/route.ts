import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/follows — hent hvem jeg følger + mine følgere
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const [{ data: following }, { data: followers }] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
    supabase.from('follows').select('follower_id').eq('following_id', user.id),
  ])

  return NextResponse.json({
    following: following?.map(f => f.following_id) ?? [],
    followers_count: followers?.length ?? 0,
    following_count: following?.length ?? 0,
  })
}

// POST /api/follows — følg en bruger
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { user_id } = await req.json()
  if (!user_id || user_id === user.id)
    return NextResponse.json({ error: 'Ugyldigt bruger-id' }, { status: 400 })

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: user_id })

  if (error && error.code !== '23505')
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/follows — unfolg en bruger
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { user_id } = await req.json()

  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', user_id)

  return NextResponse.json({ ok: true })
}
