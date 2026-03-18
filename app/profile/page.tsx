import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from '../components/ProfileClient'
import PageTransition from '../components/PageTransition'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-black pb-24">
      <div className="w-full max-w-md mx-auto px-6 pt-14">
        <PageTransition>
          <ProfileClient
            name={user.user_metadata.full_name}
            avatar={user.user_metadata.avatar_url}
            email={user.email || ''}
          />
        </PageTransition>
      </div>
    </main>
  )
}