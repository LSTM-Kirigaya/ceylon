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

  const columns = data ?? []

  // Merge reusable select options by project + attribute name.
  // If the new table isn't deployed yet, fall back to view-local options.
  try {
    const { data: vv } = await supabase.from('version_views').select('project_id').eq('id', viewId).maybeSingle()
    const pId = vv?.project_id ?? projectId
    if (pId) {
      const { data: projectOptRows, error: poErr } = await supabase
        .from('project_select_attribute_options')
        .select('attribute_name, options')
        .eq('project_id', pId)

      if (!poErr && Array.isArray(projectOptRows)) {
        const byName = new Map<string, string[]>()
        for (const row of projectOptRows) {
          const name = (row as { attribute_name?: unknown }).attribute_name
          const rawOpts = (row as { options?: unknown }).options
          if (typeof name !== 'string') continue
          const opts = Array.isArray(rawOpts)
            ? (rawOpts as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
            : []
          byName.set(name, opts)
        }

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

        const mergedColumns = columns.map((c) => {
          if (c.field_type !== 'select') return c
          const viewOpts = Array.isArray(c.options)
            ? (c.options as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
            : []
          const projectOpts = byName.get(c.name) ?? []
          const options = uniqPreserveOrder([...viewOpts, ...projectOpts])
          return { ...c, options }
        })

        return NextResponse.json({ columns: mergedColumns })
      }
    }
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ columns })
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

    try {
      await syncVersionViewData(supabase, viewId)
    } catch {
      // ignore
    }
    return NextResponse.json({ column: data })
  } catch (e) {
    console.error('POST column', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
