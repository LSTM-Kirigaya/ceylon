import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET /api/admin/blog - List all blog posts (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/blog - Create a new blog post
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      slug,
      title,
      subtitle,
      content,
      excerpt,
      cover_image,
      category,
      status,
      published_at,
      meta_title,
      meta_description,
    } = body

    // Validate required fields
    if (!slug || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, title, content' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 409 }
      )
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title,
        subtitle,
        content,
        excerpt,
        cover_image,
        category,
        status,
        author_id: user.id,
        published_at,
        meta_title,
        meta_description,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
