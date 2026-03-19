import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { group_id } = await request.json()

  // Slet gamle ubrugte invites til denne gruppe
  await supabase
    .from('group_invites')
    .delete()
    .eq('group_id', group_id)
    .eq('created_by', user.id)
    .is('used_at', null)

  // Opret nyt invite (token genereres af Supabase default)
  const { data: invite, error } = await supabase
    .from('group_invites')
    .insert({
      group_id,
      created_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dage
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invite.token}`

  return NextResponse.json({ url: inviteUrl, token: invite.token })
}