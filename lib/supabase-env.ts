/**
 * Server-side Supabase configuration (middleware, Route Handlers, server modules).
 * Prefer SUPABASE_URL / SUPABASE_ANON_KEY (no NEXT_PUBLIC_*). Legacy names are still read so existing .env keeps working until you migrate.
 */
export function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      'Set SUPABASE_URL (recommended) or NEXT_PUBLIC_SUPABASE_URL in .env.local / deployment env.'
    )
  }
  return url
}

export function getSupabaseAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      'Set SUPABASE_ANON_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local / deployment env.'
    )
  }
  return key
}

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required (server environment)')
  }
  return key
}
