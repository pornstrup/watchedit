import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from '../components/ProfileClient'
import PageTransition from '../components/PageTransition'
import { getAuthUser } from '@/lib/supabase/auth'

export default async function ProfilePage() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-black" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
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