import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  const direct = await supabase
    .from('version_views')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (direct.error?.message?.includes('infinite recursion')) {
    const rpc = await supabase.rpc('list_version_views_accessible', { p_project_id: projectId })
    if (rpc.error?.message?.includes('does not exist')) {
      return NextResponse.json({ error: 'Database function missing: run migration 000009_project_detail_rpc.sql' }, { status: 503 })
    }
    if (rpc.error) {
      return NextResponse.json({ error: rpc.error.message }, { status: 500 })
    }
    return NextResponse.json({ views: rpc.data ?? [] })
  }

  if (direct.error) {
    return NextResponse.json({ error: direct.error.message }, { status: 500 })
  }

  return NextResponse.json({ views: direct.data ?? [] })
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
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description =
      typeof body.description === 'string' ? body.description.trim() || null : body.description ?? null

    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    const inserted = await supabase
      .from('version_views')
      .insert({
        project_id: projectId,
        name,
        description,
      })
      .select()
      .single()

    if (inserted.error?.message?.includes('infinite recursion')) {
      const rpc = await supabase.rpc('insert_version_view_accessible', {
        p_project_id: projectId,
        p_name: name,
        p_description: description ?? '',
      })
      if (rpc.error?.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Database function missing: run migration 000010_insert_version_view_rpc.sql' }, { status: 503 })
      }
      if (rpc.error?.message?.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (rpc.error) {
        return NextResponse.json({ error: rpc.error.message }, { status: 400 })
      }
      return NextResponse.json({ view: rpc.data })
    }

    if (inserted.error) {
      return NextResponse.json({ error: inserted.error.message }, { status: 400 })
    }

    return NextResponse.json({ view: inserted.data })
  } catch (e) {
    console.error('POST views', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
