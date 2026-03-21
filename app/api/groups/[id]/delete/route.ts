import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (!group || group.created_by !== user.id) {
    return NextResponse.json({ error: 'Ikke tilladt' }, { status: 403 })
  }

  // Hent alle gruppe-watchlist items så vi kan slette episode progress
  const { data: watchlistItems } = await supabaseAdmin
    .from('group_watchlist_items')
    .select('id')
    .eq('group_id', groupId)

  if (watchlistItems?.length) {
    const ids = watchlistItems.map(i => i.id)
    await supabaseAdmin.from('group_episode_progress').delete().in('group_watchlist_item_id', ids)
  }

  await supabaseAdmin.from('group_inspiration_hidden').delete().eq('group_id', groupId)
  await supabaseAdmin.from('group_watchlist_items').delete().eq('group_id', groupId)
  await supabaseAdmin.from('group_invites').delete().eq('group_id', groupId)
  await supabaseAdmin.from('group_members').delete().eq('group_id', groupId)
  await supabaseAdmin.from('groups').delete().eq('id', groupId)

  return NextResponse.json({ success: true })
}