import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  const { data: views, error: vErr } = await supabase
    .from('version_views')
    .select('id')
    .eq('project_id', projectId)

  if (vErr) {
    return NextResponse.json({ error: vErr.message }, { status: 500 })
  }

  const viewIds = (views ?? []).map((v) => v.id)
  if (viewIds.length === 0) {
    return NextResponse.json({
      stats: {
        totalRequirements: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        bugs: 0,
      },
    })
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
