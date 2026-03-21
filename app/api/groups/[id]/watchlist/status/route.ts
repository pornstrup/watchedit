import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { item_id, status } = await request.json()

  const updateData: any = { status, updated_at: new Date().toISOString() }
  if (status === 'done') {
    updateData.set_at = new Date().toISOString()
  }

  const { error } = await supabaseAdmin
    .from('group_watchlist_items')
    .update(updateData)
    .eq('id', item_id)
    .eq('group_id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}