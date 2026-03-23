import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('auth/logout', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
