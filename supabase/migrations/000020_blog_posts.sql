-- Blog posts table for admin blog management
-- Supports Markdown with LaTeX, Mermaid, syntax highlighting

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  content text NOT NULL,
  excerpt text,
  cover_image text,
  category text NOT NULL DEFAULT 'journey',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  meta_title text,
  meta_description text,
  view_count integer NOT NULL DEFAULT 0
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts (category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON public.blog_posts (status, published_at DESC);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Policies

-- Admin can do everything
DROP POLICY IF EXISTS "blog_posts_admin_all" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_all"
  ON public.blog_posts
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Published posts are readable by everyone
DROP POLICY IF EXISTS "blog_posts_public_read" ON public.blog_posts;
CREATE POLICY "blog_posts_public_read"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blog_posts_updated_at();

-- Increment view count function
CREATE OR REPLACE FUNCTION public.increment_blog_post_view(p_slug text)
RETURNS void AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE slug = p_slug AND status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
