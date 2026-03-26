import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET /api/blog/[slug] - Get a published blog post (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createServerSupabaseClient()

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(
        'id,slug,title,subtitle,content,excerpt,cover_image,category,status,author_id,published_at,created_at,updated_at,meta_title,meta_description,view_count',
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment view count asynchronously (don't await)
    supabase.rpc('increment_blog_post_view', { p_slug: slug })

    let author = null
    if (post?.author_id) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id,display_name,email,avatar_url')
        .eq('id', post.author_id)
        .maybeSingle()
      author = p ?? null
    }

    return NextResponse.json({ post: { ...post, author } })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
