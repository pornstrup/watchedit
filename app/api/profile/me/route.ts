import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  return NextResponse.json({
    name: user.user_metadata.full_name,
    avatar: user.user_metadata.avatar_url,
    email: user.email,
  })
}