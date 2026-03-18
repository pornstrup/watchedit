import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SearchPage from '../components/SearchPage'
import PageTransition from '../components/PageTransition'

export default async function Search() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-black pb-24">
      <div className="w-full max-w-md mx-auto px-6 pt-14">
        <PageTransition>
          <SearchPage />
        </PageTransition>
      </div>
    </main>
  )
}