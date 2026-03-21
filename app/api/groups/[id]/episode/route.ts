import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { group_watchlist_item_id, season_number, episode_number } = await request.json()

  const { error } = await supabaseAdmin
    .from('group_episode_progress')
    .upsert({
      group_watchlist_item_id,
      season_number,
      episode_number,
      marked_by: user.id,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-sæt status til 'watching' hvis den var 'want'
  await supabaseAdmin
    .from('group_watchlist_items')
    .update({ status: 'watching', updated_at: new Date().toISOString() })
    .eq('id', group_watchlist_item_id)
    .eq('status', 'want')

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { group_watchlist_item_id, season_number, episode_number } = await request.json()

  const { error } = await supabaseAdmin
    .from('group_episode_progress')
    .delete()
    .eq('group_watchlist_item_id', group_watchlist_item_id)
    .eq('season_number', season_number)
    .eq('episode_number', episode_number)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}