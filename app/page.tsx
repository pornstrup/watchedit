import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WatchlistProvider from './components/WatchlistProvider'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6 gap-8 py-16">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-3">
          Watched<span className="text-white/30">It</span>
        </h1>
        <p className="text-white/50 text-lg">
          Velkommen, {user.user_metadata.full_name} 👋
        </p>
      </div>
      <WatchlistProvider userName={user.user_metadata.full_name} />
    </main>
  )
}