import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewGroupClient from './NewGroupClient'
import { getAuthUser } from '@/lib/supabase/auth'

export default async function NewGroupPage() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-8">
      <NewGroupClient />
    </main>
  )
}