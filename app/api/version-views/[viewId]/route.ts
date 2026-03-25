import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId } = await params
  const projectId = new URL(request.url).searchParams.get('projectId')

  let q = supabase.from('version_views').select('*').eq('id', viewId)
  if (projectId) {
    q = q.eq('project_id', projectId)
  }

  const direct = await q.single()

  if (direct.error?.message?.includes('infinite recursion')) {
    const rpc = await supabase.rpc('get_version_view_if_accessible', {
      p_view_id: viewId,
      p_project_id: projectId || null,
    })
    if (rpc.error?.message?.includes('does not exist')) {
      return NextResponse.json({ error: 'Database function missing: run migration 000011_view_and_requirements_rpc.sql' }, { status: 503 })
    }
    if (rpc.error) {
      return NextResponse.json({ error: rpc.error.message }, { status: 500 })
    }
    if (!rpc.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ view: rpc.data })
  }

  if (direct.error) {
    return NextResponse.json(
      { error: direct.error.message },
      { status: direct.error.code === 'PGRST116' ? 404 : 500 }
    )
  }

  return NextResponse.json({ view: direct.data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId } = await params

  try {
    const body = await request.json()
    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim()
    if ('description' in body) {
      patch.description =
        typeof body.description === 'string' ? body.description.trim() || null : body.description
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase.from('version_views').update(patch).eq('id', viewId).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ view: data })
  } catch (e) {
    console.error('PATCH view', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId } = await params

  const { error } = await supabase.from('version_views').delete().eq('id', viewId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
