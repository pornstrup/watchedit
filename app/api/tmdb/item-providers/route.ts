import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') // 'movie' | 'tv'

  if (!id || !type) return NextResponse.json({ providers: [] })

  const res = await fetch(
    `https://api.themoviedb.org/3/${type}/${id}/watch/providers`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
  )
  const data = await res.json()
  const dk = data.results?.DK

  const flatrate = dk?.flatrate || []
  return NextResponse.json({
    providers: flatrate.map((p: any) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
    }))
  })
}