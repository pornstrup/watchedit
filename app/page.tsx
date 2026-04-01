import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WatchlistProvider from './components/WatchlistProvider'
import PageTransition from './components/PageTransition'
import { getTmdbItems } from '@/lib/tmdb'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawItems } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('owner_id', user.id)
    .is('group_id', null)
    .is('deleted_at', null)
    .order('added_at', { ascending: false })

  const items = rawItems || []

  const watchingTvIds = items
    .filter((i: any) => i.media_type === 'tv' && i.status === 'watching')
    .map((i: any) => i.id)

  const [episodeCounts, tmdbMap] = await Promise.all([
    watchingTvIds.length > 0
      ? supabase
          .from('episode_progress')
          .select('watchlist_item_id')
          .in('watchlist_item_id', watchingTvIds)
          .then(({ data }) => {
            const counts: Record<string, number> = {}
            for (const row of data ?? []) {
              counts[row.watchlist_item_id] = (counts[row.watchlist_item_id] || 0) + 1
            }
            return counts
          })
      : Promise.resolve({} as Record<string, number>),
    getTmdbItems(items.map((i: any) => ({ tmdb_id: i.tmdb_id, media_type: i.media_type }))),
  ])

  const initialItems = items.map((item: any) => {
    const tmdb = tmdbMap[`${item.tmdb_id}-${item.media_type}`]
    let progress = null
    if (item.media_type === 'tv' && item.status === 'watching') {
      const totalEpisodes = tmdb?.number_of_episodes || 0
      if (totalEpisodes > 0) {
        progress = { total_episodes: totalEpisodes, watched_episodes: episodeCounts[item.id] ?? 0 }
      }
    }
    return {
      ...item,
      title: tmdb?.title ?? '',
      poster: tmdb?.poster ?? null,
      year: tmdb?.release_year ?? null,
      progress,
    }
  })

  return (
    <main className="min-h-screen bg-black flex flex-col items-center" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-md px-6 flex flex-col pt-14">
        <PageTransition>
          <WatchlistProvider userName={user.user_metadata.full_name} userId={user.id} initialItems={initialItems} />
        </PageTransition>
      </div>
    </main>
  )
}