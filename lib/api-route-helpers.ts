import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export async function getRouteSupabaseUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { supabase, user, error }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/** System admin / super_user only (profiles.role). */
export async function requireAdmin(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; user: User; profile: Profile }
  | { ok: false; response: NextResponse }
> {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return { ok: false, response: unauthorized() }
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error || !profile) return { ok: false, response: unauthorized() }
  const role = (profile as Profile).role
  if (role !== 'admin' && role !== 'super_user') return { ok: false, response: forbidden() }
  return { ok: true, supabase, user, profile: profile as Profile }
}
