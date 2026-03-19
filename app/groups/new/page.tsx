import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewGroupClient from './NewGroupClient'

export default async function NewGroupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-8">
      <NewGroupClient />
    </main>
  )
}