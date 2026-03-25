import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  const direct = await supabase.from('projects').select('*').eq('id', projectId).single()

  if (direct.error?.message?.includes('infinite recursion')) {
    const rpc = await supabase.rpc('get_project_if_accessible', { p_id: projectId })
    if (rpc.error?.message?.includes('does not exist')) {
      return NextResponse.json({ error: 'Database function missing: run migration 000009_project_detail_rpc.sql' }, { status: 503 })
    }
    if (rpc.error) {
      return NextResponse.json({ error: rpc.error.message }, { status: 500 })
    }
    if (!rpc.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ project: rpc.data })
  }

  if (direct.error) {
    return NextResponse.json(
      { error: direct.error.message },
      { status: direct.error.code === 'PGRST116' ? 404 : 500 }
    )
  }

  return NextResponse.json({ project: direct.data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  try {
    const body = await request.json()
    const patch: Record<string, unknown> = {}

    if (typeof body.name === 'string') patch.name = body.name.trim()
    if ('description' in body) {
      patch.description =
        typeof body.description === 'string' ? body.description.trim() || null : body.description
    }
    if ('icon_url' in body) {
      const u = typeof body.icon_url === 'string' ? body.icon_url.trim() : body.icon_url
      if (typeof u === 'string' && u) {
        patch.icon_url = u
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase.from('projects').update(patch).eq('id', projectId).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ project: data })
  } catch (e) {
    console.error('PATCH /api/projects/[id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
