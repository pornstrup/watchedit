import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// supabaseAdmin omgår RLS — gruppe-routes skal selv sikre at brugeren er medlem.
// Returnerer en fejl-response som routen skal returnere direkte, eller null hvis adgang er ok.
export async function requireGroupMember(groupId: string, userId: string): Promise<NextResponse | null> {
  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ikke medlem af gruppen' }, { status: 403 })
  return null
}

// Item-id'er kommer fra request-body — tjek at item'et hører til gruppen i URL'en,
// ellers kan et medlem af én gruppe ændre en anden gruppes items.
export async function requireGroupItem(groupId: string, itemId: string): Promise<NextResponse | null> {
  const { data, error } = await supabaseAdmin
    .from('group_watchlist_items')
    .select('id')
    .eq('id', itemId)
    .eq('group_id', groupId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Titlen findes ikke i gruppen' }, { status: 404 })
  return null
}
