import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import StatusButtons from '../../components/StatusButtons'
import SlideTransition from '../../components/SlideTransition'
import BackButton from '@/app/components/BackButton'
import StickyHeader from '@/app/components/StickyHeader'
import DynamicGlow from '@/app/components/DynamicGlow'
import ExpandableText from '@/app/components/ExpandableText'
import RatingInline from '@/app/components/RatingInline'
import SimilarTitles from '@/app/components/SimilarTitles'
import TrailerButton from '@/app/components/TrailerButton'

export default async function MoviePage({
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
    `https://api.themoviedb.org/3/movie/${id}?language=en-US&append_to_response=videos`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 3600 } }
  )
  const movie = await res.json()

  const [providersRes, recRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/movie/${id}/watch/providers`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 86400 },
    }),
    fetch(`https://api.themoviedb.org/3/movie/${id}/recommendations?language=en-US`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }, next: { revalidate: 86400 },
    }),
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
      mediaType: 'movie' as const,
    }))

  let item = null
  if (ctx) {
    const { data } = await supabaseAdmin
      .from('group_watchlist_items')
      .select('*')
      .eq('tmdb_id', id)
      .eq('media_type', 'movie')
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
      .eq('media_type', 'movie')
      .is('group_id', null)
      .is('deleted_at', null)
      .single()
    item = data
  }

  const trailerKey = (movie.videos?.results || [])
    .find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key ?? null

  const poster = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null

  const backdrop = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : null

  return (
    <main className="min-h-screen bg-black relative" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      <DynamicGlow posterUrl={poster} />
      <StickyHeader
        title={movie.title}
        poster={poster}
        year={movie.release_date?.split('-')[0]}
        rating={movie.vote_average}
        tmdbId={Number(id)}
        mediaType="movie"
        isOnList={!!item}
        ctx={ctx}
      />
      <SlideTransition>
        <div className="relative h-[45vh] overflow-hidden">
          {backdrop && (
            <Image src={backdrop} alt={movie.title} fill className="object-cover opacity-75" sizes="100vw" priority />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
          <BackButton />
        </div>

        <div className="px-6 -mt-16 relative">
          <div className="flex gap-4 mb-4">
            {poster && (
              <Image src={poster} alt={movie.title} width={128} height={192} className="rounded-xl shadow-2xl flex-shrink-0" />
            )}
            <div className="flex flex-col justify-between flex-1 pb-1" style={{ minHeight: 192 }}>
              <div>
                <h1 className="text-white text-xl font-bold leading-tight mb-2">{movie.title}</h1>
                <div className="flex flex-wrap gap-2">
                  <span className="text-white/50 text-xs">{movie.release_date?.split('-')[0]}</span>
                  {movie.runtime > 0 && <span className="text-white/50 text-xs">{movie.runtime} min</span>}
                  {movie.vote_average > 0 && (
                    <span className="flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="rgba(251,191,36,1)" /></svg>
                      <span className="text-white/50 text-xs">{movie.vote_average.toFixed(1)}</span>
                    </span>
                  )}
                  {movie.genres?.slice(0, 2).map((g: { id: number; name: string }) => (
                    <span key={g.id} className="text-white/50 text-xs">{g.name}</span>
                  ))}
                </div>
              </div>
              <StatusButtons
                itemId={item?.id}
                initialStatus={item?.status as 'want' | 'watching' | 'done' | undefined}
                initialOnList={!!item}
                compact
                ctx={ctx}
                tmdbId={Number(id)}
                mediaType="movie"
                title={movie.title}
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
            <RatingInline tmdbId={Number(id)} mediaType="movie" />
          </div>

          {providers.length > 0 && (
            <div className="mb-6">
              <p className="text-white/50 text-sm mb-3">Hvor kan du se den</p>
              <div className="flex gap-3 flex-wrap">
                {providers.map((p: any) => (
                  <div
                    key={p.provider_id}
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{
                      background: 'rgba(255, 255, 255, 0.07)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Image src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} width={24} height={24} className="rounded-md" />
                    <span className="text-white/70 text-sm font-medium">{p.provider_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {movie.overview && (
            <div className="mb-6">
              <ExpandableText text={movie.overview} />
            </div>
          )}

          <SimilarTitles items={similar} ctx={ctx} />

        </div>
      </SlideTransition>
    </main>
  )
}