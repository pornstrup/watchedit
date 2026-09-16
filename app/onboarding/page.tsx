import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from './OnboardingClient'
import { getAuthUser } from '@/lib/supabase/auth'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect('/login')

  return <OnboardingClient userName={user.user_metadata?.full_name || ''} />
}
