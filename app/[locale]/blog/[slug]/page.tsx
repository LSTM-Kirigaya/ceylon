import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import BlogPostContent from './BlogPostContent'
import type { Locale } from '@/i18n/config'

interface BlogPostPageProps {
  params: Promise<{
    locale: Locale
    slug: string
  }>
}

async function getBlogPost(slug: string) {
  const supabase = await createServerSupabaseClient()
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !post) {
    return null
  }

  return post
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    return {
      title: 'Not Found',
    }
  }

  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt

  return {
    title: `${title} | Blog`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    notFound()
  }

  // Increment view count asynchronously
  const supabase = await createServerSupabaseClient()
  supabase.rpc('increment_blog_post_view', { p_slug: slug })

  return <BlogPostContent post={post} locale={locale} />
}

export const revalidate = 60
