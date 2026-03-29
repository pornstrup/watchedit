import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import TVDetailClient from '../../components/TVDetailClient'
import StatusButtons from '../../components/StatusButtons'
import RatingInline from '../../components/RatingInline'
import SimilarTitles from '../../components/SimilarTitles'
import SlideTransition from '../../components/SlideTransition'
import BackButton from '../../components/BackButton'
import StickyHeader from '../../components/StickyHeader'
import DynamicGlow from '../../components/DynamicGlow'
import { getDKWebSchedule, formatDanishDate } from '@/lib/tvmaze'
import TrailerButton from '@/app/components/TrailerButton'

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
    `https://api.themoviedb.org/3/tv/${id}?language=en-US&append_to_response=external_ids,videos`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 3600 } }
  )
  const show = await res.json()

  const [providersRes, recRes, dkSchedule] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/tv/${id}/watch/providers`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 86400 },
    }),
    fetch(`https://api.themoviedb.org/3/tv/${id}/recommendations?language=en-US`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 86400 },
    }),
    getDKWebSchedule(10),
  ])
  const providersData = await providersRes.json()
  const providers = providersData.results?.DK?.flatrate || []
  const recData = await recRes.json()
  const similar = ((recData.results || []) as any[])
    .filter((r) => r.poster_path)
    .slice(0, 12)
    .map((r) => ({
      id: r.id as number,
      title: (r.title || r.name) as string,
      poster: `https://image.tmdb.org/t/p/w300${r.poster_path}`,
      year: ((r.release_date || r.first_air_date) as string | undefined)?.split('-')[0] ?? null,
      mediaType: 'tv' as const,
    }))

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

  const trailerKey = (show.videos?.results || [])
    .find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key ?? null

  const poster = show.poster_path
    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
    : null

  const backdrop = show.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
    : null

  const seasons = show.seasons?.filter((s: any) => s.season_number > 0) || []

  // Find næste afsnit på dansk streaming via TVMaze DK-kalender
  const imdbId = show.external_ids?.imdb_id ?? null
  const nextDKEpisode = imdbId
    ? dkSchedule
        .filter(e => e.show?.externals?.imdb === imdbId && e.airstamp && new Date(e.airstamp) > new Date())
        .sort((a, b) => new Date(a.airstamp!).getTime() - new Date(b.airstamp!).getTime())[0] ?? null
    : null
  const nextDKLabel = nextDKEpisode?.airstamp ? formatDanishDate(nextDKEpisode.airstamp) : null

  return (
    <main className="min-h-screen bg-black relative" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      <DynamicGlow posterUrl={poster} />
      <StickyHeader
        title={show.name}
        poster={poster}
        year={show.first_air_date?.split('-')[0]}
        rating={show.vote_average}
        tmdbId={Number(id)}
        mediaType="tv"
        isOnList={!!item}
        ctx={ctx}
      />
      <SlideTransition>
        <div className="relative h-[45vh] overflow-hidden">
          {backdrop && (
            <Image src={backdrop} alt={show.name} fill className="object-cover opacity-75" sizes="100vw" priority />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
          <BackButton />
        </div>

        <div className="px-6 -mt-16 relative">
          <div className="flex gap-4 mb-4">
            {poster && (
              <Image src={poster} alt={show.name} width={128} height={192} className="rounded-xl shadow-2xl flex-shrink-0" />
            )}
            <div className="flex flex-col justify-between flex-1 pb-1" style={{ minHeight: 192 }}>
              <div>
                <h1 className="text-white text-xl font-bold leading-tight mb-2">{show.name}</h1>
                <div className="flex flex-wrap gap-2">
                  <span className="text-white/50 text-xs">{show.first_air_date?.split('-')[0]}</span>
                  <span className="text-white/50 text-xs">{show.number_of_seasons} sæsoner</span>
                  {show.vote_average > 0 && (
                    <span className="flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="rgba(251,191,36,1)" /></svg>
                      <span className="text-white/50 text-xs">{show.vote_average.toFixed(1)}</span>
                    </span>
                  )}
                  {show.genres?.slice(0, 2).map((g: { id: number; name: string }) => (
                    <span key={g.id} className="text-white/50 text-xs">{g.name}</span>
                  ))}
                </div>
                {nextDKLabel && nextDKEpisode && (
                  <p className="text-white/50 text-xs mt-1.5">
                    → S{nextDKEpisode.season} · E{nextDKEpisode.number} · {nextDKLabel}
                  </p>
                )}
              </div>
              <StatusButtons
                itemId={item?.id}
                initialStatus={item?.status as 'want' | 'watching' | 'done' | undefined}
                initialOnList={!!item}
                compact
                ctx={ctx}
                tmdbId={Number(id)}
                mediaType="tv"
                title={show.name}
                poster={poster}
              />
            </div>
          </div>

          {trailerKey && (
            <div className="mb-4">
              <TrailerButton trailerKey={trailerKey} />
            </div>
          )}

          <div className="mb-5">
            <RatingInline tmdbId={Number(id)} mediaType="tv" />
          </div>

          <TVDetailClient
            item={item ? { id: item.id } : undefined}
            seasons={seasons}
            episodeProgress={episodeProgress || []}
            showId={id}
            initialStatus={item?.status}
            providers={providers}
            overview={show.overview}
            ctx={ctx}
            tmdbId={Number(id)}
            title={show.name}
            poster={poster}
          />

          <SimilarTitles items={similar} ctx={ctx} />

        </div>
      </SlideTransition>
    </main>
  )
}