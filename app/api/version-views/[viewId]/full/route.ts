import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'
import { buildVersionViewDataSnapshot } from '@/lib/version-view-data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId } = await params
  const projectId = new URL(request.url).searchParams.get('projectId')

  // Optional projectId guard (same behavior as other endpoints)
  if (projectId) {
    const { data: vv, error: ve } = await supabase
      .from('version_views')
      .select('id')
      .eq('id', viewId)
      .eq('project_id', projectId)
      .maybeSingle()
    if (ve || !vv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const snap = await buildVersionViewDataSnapshot(supabase, viewId)
    // Best-effort persist to the single JSON field (may fail if migration not applied yet).
    await supabase.from('version_views').update({ data: snap }).eq('id', viewId)
    return NextResponse.json({ data: snap })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Internal server error' }, { status: 500 })
  }
}
