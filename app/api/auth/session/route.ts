import { NextResponse } from 'next/server'
import { getRouteSupabaseUser } from '@/lib/api-route-helpers'

export async function GET() {
  try {
    const { supabase, user, error } = await getRouteSupabaseUser()

    if (error || !user) {
      return NextResponse.json({ user: null, profile: null })
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    return NextResponse.json({
      user,
      profile: profile ?? null,
    })
  } catch (e) {
    console.error('auth/session', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
