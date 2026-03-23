import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/supabase-env'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())
    const results: Record<string, any> = {}

    // 1. Fix: Add icon_url column to projects
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS icon_url TEXT;`
      })
      if (error) throw error
      results.icon_url_column = { status: 'success' }
    } catch (error: any) {
      results.icon_url_column = { status: 'error', error: error.message }
    }

    // 2. Fix: Create project-icons storage bucket
    try {
      const { data: existing } = await supabase.storage.getBucket('project-icons')
      if (!existing) {
        const { error } = await supabase.storage.createBucket('project-icons', {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        })
        if (error) throw error
        results.project_icons_bucket = { status: 'created' }
      } else {
        results.project_icons_bucket = { status: 'exists' }
      }
    } catch (error: any) {
      results.project_icons_bucket = { status: 'error', error: error.message }
    }

    // 3. Fix: RLS infinite recursion - drop problematic policies
    const dropPoliciesSQL = `
      DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;
      DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.project_members;
      DROP POLICY IF EXISTS "Users can view version views of their projects" ON public.version_views;
      DROP POLICY IF EXISTS "Write members can create version views" ON public.version_views;
      DROP POLICY IF EXISTS "Write members can update version views" ON public.version_views;
      DROP POLICY IF EXISTS "Admins can delete version views" ON public.version_views;
      DROP POLICY IF EXISTS "Users can view projects they own or are members of" ON public.projects;
      DROP POLICY IF EXISTS "Owners and admins can update projects" ON public.projects;
      DROP POLICY IF EXISTS "Owners and admins can delete projects" ON public.projects;
    `
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: dropPoliciesSQL })
      if (error) throw error
      results.drop_policies = { status: 'success' }
    } catch (error: any) {
      results.drop_policies = { status: 'error', error: error.message }
    }

    // 4. Fix: Create helper functions to avoid recursion
    const createFunctionsSQL = `
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
    `
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createFunctionsSQL })
      if (error) throw error
      results.create_functions = { status: 'success' }
    } catch (error: any) {
      results.create_functions = { status: 'error', error: error.message }
    }

    // 5. Fix: Create new non-recursive policies for projects
    const projectPoliciesSQL = `
      CREATE POLICY "Users can view their own projects" 
          ON public.projects FOR SELECT USING (owner_id = auth.uid());

      CREATE POLICY "Users can view projects they are members of" 
          ON public.projects FOR SELECT USING (public.is_project_member(id, auth.uid()));

      CREATE POLICY "Users can create projects" 
          ON public.projects FOR INSERT WITH CHECK (auth.uid() = owner_id);

      CREATE POLICY "Project owners can update projects" 
          ON public.projects FOR UPDATE USING (owner_id = auth.uid());

      CREATE POLICY "Project admins can update projects" 
          ON public.projects FOR UPDATE USING (public.is_project_admin(id, auth.uid()));

      CREATE POLICY "Project owners can delete projects" 
          ON public.projects FOR DELETE USING (owner_id = auth.uid());

      CREATE POLICY "Project admins can delete projects" 
          ON public.projects FOR DELETE USING (public.is_project_admin(id, auth.uid()));
    `
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: projectPoliciesSQL })
      if (error) throw error
      results.project_policies = { status: 'success' }
    } catch (error: any) {
      results.project_policies = { status: 'error', error: error.message }
    }

    // 6. Fix: Create non-recursive policies for project_members
    const memberPoliciesSQL = `
      CREATE POLICY "Project owners can view members" 
          ON public.project_members FOR SELECT 
          USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

      CREATE POLICY "Project members can view other members" 
          ON public.project_members FOR SELECT 
          USING (public.is_project_member(project_id, auth.uid()));

      CREATE POLICY "Project owners can manage members" 
          ON public.project_members FOR ALL 
          USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

      CREATE POLICY "Project admins can manage members" 
          ON public.project_members FOR ALL 
          USING (public.is_project_admin(project_id, auth.uid()));

      CREATE POLICY "Users can view their own membership" 
          ON public.project_members FOR SELECT USING (user_id = auth.uid());
    `
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: memberPoliciesSQL })
      if (error) throw error
      results.member_policies = { status: 'success' }
    } catch (error: any) {
      results.member_policies = { status: 'error', error: error.message }
    }

    // 7. Fix: Create non-recursive policies for version_views
    const viewPoliciesSQL = `
      CREATE POLICY "Project owners can view version views" 
          ON public.version_views FOR SELECT 
          USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

      CREATE POLICY "Project members can view version views" 
          ON public.version_views FOR SELECT 
          USING (public.is_project_member(project_id, auth.uid()));

      CREATE POLICY "Project owners can create version views" 
          ON public.version_views FOR INSERT 
          WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

      CREATE POLICY "Project writers can create version views" 
          ON public.version_views FOR INSERT 
          WITH CHECK (public.is_project_writer(project_id, auth.uid()));

      CREATE POLICY "Project owners can update version views" 
          ON public.version_views FOR UPDATE 
          USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

      CREATE POLICY "Project writers can update version views" 
          ON public.version_views FOR UPDATE 
          USING (public.is_project_writer(project_id, auth.uid()));

      CREATE POLICY "Project owners can delete version views" 
          ON public.version_views FOR DELETE 
          USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

      CREATE POLICY "Project admins can delete version views" 
          ON public.version_views FOR DELETE 
          USING (public.is_project_admin(project_id, auth.uid()));
    `
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: viewPoliciesSQL })
      if (error) throw error
      results.view_policies = { status: 'success' }
    } catch (error: any) {
      results.view_policies = { status: 'error', error: error.message }
    }

    return NextResponse.json({
      message: 'Fixes applied',
      results,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
