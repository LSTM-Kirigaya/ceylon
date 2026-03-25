import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET() {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  let ownedProjects: Record<string, unknown>[] | null = null

  const ownedRes = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (ownedRes.error?.message?.includes('infinite recursion')) {
    const rpc = await supabase.rpc('list_owned_projects')
    if (rpc.error) {
      if (rpc.error.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            error:
              'Apply migration supabase/migrations/000008_list_owned_projects_rpc.sql in Supabase SQL editor.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: rpc.error.message }, { status: 500 })
    }
    ownedProjects = (rpc.data ?? []) as Record<string, unknown>[]
  } else if (ownedRes.error) {
    return NextResponse.json({ error: ownedRes.error.message }, { status: 500 })
  } else {
    ownedProjects = ownedRes.data as Record<string, unknown>[] | null
  }

  // Avoid `project_members` + `projects(*)` join: nested select can trigger RLS recursion on some DBs.
  const { data: memberRows, error: memberError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (memberError) {
    const recurse = memberError.message?.includes('infinite recursion')
    if (!recurse) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }
    // Broken RLS on project_members: still return projects the user owns.
  }

  const memberProjectIds = memberError
    ? []
    : [
        ...new Set((memberRows ?? []).map((m: { project_id: string }) => m.project_id).filter(Boolean)),
      ]
  const ownedIds = new Set(
    (ownedProjects ?? [])
      .map((p) => p.id)
      .filter((id): id is string => typeof id === 'string')
  )
  const idsOnlyInMembership = memberProjectIds.filter((id) => !ownedIds.has(id))

  let memberProjects: Record<string, unknown>[] = []
  if (idsOnlyInMembership.length > 0) {
    const { data: extra, error: extraError } = await supabase
      .from('projects')
      .select('*')
      .in('id', idsOnlyInMembership)

    if (extraError) {
      return NextResponse.json({ error: extraError.message }, { status: 500 })
    }
    memberProjects = extra ?? []
  }

  const fromMembers = memberProjects

  const all = [...(ownedProjects ?? []), ...fromMembers]
  const unique = all.filter(
    (project, index, self) => index === self.findIndex((p) => p.id === project.id)
  )
  unique.sort((a, b) => {
    const ta = new Date(String(a.created_at ?? 0)).getTime()
    const tb = new Date(String(b.created_at ?? 0)).getTime()
    return tb - ta
  })

  return NextResponse.json({ projects: unique })
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description =
      typeof body.description === 'string' ? body.description.trim() || null : body.description ?? null
    const rawIcon = body.icon_url
    const icon_url = typeof rawIcon === 'string' && rawIcon.trim() ? rawIcon.trim() : null

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const row: Record<string, unknown> = {
      name,
      description,
      owner_id: user.id,
    }
    if (icon_url) {
      row.icon_url = icon_url
    }

    let data: Record<string, unknown> | null = null
    let error: { message: string } | null = null

    const inserted = await supabase.from('projects').insert(row).select().single()
    data = inserted.data as Record<string, unknown> | null
    error = inserted.error

    if (error?.message?.includes('infinite recursion')) {
      const rpc = await supabase.rpc('create_owned_project', {
        p_name: name,
        p_description: description ?? '',
      })
      if (!rpc.error && rpc.data) {
        const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data
        return NextResponse.json({ project: row })
      }
      if (rpc.error?.message?.includes('function') && rpc.error?.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            error:
              'Database RLS recursion: apply migration supabase/migrations/000007_create_owned_project_rpc.sql (or 000006_complete_fix.sql) in Supabase SQL editor.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: rpc.error?.message || error.message }, { status: 400 })
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ project: data })
  } catch (e) {
    console.error('POST /api/projects', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
