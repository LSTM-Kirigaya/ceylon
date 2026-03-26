-- Ensure blog post author is a userId and can be joined to profiles for display.

-- Backfill legacy rows with a "current" user (prefer an admin/super_user).
UPDATE public.blog_posts
SET author_id = COALESCE(
  author_id,
  (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_user') LIMIT 1),
  (SELECT id FROM public.profiles LIMIT 1)
)
WHERE author_id IS NULL;

-- Default author to current user on insert (admin creates posts).
ALTER TABLE public.blog_posts
  ALTER COLUMN author_id SET DEFAULT auth.uid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_author_profile_fkey'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_author_profile_fkey
      FOREIGN KEY (author_id)
      REFERENCES public.profiles (id)
      ON DELETE SET NULL;
  END IF;
END $$;

