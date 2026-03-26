import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const path = typeof body.path === 'string' ? body.path.trim().slice(0, 2048) : '/'
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const service = createServiceRoleClient()
    const { error } = await service.from('site_page_views').insert({
      path: path || '/',
      user_id: user?.id ?? null,
    })
    if (error) {
      console.error('analytics/track', error)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('analytics/track', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
