import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { watchlist_item_id, season_number, episode_count } = await request.json()

  const episodes = Array.from({ length: episode_count }, (_, i) => ({
    watchlist_item_id,
    season_number,
    episode_number: i + 1
  }))

  const { error } = await supabase
    .from('episode_progress')
    .upsert(episodes)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}