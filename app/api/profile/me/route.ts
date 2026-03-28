import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, name, username, searchable')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    name: profile?.name || user.user_metadata.full_name,
    avatar: profile?.avatar_url || user.user_metadata.avatar_url,
    email: user.email,
    username: profile?.username || null,
    searchable: profile?.searchable ?? true,
  })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if ('username' in body) updates.username = body.username || null
  if ('searchable' in body) updates.searchable = body.searchable

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Ingen felter at opdatere' }, { status: 400 })

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505')
      return NextResponse.json({ error: 'Username er allerede taget' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}