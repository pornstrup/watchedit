import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { watchlist_item_id, season_number, episode_number } = await request.json()

  const { error } = await supabase
    .from('episode_progress')
    .upsert({ watchlist_item_id, season_number, episode_number })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { watchlist_item_id, season_number, episode_number } = await request.json()

  const { error } = await supabase
    .from('episode_progress')
    .delete()
    .eq('watchlist_item_id', watchlist_item_id)
    .eq('season_number', season_number)
    .eq('episode_number', episode_number)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}