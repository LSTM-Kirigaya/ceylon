import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

function parseOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string; columnId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId, columnId } = await params

  try {
    const body = await request.json()
    const patch: Record<string, unknown> = {}

    if (typeof body.name === 'string') {
      const n = body.name.trim()
      if (!n) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      patch.name = n
    }
    if ('options' in body) {
      patch.options = parseOptions(body.options)
    }
    if (typeof body.position === 'number' && Number.isFinite(body.position)) {
      patch.position = Math.floor(body.position)
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('version_view_columns')
      .update(patch)
      .eq('id', columnId)
      .eq('version_view_id', viewId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ column: data })
  } catch (e) {
    console.error('PATCH column', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ viewId: string; columnId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId, columnId } = await params

  const strip = await supabase.rpc('strip_requirement_custom_column', {
    p_view_id: viewId,
    p_key: columnId,
  })

  if (strip.error) {
    if (strip.error.message?.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Run migration 000014_version_view_columns.sql (strip_requirement_custom_column).' },
        { status: 503 }
      )
    }
    if (strip.error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: strip.error.message }, { status: 400 })
  }

  const { error } = await supabase
    .from('version_view_columns')
    .delete()
    .eq('id', columnId)
    .eq('version_view_id', viewId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
