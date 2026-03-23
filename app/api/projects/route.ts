import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET() {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { data: ownedProjects, error: ownedError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 500 })
  }

  const { data: memberRows, error: memberError } = await supabase
    .from('project_members')
    .select('project_id, projects(*)')
    .order('created_at', { ascending: false })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  type Row = { projects: Record<string, unknown> | Record<string, unknown>[] | null }
  const fromMembers = (memberRows ?? []).flatMap((m: Row) => {
    const p = m.projects
    if (p == null) return []
    return Array.isArray(p) ? p : [p]
  })

  const all = [...(ownedProjects ?? []), ...fromMembers]
  const unique = all.filter(
    (project, index, self) => index === self.findIndex((p) => p.id === project.id)
  )

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
    const icon_url = typeof body.icon_url === 'string' ? body.icon_url : body.icon_url ?? null

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        owner_id: user.id,
        icon_url,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ project: data })
  } catch (e) {
    console.error('POST /api/projects', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
