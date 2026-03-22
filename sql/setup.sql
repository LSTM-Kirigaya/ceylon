-- =============================================
-- Ceylon Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- Profiles Table (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Projects Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Project Members Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('read', 'write', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Version Views Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.version_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.version_views ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Requirements Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_view_id UUID NOT NULL REFERENCES public.version_views(id) ON DELETE CASCADE,
    requirement_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 0 AND priority <= 10),
    type TEXT NOT NULL DEFAULT 'Feature' CHECK (type IN ('Bug', 'Feature', 'Improvement', 'Documentation', 'Security', 'Discussion')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(version_view_id, requirement_number)
);

ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CLI Tokens Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.cli_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.cli_tokens ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies (after all tables created)
-- =============================================

-- Projects policies
CREATE POLICY "Users can view projects they own or are members of" 
    ON public.projects FOR SELECT 
    USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create projects" 
    ON public.projects FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update projects" 
    ON public.projects FOR UPDATE 
    USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = id AND user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Owners and admins can delete projects" 
    ON public.projects FOR DELETE 
    USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = id AND user_id = auth.uid() AND role = 'admin'
        )
    );

-- Project members policies
CREATE POLICY "Users can view members of their projects" 
    ON public.project_members FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND (
                owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = projects.id AND user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Owners and admins can manage members" 
    ON public.project_members FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND (
                owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'admin'
                )
            )
        )
    );

-- Version views policies
CREATE POLICY "Users can view version views of their projects" 
    ON public.version_views FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND (
                owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = projects.id AND user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Write members can create version views" 
    ON public.version_views FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND (
                owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = projects.id AND user_id = auth.uid() AND role IN ('write', 'admin')
                )
            )
        )
    );

CREATE POLICY "Write members can update version views" 
    ON public.version_views FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND (
                owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = projects.id AND user_id = auth.uid() AND role IN ('write', 'admin')
                )
            )
        )
    );

CREATE POLICY "Admins can delete version views" 
    ON public.version_views FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND (
                owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'admin'
                )
            )
        )
    );

-- Requirements policies
CREATE POLICY "Users can view requirements of their projects" 
    ON public.requirements FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.version_views vv
            JOIN public.projects p ON vv.project_id = p.id
            WHERE vv.id = version_view_id AND (
                p.owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = p.id AND user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Write members can create requirements" 
    ON public.requirements FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.version_views vv
            JOIN public.projects p ON vv.project_id = p.id
            WHERE vv.id = version_view_id AND (
                p.owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = p.id AND user_id = auth.uid() AND role IN ('write', 'admin')
                )
            )
        )
    );

CREATE POLICY "Write members can update requirements" 
    ON public.requirements FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.version_views vv
            JOIN public.projects p ON vv.project_id = p.id
            WHERE vv.id = version_view_id AND (
                p.owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = p.id AND user_id = auth.uid() AND role IN ('write', 'admin')
                )
            )
        )
    );

CREATE POLICY "Write members can delete requirements" 
    ON public.requirements FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.version_views vv
            JOIN public.projects p ON vv.project_id = p.id
            WHERE vv.id = version_view_id AND (
                p.owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_members 
                    WHERE project_id = p.id AND user_id = auth.uid() AND role IN ('write', 'admin')
                )
            )
        )
    );

-- CLI tokens policies
CREATE POLICY "Users can view their own CLI tokens" 
    ON public.cli_tokens FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own CLI tokens" 
    ON public.cli_tokens FOR ALL 
    USING (auth.uid() = user_id);

-- =============================================
-- Functions
-- =============================================

-- Get next requirement number for a version view
CREATE OR REPLACE FUNCTION public.get_next_requirement_number(p_version_view_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(requirement_number), -1) + 1
    INTO next_num
    FROM public.requirements
    WHERE version_view_id = p_version_view_id;
    
    RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_members_updated_at ON public.project_members;
CREATE TRIGGER update_project_members_updated_at
    BEFORE UPDATE ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_version_views_updated_at ON public.version_views;
CREATE TRIGGER update_version_views_updated_at
    BEFORE UPDATE ON public.version_views
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_requirements_updated_at ON public.requirements;
CREATE TRIGGER update_requirements_updated_at
    BEFORE UPDATE ON public.requirements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Storage Setup for Avatars
-- =============================================

-- Create avatars bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" 
    ON storage.objects FOR UPDATE 
    USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar" 
    ON storage.objects FOR DELETE 
    USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );
