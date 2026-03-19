import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  if (!imageUrl) return NextResponse.json({ color: '30,30,30' })

  try {
    const res = await fetch(imageUrl)
    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Find JPEG/PNG pixel data – simpel sampling
    // Vi sampler 20 pixels spredt over billedet og finder gennemsnit
    let r = 0, g = 0, b = 0, count = 0

    // Skip header bytes og sample jævnt
    const step = Math.floor(bytes.length / 20)
    for (let i = 100; i < bytes.length - 3; i += step) {
      // Undgå meget mørke og meget lyse pixels
      const pr = bytes[i], pg = bytes[i + 1], pb = bytes[i + 2]
      const brightness = (pr + pg + pb) / 3
      if (brightness > 30 && brightness < 230) {
        r += pr; g += pg; b += pb; count++
      }
    }

    if (count === 0) return NextResponse.json({ color: '30,30,30' })

    r = Math.floor(r / count)
    g = Math.floor(g / count)
    b = Math.floor(b / count)

    // Dæmp farven så den ikke er for skarp
    r = Math.floor(r * 0.7)
    g = Math.floor(g * 0.7)
    b = Math.floor(b * 0.7)

    return NextResponse.json({ color: `${r},${g},${b}` })
  } catch {
    return NextResponse.json({ color: '30,30,30' })
  }
}