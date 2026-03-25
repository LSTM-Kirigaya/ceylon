-- =============================================
-- Migration: Fix All Dashboard Issues
-- =============================================

-- 1. Add icon_url column to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN public.projects.icon_url IS 'Project icon image URL';

-- 2. Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('project-icons', 'project-icons', true),
    ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for project-icons (idempotent for re-push / existing DBs)
DROP POLICY IF EXISTS "Project icons are publicly accessible" ON storage.objects;
CREATE POLICY "Project icons are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'project-icons');

DROP POLICY IF EXISTS "Project owners can upload icons" ON storage.objects;
CREATE POLICY "Project owners can upload icons"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'project-icons' AND
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = (storage.foldername(name))[1]::uuid
            AND owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Project owners can update icons" ON storage.objects;
CREATE POLICY "Project owners can update icons"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'project-icons' AND
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = (storage.foldername(name))[1]::uuid
            AND owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Project owners can delete icons" ON storage.objects;
CREATE POLICY "Project owners can delete icons"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'project-icons' AND
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = (storage.foldername(name))[1]::uuid
            AND owner_id = auth.uid()
        )
    );

-- 4. Storage policies for attachments
DROP POLICY IF EXISTS "Attachments are publicly accessible" ON storage.objects;
CREATE POLICY "Attachments are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'attachments');

-- 5. Drop problematic RLS policies (that cause infinite recursion)
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view version views of their projects" ON public.version_views;
DROP POLICY IF EXISTS "Write members can create version views" ON public.version_views;
DROP POLICY IF EXISTS "Write members can update version views" ON public.version_views;
DROP POLICY IF EXISTS "Admins can delete version views" ON public.version_views;
DROP POLICY IF EXISTS "Users can view projects they own or are members of" ON public.projects;
DROP POLICY IF EXISTS "Owners and admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Owners and admins can delete projects" ON public.projects;

-- 6. Create helper functions to avoid recursion
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
        WHERE project_id = p_project_id AND user_id = p_user_id AND role IN ('write', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create new non-recursive policies for projects (idempotent)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
    ON public.projects FOR SELECT USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
CREATE POLICY "Users can view projects they are members of"
    ON public.projects FOR SELECT USING (public.is_project_member(id, auth.uid()));

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects"
    ON public.projects FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;
CREATE POLICY "Project owners can update projects"
    ON public.projects FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Project admins can update projects" ON public.projects;
CREATE POLICY "Project admins can update projects"
    ON public.projects FOR UPDATE USING (public.is_project_admin(id, auth.uid()));

DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;
CREATE POLICY "Project owners can delete projects"
    ON public.projects FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Project admins can delete projects" ON public.projects;
CREATE POLICY "Project admins can delete projects"
    ON public.projects FOR DELETE USING (public.is_project_admin(id, auth.uid()));

-- 8. Create non-recursive policies for project_members (idempotent)
DROP POLICY IF EXISTS "Project owners can view members" ON public.project_members;
CREATE POLICY "Project owners can view members"
    ON public.project_members FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Project members can view other members" ON public.project_members;
CREATE POLICY "Project members can view other members"
    ON public.project_members FOR SELECT
    USING (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
CREATE POLICY "Project owners can manage members"
    ON public.project_members FOR ALL
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Project admins can manage members" ON public.project_members;
CREATE POLICY "Project admins can manage members"
    ON public.project_members FOR ALL
    USING (public.is_project_admin(project_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view their own membership" ON public.project_members;
CREATE POLICY "Users can view their own membership"
    ON public.project_members FOR SELECT USING (user_id = auth.uid());

-- 9. Create non-recursive policies for version_views (idempotent)
DROP POLICY IF EXISTS "Project owners can view version views" ON public.version_views;
CREATE POLICY "Project owners can view version views"
    ON public.version_views FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Project members can view version views" ON public.version_views;
CREATE POLICY "Project members can view version views"
    ON public.version_views FOR SELECT
    USING (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Project owners can create version views" ON public.version_views;
CREATE POLICY "Project owners can create version views"
    ON public.version_views FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Project writers can create version views" ON public.version_views;
CREATE POLICY "Project writers can create version views"
    ON public.version_views FOR INSERT
    WITH CHECK (public.is_project_writer(project_id, auth.uid()));

DROP POLICY IF EXISTS "Project owners can update version views" ON public.version_views;
CREATE POLICY "Project owners can update version views"
    ON public.version_views FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Project writers can update version views" ON public.version_views;
CREATE POLICY "Project writers can update version views"
    ON public.version_views FOR UPDATE
    USING (public.is_project_writer(project_id, auth.uid()));

DROP POLICY IF EXISTS "Project owners can delete version views" ON public.version_views;
CREATE POLICY "Project owners can delete version views"
    ON public.version_views FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Project admins can delete version views" ON public.version_views;
CREATE POLICY "Project admins can delete version views"
    ON public.version_views FOR DELETE
    USING (public.is_project_admin(project_id, auth.uid()));
