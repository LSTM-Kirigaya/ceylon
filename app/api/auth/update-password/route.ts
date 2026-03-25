import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const password = typeof body.password === 'string' ? body.password : ''

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Password updated successfully. Please login with your new password.',
    })
  } catch (e) {
    console.error('update-password error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
