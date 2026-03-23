import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET() {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  try {
    const body = await request.json()
    const patch: Record<string, unknown> = {}

    if (typeof body.display_name === 'string') patch.display_name = body.display_name.trim() || null
    if ('avatar_url' in body && (typeof body.avatar_url === 'string' || body.avatar_url === null)) {
      patch.avatar_url = body.avatar_url
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    patch.updated_at = new Date().toISOString()

    const { data, error } = await supabase.from('profiles').update(patch).eq('id', user.id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ profile: data })
  } catch (e) {
    console.error('PATCH profile', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
