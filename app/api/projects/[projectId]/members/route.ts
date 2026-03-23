import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  const { data, error } = await supabase
    .from('project_members')
    .select('*, profile:profiles(*)')
    .eq('project_id', projectId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ members: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  try {
    const body = await request.json()
    const memberUserId = typeof body.user_id === 'string' ? body.user_id : ''
    const role = body.role as 'read' | 'write' | 'admin'

    if (!memberUserId || !['read', 'write', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'user_id and valid role required' }, { status: 400 })
    }

    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: memberUserId,
      role,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST members', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
