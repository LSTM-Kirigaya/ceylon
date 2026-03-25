-- Fix infinite recursion in RLS policies for `public.profiles`
-- Root cause: self-referential subqueries on `public.profiles` inside policies
-- (Postgres may detect recursion when evaluating policy conditions).

-- `public.is_admin()` is defined in 000002 and is SECURITY DEFINER, so it can be
-- used as a recursion-safe admin check from policies.

DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    public.is_admin()
  );

