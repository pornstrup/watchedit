import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'want'

  const [{ data: profile }, { data: followRow }, { data: items }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, name, username, avatar_url').eq('id', id).single(),
    supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', id).maybeSingle(),
    supabaseAdmin
      .from('watchlist_items')
      .select('tmdb_id, media_type')
      .eq('owner_id', id)
      .eq('status', status)
      .is('group_id', null)
      .is('deleted_at', null)
      .order('added_at', { ascending: false })
      .limit(50),
  ])

  if (!profile) return NextResponse.json({ error: 'Bruger ikke fundet' }, { status: 404 })

  // Hent ratings for "done"-tab
  let ratingsMap: Record<string, { rating: number | null; note: string | null }> = {}
  if (status === 'done' && items && items.length > 0) {
    const { data: ratings } = await supabaseAdmin
      .from('user_content')
      .select('tmdb_id, media_type, rating, note')
      .eq('user_id', id)
      .in('tmdb_id', items.map(i => i.tmdb_id))
    ratingsMap = Object.fromEntries(
      (ratings ?? []).map(r => [`${r.tmdb_id}-${r.media_type}`, { rating: r.rating, note: r.note }])
    )
  }

  // Enrich med TMDB
  const enriched = await Promise.all(
    (items ?? []).map(async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.tmdb_id}?language=en-US`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 3600 } }
      )
      const tmdb = await res.json()
      const key = `${item.tmdb_id}-${item.media_type}`
      return {
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        title: tmdb.title || tmdb.name,
        poster: tmdb.poster_path ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}` : null,
        rating: ratingsMap[key]?.rating ?? null,
      }
    })
  )

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      avatar: profile.avatar_url,
      is_following: !!followRow,
    },
    items: enriched,
  })
}
