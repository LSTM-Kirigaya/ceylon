-- =============================================
-- Migration: Fix RLS infinite recursion
-- =============================================

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view version views of their projects" ON public.version_views;
DROP POLICY IF EXISTS "Write members can create version views" ON public.version_views;
DROP POLICY IF EXISTS "Write members can update version views" ON public.version_views;
DROP POLICY IF EXISTS "Admins can delete version views" ON public.version_views;

-- =============================================
-- Fixed Project Members Policies (avoid recursion)
-- =============================================

-- Users can view members of projects they own
CREATE POLICY "Project owners can view members" 
    ON public.project_members FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND owner_id = auth.uid()
        )
    );

-- Users can view members of projects they are members of
-- Use a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Project members can view other members" 
    ON public.project_members FOR SELECT 
    USING (
        public.is_project_member(project_id, auth.uid())
    );

-- Owners can manage members
CREATE POLICY "Project owners can manage members" 
    ON public.project_members FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND owner_id = auth.uid()
        )
    );

-- Admins can manage members (using security definer function)
CREATE OR REPLACE FUNCTION public.is_project_admin(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = p_user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Project admins can manage members" 
    ON public.project_members FOR ALL 
    USING (
        public.is_project_admin(project_id, auth.uid())
    );

-- Users can view their own membership records
CREATE POLICY "Users can view their own membership" 
    ON public.project_members FOR SELECT 
    USING (user_id = auth.uid());

-- =============================================
-- Fixed Version Views Policies (avoid recursion)
-- =============================================

-- Users can view version views of projects they own
CREATE POLICY "Project owners can view version views" 
    ON public.version_views FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND owner_id = auth.uid()
        )
    );

-- Project members can view version views
CREATE POLICY "Project members can view version views" 
    ON public.version_views FOR SELECT 
    USING (
        public.is_project_member(project_id, auth.uid())
    );

-- Owners can create version views
CREATE POLICY "Project owners can create version views" 
    ON public.version_views FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND owner_id = auth.uid()
        )
    );

-- Write members and admins can create version views
CREATE OR REPLACE FUNCTION public.is_project_writer(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = p_user_id AND role IN ('write', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Project writers can create version views" 
    ON public.version_views FOR INSERT 
    WITH CHECK (
        public.is_project_writer(project_id, auth.uid())
    );

-- Owners can update version views
CREATE POLICY "Project owners can update version views" 
    ON public.version_views FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND owner_id = auth.uid()
        )
    );

-- Write members can update version views
CREATE POLICY "Project writers can update version views" 
    ON public.version_views FOR UPDATE 
    USING (
        public.is_project_writer(project_id, auth.uid())
    );

-- Owners can delete version views
CREATE POLICY "Project owners can delete version views" 
    ON public.version_views FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND owner_id = auth.uid()
        )
    );

-- Admins can delete version views
CREATE POLICY "Project admins can delete version views" 
    ON public.version_views FOR DELETE 
    USING (
        public.is_project_admin(project_id, auth.uid())
    );

-- =============================================
-- Fix Projects Policies (avoid recursion in member check)
-- =============================================

DROP POLICY IF EXISTS "Users can view projects they own or are members of" ON public.projects;
DROP POLICY IF EXISTS "Owners and admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Owners and admins can delete projects" ON public.projects;

-- Users can view projects they own
CREATE POLICY "Users can view their own projects" 
    ON public.projects FOR SELECT 
    USING (owner_id = auth.uid());

-- Users can view projects they are members of
CREATE POLICY "Users can view projects they are members of" 
    ON public.projects FOR SELECT 
    USING (
        public.is_project_member(id, auth.uid())
    );

-- Users can create projects
CREATE POLICY "Users can create projects" 
    ON public.projects FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

-- Owners can update projects
CREATE POLICY "Project owners can update projects" 
    ON public.projects FOR UPDATE 
    USING (owner_id = auth.uid());

-- Admins can update projects
CREATE POLICY "Project admins can update projects" 
    ON public.projects FOR UPDATE 
    USING (
        public.is_project_admin(id, auth.uid())
    );

-- Owners can delete projects
CREATE POLICY "Project owners can delete projects" 
    ON public.projects FOR DELETE 
    USING (owner_id = auth.uid());

-- Admins can delete projects
CREATE POLICY "Project admins can delete projects" 
    ON public.projects FOR DELETE 
    USING (
        public.is_project_admin(id, auth.uid())
    );
