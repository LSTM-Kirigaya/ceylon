import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { requirementId } = await params

  try {
    const body = await request.json()
    const patch: Record<string, unknown> = {}

    if (typeof body.title === 'string') patch.title = body.title.trim()
    if ('description' in body) {
      patch.description =
        typeof body.description === 'string' ? body.description.trim() || null : body.description
    }
    if ('assignee_id' in body) {
      patch.assignee_id = typeof body.assignee_id === 'string' ? body.assignee_id || null : null
    }
    if (typeof body.priority === 'number') patch.priority = body.priority
    if (body.type) patch.type = body.type
    if (body.status) patch.status = body.status

    if (
      body.custom_values !== undefined &&
      body.custom_values !== null &&
      typeof body.custom_values === 'object' &&
      !Array.isArray(body.custom_values)
    ) {
      const { data: row, error: readErr } = await supabase
        .from('requirements')
        .select('custom_values')
        .eq('id', requirementId)
        .single()
      if (readErr) {
        return NextResponse.json({ error: readErr.message }, { status: 400 })
      }
      const current = (row?.custom_values as Record<string, string> | null) || {}
      const incoming = body.custom_values as Record<string, unknown>
      const next: Record<string, string> = { ...current }
      for (const [k, v] of Object.entries(incoming)) {
        if (v === null || v === '') {
          delete next[k]
        } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          next[k] = String(v)
        }
      }
      patch.custom_values = next
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('requirements')
      .update(patch)
      .eq('id', requirementId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ requirement: data })
  } catch (e) {
    console.error('PATCH requirement', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { requirementId } = await params

  const { error } = await supabase.from('requirements').delete().eq('id', requirementId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
