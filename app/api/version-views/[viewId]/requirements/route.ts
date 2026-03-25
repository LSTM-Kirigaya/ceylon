import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { syncVersionViewData } from '@/lib/version-view-data'

async function attachAssignees(
  supabase: SupabaseClient,
  rows: { assignee_id?: string | null }[]
) {
  const ids = [...new Set(rows.map((r) => r.assignee_id).filter(Boolean))] as string[]
  const assigneeById: Record<string, unknown> = {}
  if (ids.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('*').in('id', ids)
    for (const p of profs ?? []) {
      const id = (p as { id: string }).id
      assigneeById[id] = p
    }
  }
  return rows.map((r) => ({
    ...r,
    assignee: r.assignee_id ? assigneeById[r.assignee_id] ?? null : null,
  }))
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId } = await params

  const direct = await supabase
    .from('requirements')
    .select('*')
    .eq('version_view_id', viewId)
    .order('requirement_number', { ascending: true })

  if (direct.error?.message?.includes('infinite recursion')) {
    const rpc = await supabase.rpc('list_requirements_accessible', { p_view_id: viewId })
    if (rpc.error?.message?.includes('does not exist')) {
      return NextResponse.json({ error: 'Database function missing: run migration 000011_view_and_requirements_rpc.sql' }, { status: 503 })
    }
    if (rpc.error) {
      return NextResponse.json({ error: rpc.error.message }, { status: 500 })
    }
    const requirements = await attachAssignees(supabase, (rpc.data ?? []) as { assignee_id?: string | null }[])
    return NextResponse.json({ requirements })
  }

  if (direct.error) {
    return NextResponse.json({ error: direct.error.message }, { status: 500 })
  }

  const requirements = await attachAssignees(supabase, (direct.data ?? []) as { assignee_id?: string | null }[])
  return NextResponse.json({ requirements })
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
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const description =
      typeof body.description === 'string' ? body.description.trim() || null : null
    const assignee_id = typeof body.assignee_id === 'string' && body.assignee_id ? body.assignee_id : null
    const priority = typeof body.priority === 'number' ? body.priority : 5
    const type = typeof body.type === 'string' ? body.type : 'Feature'
    const status = typeof body.status === 'string' ? body.status : 'pending'

    const custom_values: Record<string, string> = {}
    if (
      body.custom_values !== undefined &&
      body.custom_values !== null &&
      typeof body.custom_values === 'object' &&
      !Array.isArray(body.custom_values)
    ) {
      for (const [k, v] of Object.entries(body.custom_values as Record<string, unknown>)) {
        if (v === null || v === '') continue
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          custom_values[k] = String(v)
        }
      }
    }

    const { data: nextNum, error: rpcError } = await supabase.rpc('get_next_requirement_number', {
      p_version_view_id: viewId,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    const inserted = await supabase
      .from('requirements')
      .insert({
        version_view_id: viewId,
        requirement_number: nextNum as number,
        title,
        description,
        assignee_id,
        priority,
        type,
        status,
        created_by: user.id,
        custom_values: Object.keys(custom_values).length > 0 ? custom_values : undefined,
      })
      .select()
      .single()

    if (inserted.error?.message?.includes('infinite recursion')) {
      const rpc = await supabase.rpc('insert_requirement_accessible', {
        p_view_id: viewId,
        p_title: title,
        p_description: description ?? '',
        p_assignee_id: assignee_id,
        p_priority: priority,
        p_type: type,
        p_status: status,
      })
      if (rpc.error?.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Database function missing: run migration 000011_view_and_requirements_rpc.sql' }, { status: 503 })
      }
      if (rpc.error?.message?.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (rpc.error) {
        return NextResponse.json({ error: rpc.error.message }, { status: 400 })
      }
      let reqRow = rpc.data as Record<string, unknown> | null
      if (reqRow && Object.keys(custom_values).length > 0 && typeof reqRow.id === 'string') {
        const u = await supabase
          .from('requirements')
          .update({ custom_values })
          .eq('id', reqRow.id)
          .select()
          .single()
        if (!u.error && u.data) {
          reqRow = u.data as Record<string, unknown>
        }
      }
      try {
        await syncVersionViewData(supabase, viewId)
      } catch {
        // ignore (migration not deployed yet, etc.)
      }
      return NextResponse.json({ requirement: reqRow })
    }

    if (inserted.error) {
      return NextResponse.json({ error: inserted.error.message }, { status: 400 })
    }

    try {
      await syncVersionViewData(supabase, viewId)
    } catch {
      // ignore
    }
    return NextResponse.json({ requirement: inserted.data })
  } catch (e) {
    console.error('POST requirement', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
