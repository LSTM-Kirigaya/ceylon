import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ viewId: string }> }
) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  const { viewId } = await params

  const { data, error } = await supabase
    .from('requirements')
    .select('*, assignee:profiles(*)')
    .eq('version_view_id', viewId)
    .order('requirement_number', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ requirements: data ?? [] })
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

    const { data: nextNum, error: rpcError } = await supabase.rpc('get_next_requirement_number', {
      p_version_view_id: viewId,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('requirements')
      .insert({
        version_view_id: viewId,
        requirement_number: nextNum as number,
        title,
        description: typeof body.description === 'string' ? body.description.trim() || null : null,
        assignee_id: typeof body.assignee_id === 'string' ? body.assignee_id || null : null,
        priority: typeof body.priority === 'number' ? body.priority : 5,
        type: body.type,
        status: body.status ?? 'pending',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ requirement: data })
  } catch (e) {
    console.error('POST requirement', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
