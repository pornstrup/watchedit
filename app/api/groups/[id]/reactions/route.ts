import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  // Hent alle item-IDs for gruppen
  const { data: items } = await supabaseAdmin
    .from('group_watchlist_items')
    .select('id')
    .eq('group_id', groupId)
    .is('deleted_at', null)

  const itemIds = (items || []).map(i => i.id)
  if (itemIds.length === 0) return NextResponse.json({ reactions: {} })

  const { data: reactions } = await supabaseAdmin
    .from('group_reactions')
    .select('group_watchlist_item_id, user_id')
    .in('group_watchlist_item_id', itemIds)

  // Gruppér per item
  const result: Record<string, { count: number; userReacted: boolean }> = {}
  for (const r of (reactions || [])) {
    const key = r.group_watchlist_item_id
    if (!result[key]) result[key] = { count: 0, userReacted: false }
    result[key].count++
    if (r.user_id === user.id) result[key].userReacted = true
  }

  return NextResponse.json({ reactions: result })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { item_id } = await req.json()

  const { error } = await supabaseAdmin
    .from('group_reactions')
    .upsert({ group_watchlist_item_id: item_id, user_id: user.id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { item_id } = await req.json()

  const { error } = await supabaseAdmin
    .from('group_reactions')
    .delete()
    .eq('group_watchlist_item_id', item_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
