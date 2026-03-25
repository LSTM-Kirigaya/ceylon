-- Fix recursive/broken public RLS policies on core tables.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('projects','project_members','version_views')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_admin(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_writer(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_user_id AND role IN ('write','admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "projects_select_own"
  ON public.projects FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "projects_select_member"
  ON public.projects FOR SELECT
  USING (public.is_project_member(id, auth.uid()));

CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "projects_update_own"
  ON public.projects FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "projects_update_admin"
  ON public.projects FOR UPDATE
  USING (public.is_project_admin(id, auth.uid()));

CREATE POLICY "projects_delete_own"
  ON public.projects FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "projects_delete_admin"
  ON public.projects FOR DELETE
  USING (public.is_project_admin(id, auth.uid()));

CREATE POLICY "members_select_owner"
  ON public.project_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

CREATE POLICY "members_select_member"
  ON public.project_members FOR SELECT
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "members_select_self"
  ON public.project_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "members_manage_owner"
  ON public.project_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

CREATE POLICY "members_manage_admin"
  ON public.project_members FOR ALL
  USING (public.is_project_admin(project_id, auth.uid()));

CREATE POLICY "views_select_owner"
  ON public.version_views FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

CREATE POLICY "views_select_member"
  ON public.version_views FOR SELECT
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "views_insert_owner"
  ON public.version_views FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

CREATE POLICY "views_insert_writer"
  ON public.version_views FOR INSERT
  WITH CHECK (public.is_project_writer(project_id, auth.uid()));

CREATE POLICY "views_update_owner"
  ON public.version_views FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

CREATE POLICY "views_update_writer"
  ON public.version_views FOR UPDATE
  USING (public.is_project_writer(project_id, auth.uid()));

CREATE POLICY "views_delete_owner"
  ON public.version_views FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

CREATE POLICY "views_delete_admin"
  ON public.version_views FOR DELETE
  USING (public.is_project_admin(project_id, auth.uid()));
