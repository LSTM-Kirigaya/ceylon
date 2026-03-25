import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRouteSupabaseUser } from '@/lib/api-route-helpers'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase-env'

export async function GET() {
  try {
    const { supabase, user, error } = await getRouteSupabaseUser()

    if (error || !user) {
      return NextResponse.json({ user: null, profile: null })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // If profile row is missing (or blocked), try to self-heal using service role.
    // Note: some PostgREST clients still return an error for 0 rows; don't gate on `profErr`.
    if (!profile) {
      const admin = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())
      const { data: up, error: upErr } = await admin
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email ?? '',
            display_name:
              (user.user_metadata && typeof user.user_metadata.display_name === 'string'
                ? user.user_metadata.display_name
                : null) ?? (user.email ?? null),
            avatar_url:
              user.user_metadata && typeof user.user_metadata.avatar_url === 'string'
                ? user.user_metadata.avatar_url
                : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select('*')
        .maybeSingle()

      if (!upErr && up) {
        return NextResponse.json({ user, profile: up })
      }
    }

    return NextResponse.json({
      user,
      profile: profile ?? null,
    })
  } catch (e) {
    console.error('auth/session', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
