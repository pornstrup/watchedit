import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatusButtons from '../../components/StatusButtons'
import EpisodeTracker from '../../components/EpisodeTracker'

export default async function TVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: item } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('owner_id', user.id)
    .eq('tmdb_id', id)
    .eq('media_type', 'tv')
    .single()

  const { data: episodeProgress } = await supabase
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
    <main className="min-h-screen bg-black">

      {/* HERO */}
      <div className="relative h-72 overflow-hidden">
        {backdrop && (
          <img src={backdrop} alt={show.name} className="w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
        <a href="/" className="absolute top-14 left-6 text-white/60 text-sm font-medium">← Tilbage</a>
      </div>

      {/* INDHOLD */}
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

        {/* STATUS */}
        {item && (
          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Status</p>
            <StatusButtons itemId={item.id} initialStatus={item.status as 'want' | 'watching' | 'done'} />
          </div>
        )}

        {/* STREAMING */}
        {providers.length > 0 && (
          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Hvor kan du se den</p>
            <div className="flex gap-3 flex-wrap">
              {providers.map((p: any) => (
                <div key={p.provider_id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <img
                    src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                    alt={p.provider_name}
                    className="w-6 h-6 rounded-md"
                  />
                  <span className="text-white/70 text-sm font-medium">{p.provider_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* BESKRIVELSE */}
        {show.overview && (
          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Handling</p>
            <p className="text-white/60 text-sm leading-relaxed">{show.overview}</p>
          </div>
        )}
        {/* EPISODER */}
        {item && seasons.length > 0 && (
          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Episoder</p>
            <EpisodeTracker
              itemId={item.id}
              seasons={seasons}
              progress={episodeProgress || []}
              showId={id}
            />
          </div>
        )}

        
      </div>
    </main>
  )
}