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
      .select('*')
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

    return NextResponse.json({
      posts,
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
