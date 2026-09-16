import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/auth'

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}