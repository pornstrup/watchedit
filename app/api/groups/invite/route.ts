import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { group_id } = await request.json()

  // Tjek om der allerede er et gyldigt token
  const { data: existing } = await supabaseAdmin
    .from('group_invites')
    .select()
    .eq('group_id', group_id)
    .eq('created_by', user.id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existing) {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${existing.token}`
    return NextResponse.json({ url: inviteUrl, token: existing.token })
  }

  // Slet udløbne og lav nyt
  await supabaseAdmin
    .from('group_invites')
    .delete()
    .eq('group_id', group_id)
    .eq('created_by', user.id)

  const { data: invite, error } = await supabaseAdmin
    .from('group_invites')
    .insert({
      group_id,
      created_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invite.token}`
  return NextResponse.json({ url: inviteUrl, token: invite.token })
}