import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/auth'
import { requireGroupMember } from '@/lib/groups'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const notMember = await requireGroupMember(id, user.id)
  if (notMember) return notMember

  const { data: members, error } = await supabase
    .from('group_members')
    .select(`
      user_id,
      role,
      joined_at,
      profiles (
        id,
        name,
        avatar_url
      )
    `)
    .eq('group_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ members: members.map(m => ({ ...m.profiles, role: m.role })) })
}