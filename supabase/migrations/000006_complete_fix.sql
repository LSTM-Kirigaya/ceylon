-- =============================================
-- Complete Fix for All Dashboard Issues
-- Run this in Supabase Dashboard SQL Editor
-- =============================================

-- 1. Create exec_sql helper function (needed for API fixes)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add icon_url column to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN public.projects.icon_url IS 'Project icon image URL';

-- 3. Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('project-icons', 'project-icons', true),
    ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for project-icons
CREATE POLICY "Project icons are publicly accessible" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'project-icons');

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

-- 5. Drop ALL existing policies to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop project_members policies
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'project_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_members', pol.policyname);
    END LOOP;
    
    -- Drop projects policies
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
    END LOOP;
    
    -- Drop version_views policies
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'version_views'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.version_views', pol.policyname);
    END LOOP;
END $$;

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

-- 7. Create simplified non-recursive policies for projects
-- Allow users to view their own projects
CREATE POLICY "projects_select_own"
    ON public.projects FOR SELECT
    USING (owner_id = auth.uid());

-- Allow users to view projects they are members of (using SECURITY DEFINER function)
CREATE POLICY "projects_select_member"
    ON public.projects FOR SELECT
    USING (public.is_project_member(id, auth.uid()));

-- Allow users to create projects
CREATE POLICY "projects_insert"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Allow owners to update
CREATE POLICY "projects_update_own"
    ON public.projects FOR UPDATE
    USING (owner_id = auth.uid());

-- Allow admins to update
CREATE POLICY "projects_update_admin"
    ON public.projects FOR UPDATE
    USING (public.is_project_admin(id, auth.uid()));

-- Allow owners to delete
CREATE POLICY "projects_delete_own"
    ON public.projects FOR DELETE
    USING (owner_id = auth.uid());

-- Allow admins to delete
CREATE POLICY "projects_delete_admin"
    ON public.projects FOR DELETE
    USING (public.is_project_admin(id, auth.uid()));

-- 8. Create simplified policies for project_members
-- Users can view members of projects they own
CREATE POLICY "members_select_owner"
    ON public.project_members FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

-- Users can view members of projects they are members of
CREATE POLICY "members_select_member"
    ON public.project_members FOR SELECT
    USING (public.is_project_member(project_id, auth.uid()));

-- Users can view their own membership
CREATE POLICY "members_select_self"
    ON public.project_members FOR SELECT
    USING (user_id = auth.uid());

-- Owners can manage members
CREATE POLICY "members_manage_owner"
    ON public.project_members FOR ALL
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

-- Admins can manage members
CREATE POLICY "members_manage_admin"
    ON public.project_members FOR ALL
    USING (public.is_project_admin(project_id, auth.uid()));

-- 9. Create simplified policies for version_views
-- Owners can view
CREATE POLICY "views_select_owner"
    ON public.version_views FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

-- Members can view
CREATE POLICY "views_select_member"
    ON public.version_views FOR SELECT
    USING (public.is_project_member(project_id, auth.uid()));

-- Owners can create
CREATE POLICY "views_insert_owner"
    ON public.version_views FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

-- Writers can create
CREATE POLICY "views_insert_writer"
    ON public.version_views FOR INSERT
    WITH CHECK (public.is_project_writer(project_id, auth.uid()));

-- Owners can update
CREATE POLICY "views_update_owner"
    ON public.version_views FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

-- Writers can update
CREATE POLICY "views_update_writer"
    ON public.version_views FOR UPDATE
    USING (public.is_project_writer(project_id, auth.uid()));

-- Owners can delete
CREATE POLICY "views_delete_owner"
    ON public.version_views FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

-- Admins can delete
CREATE POLICY "views_delete_admin"
    ON public.version_views FOR DELETE
    USING (public.is_project_admin(project_id, auth.uid()));

-- 10. Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_writer(UUID, UUID) TO authenticated;

-- 11. Add name validation constraint (optional but recommended)
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS project_name_not_empty;

ALTER TABLE public.projects 
ADD CONSTRAINT project_name_not_empty 
CHECK (name IS NOT NULL AND length(trim(name)) > 0);
