import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/join/${token}`)
  }

  // Find invite
  const { data: invite } = await supabaseAdmin
    .from('group_invites')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    redirect('/?error=invite_invalid')
  }

  // Tjek om allerede medlem
  const { data: existing } = await supabaseAdmin
    .from('group_members')
    .select('user_id')
    .eq('group_id', invite.group_id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabaseAdmin
      .from('group_members')
      .insert({ group_id: invite.group_id, user_id: user.id, role: 'member' })

    await supabaseAdmin
      .from('group_invites')
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq('id', invite.id)
  }

  redirect(`/?joined=${invite.group_id}`)
}