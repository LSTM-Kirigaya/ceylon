import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Login failed' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()

    return NextResponse.json({
      user: data.user,
      session: data.session,
      profile: profile ?? null,
    })
  } catch (e) {
    console.error('auth/login', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
