import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper to verify token and get user
async function verifyToken(request: NextRequest): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return null
    }
    return { userId: user.id, email: user.email || '' }
  } catch {
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await verifyToken(request)
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  const path = resolvedParams.path.join('/')
  const body = await request.json().catch(() => ({}))

  try {
    switch (path) {
      case 'projects':
        return handleGetProjects(user.userId)
      
      case 'views':
        return handleGetViews(body.projectId)
      
      case 'requirements':
        return handleGetRequirements(body.viewId)
      
      case 'requirements/create':
        return handleCreateRequirement(body, user.userId)
      
      case 'requirements/update':
        return handleUpdateRequirement(body)
      
      case 'requirements/delete':
        return handleDeleteRequirement(body.reqId)
      
      default:
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  } catch (error: any) {
    console.error('CLI API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleGetProjects(userId: string) {
  // Get owned projects
  const { data: ownedProjects, error: ownedError } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (ownedError) throw ownedError

  // Get member projects
  const { data: memberProjects, error: memberError } = await supabase
    .from('project_members')
    .select('projects(*)')
    .eq('user_id', userId)

  if (memberError) throw memberError

  const allProjects = [
    ...(ownedProjects || []),
    ...(memberProjects?.map(m => m.projects) || []),
  ]

  // Remove duplicates
  const uniqueProjects = allProjects.filter(
    (project, index, self) =>
      index === self.findIndex(p => p.id === project.id)
  )

  return NextResponse.json({ projects: uniqueProjects })
}

async function handleGetViews(projectId: string) {
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const { data: views, error } = await supabase
    .from('version_views')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return NextResponse.json({ views: views || [] })
}

async function handleGetRequirements(viewId: string) {
  if (!viewId) {
    return NextResponse.json({ error: 'View ID required' }, { status: 400 })
  }

  const { data: requirements, error } = await supabase
    .from('requirements')
    .select('*')
    .eq('version_view_id', viewId)
    .order('requirement_number', { ascending: true })

  if (error) throw error

  return NextResponse.json({ requirements: requirements || [] })
}

async function handleCreateRequirement(body: any, userId: string) {
  const { viewId, title, description, priority, type } = body

  if (!viewId || !title) {
    return NextResponse.json(
      { error: 'View ID and title are required' },
      { status: 400 }
    )
  }

  // Get next requirement number
  const { data: nextNum, error: rpcError } = await supabase
    .rpc('get_next_requirement_number', { p_version_view_id: viewId })

  if (rpcError) throw rpcError

  const { data: requirement, error } = await supabase
    .from('requirements')
    .insert({
      version_view_id: viewId,
      requirement_number: nextNum,
      title: title.trim(),
      description: description?.trim() || null,
      priority: priority || 5,
      type: type || 'Feature',
      status: 'pending',
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ requirement })
}

async function handleUpdateRequirement(body: any) {
  const { reqId, updates } = body

  if (!reqId || !updates) {
    return NextResponse.json(
      { error: 'Requirement ID and updates are required' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('requirements')
    .update(updates)
    .eq('id', reqId)

  if (error) throw error

  return NextResponse.json({ success: true })
}

async function handleDeleteRequirement(reqId: string) {
  if (!reqId) {
    return NextResponse.json(
      { error: 'Requirement ID is required' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('requirements')
    .delete()
    .eq('id', reqId)

  if (error) throw error

  return NextResponse.json({ success: true })
}
