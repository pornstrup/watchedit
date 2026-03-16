import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.log('Auth fejl:', authError)
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  console.log('Bruger ID:', user.id)

  const body = await request.json()
  const { tmdb_id, media_type } = body

  console.log('Indsætter:', { owner_id: user.id, tmdb_id, media_type })

  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({
      owner_id: user.id,
      tmdb_id,
      media_type,
      status: 'want',
      visibility: 'private'
    })
    .select()
    .single()

  if (error) {
    console.log('Database fejl:', error)
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }

  return NextResponse.json({ data })
}