import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

function parseOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId } = await params
  const projectId = new URL(request.url).searchParams.get('projectId')

  if (projectId) {
    const { data: vv, error: ve } = await supabase
      .from('version_views')
      .select('id')
      .eq('id', viewId)
      .eq('project_id', projectId)
      .maybeSingle()
    if (ve || !vv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const { data, error } = await supabase
    .from('version_view_columns')
    .select('*')
    .eq('version_view_id', viewId)
    .order('position', { ascending: true })

  if (error) {
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return NextResponse.json(
        { error: 'Run migration 000014_version_view_columns.sql for dynamic columns.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ columns: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId } = await params

  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    const field_type = body.field_type as string
    if (!['text', 'select', 'person'].includes(field_type)) {
      return NextResponse.json({ error: 'field_type must be text, select, or person' }, { status: 400 })
    }

    const options = field_type === 'select' ? parseOptions(body.options) : []

    const { data: existing } = await supabase
      .from('version_view_columns')
      .select('position')
      .eq('version_view_id', viewId)
      .order('position', { ascending: false })
      .limit(1)

    const nextPos =
      typeof body.position === 'number' && Number.isFinite(body.position)
        ? Math.floor(body.position)
        : (existing?.[0]?.position ?? -1) + 1

    const { data, error } = await supabase
      .from('version_view_columns')
      .insert({
        version_view_id: viewId,
        name,
        field_type,
        options,
        position: nextPos,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ column: data })
  } catch (e) {
    console.error('POST column', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
