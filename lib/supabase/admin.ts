import { createClient } from '@supabase/supabase-js'
import { timedFetch } from '@/lib/timing'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch: timedFetch } }
)
