import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/supabase-env'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

/** Escape `%` / `_` so user input cannot broaden ILIKE patterns. */
function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuidString(s: string): boolean {
  return UUID_RE.test(s)
}

export async function GET(request: NextRequest) {
  const { user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const projectId = searchParams.get('projectId')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 })
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())
    const raw = query.trim()
    const pattern = `%${escapeIlike(raw)}%`

    const selectCols = 'id, email, display_name, avatar_url, created_at'

    const [nameRes, emailRes] = await Promise.all([
      supabase.from('profiles').select(selectCols).ilike('display_name', pattern).limit(10),
      supabase.from('profiles').select(selectCols).ilike('email', pattern).limit(10),
    ])

    const textError = nameRes.error || emailRes.error
    if (textError) {
      console.error('Error searching users:', textError)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    type ProfileRow = NonNullable<typeof nameRes.data>[number]
    const byId = new Map<string, ProfileRow>()
    for (const row of [...(nameRes.data ?? []), ...(emailRes.data ?? [])]) {
      byId.set(row.id, row)
    }

    if (isUuidString(raw)) {
      const { data: idRow, error: idError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, created_at')
        .eq('id', raw)
        .maybeSingle()

      if (idError) {
        console.error('Error searching user by id:', idError)
        return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
      }
      if (idRow) {
        byId.set(idRow.id, idRow)
      }
    }

    let users = [...byId.values()].slice(0, 10)

    if (projectId) {
      const { data: existingMembers } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)

      const existingMemberIds = new Set(existingMembers?.map((m) => m.user_id) || [])

      const { data: project } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single()

      if (project) {
        existingMemberIds.add(project.owner_id)
      }

      users = users.filter((u) => !existingMemberIds.has(u.id))
      return NextResponse.json({ users })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in user search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
