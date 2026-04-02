import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET /api/blog - List published blog posts (public)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('blog_posts')
      .select('id,slug,title,subtitle,excerpt,category,status,published_at,cover_image,view_count,author_id')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: posts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get total count
    let countQuery = supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category)
    }

    const { count } = await countQuery

    const authorIds = Array.from(
      new Set((posts || []).map((p: any) => p.author_id).filter(Boolean)),
    ) as string[]

    const authorsById = new Map<string, any>()
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('profiles')
        .select('id,display_name,email,avatar_url')
        .in('id', authorIds)
      for (const a of authors || []) authorsById.set(a.id, a)
    }

    const postsWithAuthors = (posts || []).map((p: any) => ({
      ...p,
      author: p.author_id ? authorsById.get(p.author_id) ?? null : null,
    }))

    return NextResponse.json({
      posts: postsWithAuthors,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
