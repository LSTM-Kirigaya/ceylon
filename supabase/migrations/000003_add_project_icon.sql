-- =============================================
-- Migration: Add icon_url to projects table
-- =============================================

-- Add icon_url field to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Create storage bucket for project icons if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-icons', 'project-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project icons
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

COMMENT ON COLUMN public.projects.icon_url IS 'Project icon image URL';
