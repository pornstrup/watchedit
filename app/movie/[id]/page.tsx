import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatusButtons from '../../components/StatusButtons'
import PageTransition from '../../components/PageTransition'
import BackButton from '@/app/components/BackButton'
import RemoveFromList from '@/app/components/RemoveFromList'
import StickyHeader from '@/app/components/StickyHeader'
import DynamicGlow from '@/app/components/DynamicGlow'
import ExpandableText from '@/app/components/ExpandableText'

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?language=en-US`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
  )
  const movie = await res.json()

  const providersRes = await fetch(
    `https://api.themoviedb.org/3/movie/${id}/watch/providers`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
  )
  const providersData = await providersRes.json()
  const providers = providersData.results?.DK?.flatrate || []

  const { data: item } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('owner_id', user.id)
    .eq('tmdb_id', id)
    .eq('media_type', 'movie')
    .is('deleted_at', null)
    .single()

  const poster = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null

  const backdrop = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : null

  return (
    <main className="min-h-screen bg-black pb-24 relative">
      <DynamicGlow posterUrl={poster} />
      <StickyHeader title={movie.title} />
      <PageTransition>
        <div className="relative h-72 overflow-hidden">
          {backdrop && (
            <img src={backdrop} alt={movie.title} className="w-full h-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
          <BackButton />
        </div>

        <div className="px-6 -mt-16 relative">
          <div className="flex gap-4 mb-6">
            {poster && (
              <img src={poster} alt={movie.title} className="w-24 rounded-xl shadow-2xl flex-shrink-0" />
            )}
            <div className="flex flex-col justify-end pb-1">
              <p className="text-white/40 text-xs mb-1">Film · {movie.release_date?.split('-')[0]}</p>
              <h1 className="text-white text-xl font-bold leading-tight">{movie.title}</h1>
              <p className="text-white/40 text-xs mt-1">{movie.runtime} min</p>
            </div>
          </div>

          {item && (
            <div className="mb-6">
              <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Status</p>
              <StatusButtons itemId={item.id} initialStatus={item.status as 'want' | 'watching' | 'done'} />
            </div>
          )}

          {providers.length > 0 && (
            <div className="mb-6">
              <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Hvor kan du se den</p>
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
                    <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} className="w-6 h-6 rounded-md" />
                    <span className="text-white/70 text-sm font-medium">{p.provider_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {movie.overview && (
  <div className="mb-6">
    <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Handling</p>
    <ExpandableText text={movie.overview} />
  </div>
)}

          {item && (
            <div className="mb-6">
              <RemoveFromList tmdbId={Number(id)} mediaType="movie" />
            </div>
          )}
        </div>
      </PageTransition>
    </main>
  )
}