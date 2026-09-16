import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { timedFetch, SLOW_CALL_MS } from '@/lib/timing'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: timedFetch },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  // Fornyer session-cookien hvis token er udløbet. getClaims() verificerer
  // lokalt mod JWKS i stedet for at kalde Supabase Auth på hver request.
  const started = performance.now()
  await supabase.auth.getClaims()
  const ms = Math.round(performance.now() - started)
  if (ms >= SLOW_CALL_MS) console.warn(`[slow] proxy getClaims ${request.nextUrl.pathname} ${ms}ms`)
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
