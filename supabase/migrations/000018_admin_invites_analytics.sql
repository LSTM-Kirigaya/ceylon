-- Invite codes (registration gate), site page views (admin analytics), promote user by email

-- 1) Invite codes: single-use; consumed on successful signup (server-side)
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  note text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes (code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON public.invite_codes (used_by);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invite_codes_admin_all" ON public.invite_codes;
CREATE POLICY "invite_codes_admin_all"
  ON public.invite_codes
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2) Page views (append-only; admin reads via is_admin; inserts via service role in API)
CREATE TABLE IF NOT EXISTS public.site_page_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path text NOT NULL DEFAULT '/',
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_page_views_created_at ON public.site_page_views (created_at DESC);

ALTER TABLE public.site_page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_page_views_admin_select" ON public.site_page_views;
CREATE POLICY "site_page_views_admin_select"
  ON public.site_page_views
  FOR SELECT
  USING (public.is_admin());

-- 3) New users should default to 'user' (invite-only registration; no auto-first-admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, role, subscription_tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    'free'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Promote specific account to system admin (by email)
UPDATE public.profiles
SET role = 'admin'
WHERE lower(email) = lower('zhelonghuang@qq.com');
