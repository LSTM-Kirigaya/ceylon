import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'
import { syncVersionViewData } from '@/lib/version-view-data'

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

  const uniqPreserveOrder = (items: string[]) => {
    const seen = new Set<string>()
    const res: string[] = []
    for (const it of items) {
      const v = String(it).trim()
      if (!v) continue
      if (seen.has(v)) continue
      seen.add(v)
      res.push(v)
    }
    return res
  }

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

    // Read before update for rename/delete support (best-effort).
    const { data: beforeCol } = await supabase
      .from('version_view_columns')
      .select('id, version_view_id, name, field_type, options')
      .eq('id', columnId)
      .eq('version_view_id', viewId)
      .maybeSingle()

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

    // Sync select options to project-level attribute storage (best-effort).
    // This enables reusing the same attribute name's options across version views.
    try {
      if ((data as { field_type?: unknown }).field_type === 'select') {
        const { data: vv } = await supabase.from('version_views').select('project_id').eq('id', viewId).single()
        const pId = (vv as { project_id?: string | null }).project_id ?? null
        const colName = (data as { name?: unknown }).name
        if (pId && typeof colName === 'string' && colName.trim()) {
          const viewOptsRaw = (data as { options?: unknown }).options
          const viewOpts = Array.isArray(viewOptsRaw)
            ? (viewOptsRaw as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
            : []

          const { data: existingProjRow } = await supabase
            .from('project_select_attribute_options')
            .select('options')
            .eq('project_id', pId)
            .eq('attribute_name', colName)
            .maybeSingle()

          const existingRaw = (existingProjRow as { options?: unknown } | null)?.options
          const existingOpts = Array.isArray(existingRaw)
            ? (existingRaw as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
            : []

          const merged = uniqPreserveOrder([...existingOpts, ...viewOpts])

          await supabase
            .from('project_select_attribute_options')
            .upsert({
              project_id: pId,
              attribute_name: colName,
              options: merged,
            })
            .select()

          // If column was renamed, we can optionally clean stale attribute rows.
          if (beforeCol && typeof beforeCol.name === 'string' && beforeCol.name !== colName) {
            await supabase
              .from('project_select_attribute_options')
              .delete()
              .eq('project_id', pId)
              .eq('attribute_name', beforeCol.name)
          }
        }
      }
    } catch (e) {
      // ignore (table missing, RLS, etc.)
    }

    try {
      await syncVersionViewData(supabase, viewId)
    } catch {
      // ignore
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

  try {
    await syncVersionViewData(supabase, viewId)
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true })
}
