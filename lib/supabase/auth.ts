import type { SupabaseClient, UserMetadata } from '@supabase/supabase-js'

export type AuthUser = {
  id: string
  email: string | undefined
  user_metadata: UserMetadata
}

// Læser brugeren fra JWT'en i cookien. Signaturen verificeres lokalt mod
// Supabase's offentlige nøgle (JWKS, caches 10 min) — ingen netværkskald
// til Supabase Auth pr. request, modsat auth.getUser().
// Udløbet token fornyes automatisk af getClaims() via refresh-token.
export async function getAuthUser(supabase: SupabaseClient): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null

  const { claims } = data
  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata ?? {},
  }
}
