import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params
  const zeroStats = {
    totalRequirements: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    bugs: 0,
  }

  // Fast path: single RPC handles permission check + aggregation in DB.
  const rpc = await supabase.rpc('project_requirement_stats_accessible', { p_project_id: projectId })
  if (!rpc.error && rpc.data != null) {
    const s = rpc.data as Record<string, number>
    return NextResponse.json({
      stats: {
        totalRequirements: s.totalRequirements ?? 0,
        completed: s.completed ?? 0,
        inProgress: s.inProgress ?? 0,
        pending: s.pending ?? 0,
        bugs: s.bugs ?? 0,
      },
    })
  }

  // If RPC is missing in some envs, fallback to direct queries.
  if (rpc.error && !rpc.error.message?.includes('does not exist')) {
    return NextResponse.json({ error: rpc.error.message }, { status: 500 })
  }

  const { data: views, error: vErr } = await supabase
    .from('version_views')
    .select('id')
    .eq('project_id', projectId)

  if (vErr) {
    return NextResponse.json({ error: vErr.message }, { status: 500 })
  }

  const viewIds = (views ?? []).map((v) => v.id)
  if (viewIds.length === 0) {
    return NextResponse.json({ stats: zeroStats })
  }

  const { data: requirements, error } = await supabase
    .from('requirements')
    .select('status, type')
    .in('version_view_id', viewIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = requirements ?? []
  const stats = {
    totalRequirements: list.length,
    completed: list.filter((r) => r.status === 'completed').length,
    inProgress: list.filter((r) => r.status === 'in_progress').length,
    pending: list.filter((r) => r.status === 'pending').length,
    bugs: list.filter((r) => r.type === 'Bug').length,
  }

  return NextResponse.json({ stats })
}
