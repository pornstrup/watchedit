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

  // Hent alle gruppe-medlemmer
  const { data: members } = await supabaseAdmin
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)

  if (!members?.length) return NextResponse.json({ items: [] })

  const memberIds = members.map(m => m.user_id)

  // Hent hvad gruppen allerede har
  const { data: groupItems } = await supabaseAdmin
    .from('group_watchlist_items')
    .select('tmdb_id, media_type')
    .eq('group_id', groupId)
    .is('deleted_at', null)

  const groupTmdbIds = new Set(
    (groupItems || []).map(i => `${i.tmdb_id}-${i.media_type}`)
  )

  // Hent hvad brugeren har skjult
  const { data: hidden } = await supabaseAdmin
    .from('group_inspiration_hidden')
    .select('tmdb_id, media_type')
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  const hiddenSet = new Set(
    (hidden || []).map(i => `${i.tmdb_id}-${i.media_type}`)
  )

  // Hent alle medlemmers personlige lister
  const { data: personalItems } = await supabaseAdmin
    .from('watchlist_items')
    .select('tmdb_id, media_type, owner_id')
    .in('owner_id', memberIds)
    .is('group_id', null)
    .is('deleted_at', null)

  if (!personalItems?.length) return NextResponse.json({ items: [] })

  // Grupper per tmdb_id+media_type og fjern duplikater + skjulte + gruppe-items
  const seen = new Map<string, { tmdb_id: number; media_type: string; member_ids: string[] }>()

  for (const item of personalItems) {
    const key = `${item.tmdb_id}-${item.media_type}`
    if (groupTmdbIds.has(key)) continue
    if (hiddenSet.has(key)) continue

    if (seen.has(key)) {
      seen.get(key)!.member_ids.push(item.owner_id)
    } else {
      seen.set(key, {
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        member_ids: [item.owner_id],
      })
    }
  }

  const uniqueItems = Array.from(seen.values())

  // Hent member-navne til at vise hvem der har dem
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name')
    .in('id', memberIds)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.name]))

  // Enrich med TMDB data
  const enriched = await Promise.all(
    uniqueItems.slice(0, 50).map(async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.tmdb_id}?language=en-US`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
      )
      const tmdb = await res.json()

      return {
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        title: tmdb.title || tmdb.name,
        poster: tmdb.poster_path ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}` : null,
        year: (tmdb.release_date || tmdb.first_air_date)?.split('-')[0],
        members: item.member_ids.map(id => profileMap[id] || 'Ukendt'),
      }
    })
  )

  return NextResponse.json({ items: enriched })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { tmdb_id, media_type } = await request.json()

  const { error } = await supabaseAdmin
    .from('group_inspiration_hidden')
    .insert({
      group_id: groupId,
      user_id: user.id,
      tmdb_id,
      media_type,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}