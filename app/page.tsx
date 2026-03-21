import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WatchlistProvider from './components/WatchlistProvider'
import PageTransition from './components/PageTransition'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-black pb-24 flex flex-col items-center">
      <div className="w-full max-w-md px-6 flex flex-col pt-14">
        <PageTransition>
          <WatchlistProvider userName={user.user_metadata.full_name} userId={user.id} />
        </PageTransition>
      </div>
    </main>
  )
}