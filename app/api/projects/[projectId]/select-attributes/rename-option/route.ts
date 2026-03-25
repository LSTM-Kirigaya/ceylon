import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

function uniqPreserveOrder(items: string[]) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  try {
    const body = await request.json()
    const attributeName = typeof body.attributeName === 'string' ? body.attributeName.trim() : ''
    const oldValue = typeof body.oldValue === 'string' ? body.oldValue.trim() : ''
    const newValue = typeof body.newValue === 'string' ? body.newValue.trim() : ''

    if (!attributeName || !oldValue || !newValue) {
      return NextResponse.json({ error: 'attributeName, oldValue, newValue required' }, { status: 400 })
    }
    if (oldValue === newValue) {
      return NextResponse.json({ ok: true })
    }

    // Permission: project owner or write/admin member
    const { data: projectRow } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .maybeSingle()
    const ownerId = (projectRow as { owner_id?: string } | null)?.owner_id ?? null

    let allowed = ownerId === user.id
    if (!allowed) {
      const { data: mem } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle()
      const role = (mem as { role?: string } | null)?.role
      allowed = role === 'write' || role === 'admin'
    }
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update project-level options
    const { data: row } = await supabase
      .from('project_select_attribute_options')
      .select('options')
      .eq('project_id', projectId)
      .eq('attribute_name', attributeName)
      .maybeSingle()

    const raw = (row as { options?: unknown } | null)?.options
    const opts = Array.isArray(raw)
      ? (raw as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
      : []

    const replaced = opts.map((x) => (x === oldValue ? newValue : x))
    const nextOpts = uniqPreserveOrder(replaced)

    await supabase
      .from('project_select_attribute_options')
      .upsert({ project_id: projectId, attribute_name: attributeName, options: nextOpts })

    // Best-effort: also update all select columns in this project that share the same attribute name,
    // so other views see the renamed option immediately.
    const { data: vvs } = await supabase
      .from('version_views')
      .select('id')
      .eq('project_id', projectId)

    const viewIds = (vvs ?? []).map((x) => (x as { id: string }).id).filter(Boolean)
    if (viewIds.length > 0) {
      const { data: cols } = await supabase
        .from('version_view_columns')
        .select('id, options')
        .in('version_view_id', viewIds)
        .eq('field_type', 'select')
        .eq('name', attributeName)

      for (const c of cols ?? []) {
        const cid = (c as { id?: string }).id
        const cRaw = (c as { options?: unknown }).options
        if (!cid) continue
        const cOpts = Array.isArray(cRaw)
          ? (cRaw as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
          : []
        const cNext = uniqPreserveOrder(cOpts.map((x) => (x === oldValue ? newValue : x)))
        await supabase.from('version_view_columns').update({ options: cNext }).eq('id', cid)
      }
    }

    return NextResponse.json({ ok: true, options: nextOpts })
  } catch (e) {
    console.error('rename option', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

