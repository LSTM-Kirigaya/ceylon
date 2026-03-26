import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'
import type { Project, VersionView } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  const fetchProject = async (): Promise<Project> => {
    const direct = await supabase.from('projects').select('*').eq('id', projectId).single()

    if (direct.error?.message?.includes('infinite recursion')) {
      const rpc = await supabase.rpc('get_project_if_accessible', { p_id: projectId })
      if (rpc.error?.message?.includes('does not exist')) {
        throw new Error('Database function missing: run migration 000009_project_detail_rpc.sql')
      }
      if (rpc.error) throw new Error(rpc.error.message)
      if (!rpc.data) throw Object.assign(new Error('Not found'), { status: 404 })
      return rpc.data as Project
    }

    if (direct.error) {
      const err = new Error(direct.error.message)
      ;(err as any).status = direct.error.code === 'PGRST116' ? 404 : 500
      throw err
    }

    return direct.data as Project
  }

  const fetchViews = async (): Promise<VersionView[]> => {
    const direct = await supabase
      .from('version_views')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (direct.error?.message?.includes('infinite recursion')) {
      const rpc = await supabase.rpc('list_version_views_accessible', { p_project_id: projectId })
      if (rpc.error?.message?.includes('does not exist')) {
        throw new Error('Database function missing: run migration 000009_project_detail_rpc.sql')
      }
      if (rpc.error) throw new Error(rpc.error.message)
      return (rpc.data ?? []) as VersionView[]
    }

    if (direct.error) throw new Error(direct.error.message)
    return (direct.data ?? []) as VersionView[]
  }

  try {
    const [project, views] = await Promise.all([fetchProject(), fetchViews()])
    return NextResponse.json({ project, views })
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Internal server error'
    const status = typeof e?.status === 'number' ? e.status : msg.includes('Not found') ? 404 : msg.includes('Database function missing') ? 503 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

