import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, name')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    name: profile?.name || user.user_metadata.full_name,
    avatar: profile?.avatar_url || user.user_metadata.avatar_url,
    email: user.email,
  })
}