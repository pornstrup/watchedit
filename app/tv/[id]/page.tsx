import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import TVDetailClient from '../../components/TVDetailClient'
import PageTransition from '../../components/PageTransition'
import BackButton from '../../components/BackButton'
import RemoveFromList from '../../components/RemoveFromList'
import StickyHeader from '../../components/StickyHeader'
import DynamicGlow from '../../components/DynamicGlow'

export default async function TVPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ctx?: string }>
}) {
  const { id } = await params
  const { ctx } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const res = await fetch(
    `https://api.themoviedb.org/3/tv/${id}?language=en-US`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
  )
  const show = await res.json()

  const providersRes = await fetch(
    `https://api.themoviedb.org/3/tv/${id}/watch/providers`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
  )
  const providersData = await providersRes.json()
  const providers = providersData.results?.DK?.flatrate || []

  let item = null
  if (ctx) {
    const { data } = await supabaseAdmin
      .from('group_watchlist_items')
      .select('*')
      .eq('tmdb_id', id)
      .eq('media_type', 'tv')
      .eq('group_id', ctx)
      .is('deleted_at', null)
      .single()
    item = data
  } else {
    const { data } = await supabase
      .from('watchlist_items')
      .select('*')
      .eq('owner_id', user.id)
      .eq('tmdb_id', id)
      .eq('media_type', 'tv')
      .is('group_id', null)
      .is('deleted_at', null)
      .single()
    item = data
  }

  const { data: episodeProgress } = ctx
    ? await supabaseAdmin
        .from('group_episode_progress')
        .select('season_number, episode_number')
        .eq('group_watchlist_item_id', item?.id || '')
    : await supabase
        .from('episode_progress')
        .select('*')
        .eq('watchlist_item_id', item?.id || '')

  const poster = show.poster_path
    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
    : null

  const backdrop = show.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
    : null

  const seasons = show.seasons?.filter((s: any) => s.season_number > 0) || []

  return (
    <main className="min-h-screen bg-black pb-24 relative">
      <DynamicGlow posterUrl={poster} />
      <StickyHeader title={show.name} />
      <PageTransition>
        <div className="relative h-72 overflow-hidden">
          {backdrop && (
            <img src={backdrop} alt={show.name} className="w-full h-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
          <BackButton />
        </div>

        <div className="px-6 -mt-16 relative">
          <div className="flex gap-4 mb-6">
            {poster && (
              <img src={poster} alt={show.name} className="w-24 rounded-xl shadow-2xl flex-shrink-0" />
            )}
            <div className="flex flex-col justify-end pb-1">
              <p className="text-white/40 text-xs mb-1">Serie · {show.first_air_date?.split('-')[0]}</p>
              <h1 className="text-white text-xl font-bold leading-tight">{show.name}</h1>
              <p className="text-white/40 text-xs mt-1">{show.number_of_seasons} sæsoner · {show.number_of_episodes} episoder</p>
            </div>
          </div>

          {item && (
            <TVDetailClient
              item={{ id: item.id }}
              seasons={seasons}
              episodeProgress={episodeProgress || []}
              showId={id}
              initialStatus={item.status}
              providers={providers}
              overview={show.overview}
              ctx={ctx}
            />
          )}

          {item && (
            <div className="mb-6">
              <RemoveFromList tmdbId={Number(id)} mediaType="tv" groupId={ctx} />
            </div>
          )}
        </div>
      </PageTransition>
    </main>
  )
}