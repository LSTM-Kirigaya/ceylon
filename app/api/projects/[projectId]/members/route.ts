import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'
import type { ProjectMember } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  const { data: projectRow } = await supabase.from('projects').select('owner_id').eq('id', projectId).maybeSingle()
  const ownerId = (projectRow as { owner_id?: string } | null)?.owner_id ?? null

  const { data, error } = await supabase.from('project_members').select('*').eq('project_id', projectId)

  if (error?.message?.includes('infinite recursion')) {
    return NextResponse.json({ members: [] })
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const userIds = [...new Set(rows.map((m: { user_id: string }) => m.user_id).filter(Boolean))]
  if (ownerId && !userIds.includes(ownerId)) {
    userIds.push(ownerId)
  }
  const profileById: Record<string, unknown> = {}
  if (userIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('*').in('id', userIds)
    for (const p of profs ?? []) {
      profileById[(p as { id: string }).id] = p
    }
  }

  const members: ProjectMember[] = rows.map((m) => ({
    ...(m as ProjectMember),
    profile: (profileById[(m as { user_id: string }).user_id] ?? null) as ProjectMember['profile'],
  }))

  if (ownerId && !members.some((m: { user_id: string }) => m.user_id === ownerId)) {
    const ownerRow: ProjectMember = {
      id: `owner-${ownerId}`,
      project_id: projectId,
      user_id: ownerId,
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: (profileById[ownerId] ?? null) as ProjectMember['profile'],
    }
    members.unshift(ownerRow)
  }

  return NextResponse.json({ members })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { projectId } = await params

  try {
    const body = await request.json()
    const memberUserId = typeof body.user_id === 'string' ? body.user_id : ''
    const role = body.role as 'read' | 'write' | 'admin'

    if (!memberUserId || !['read', 'write', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'user_id and valid role required' }, { status: 400 })
    }

    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: memberUserId,
      role,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST members', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
