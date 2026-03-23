import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const projectId = searchParams.get('projectId')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Create service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Search users by display_name or email
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, created_at')
      .or(`display_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`)
      .limit(10)

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      )
    }

    // If projectId is provided, filter out existing members
    if (projectId) {
      const { data: existingMembers } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)

      const existingMemberIds = new Set(existingMembers?.map(m => m.user_id) || [])
      
      // Also get project owner
      const { data: project } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single()
      
      if (project) {
        existingMemberIds.add(project.owner_id)
      }

      const filteredUsers = users?.filter(u => !existingMemberIds.has(u.id)) || []
      return NextResponse.json({ users: filteredUsers })
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Error in user search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
