-- Project-level storage for reusable select options across version views.
-- Keyed by (project_id, attribute_name), where attribute_name is `version_view_columns.name`.

CREATE TABLE IF NOT EXISTS public.project_select_attribute_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_select_attribute_options_name_not_blank CHECK (length(btrim(attribute_name)) > 0),
  CONSTRAINT project_select_attribute_options_unique UNIQUE (project_id, attribute_name)
);

ALTER TABLE public.project_select_attribute_options ENABLE ROW LEVEL SECURITY;

-- Select: project owner or project member with write/admin can read.
CREATE POLICY "project_select_attribute_options_select"
  ON public.project_select_attribute_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('write', 'admin')
          )
        )
    )
  );

-- Insert: same access rule.
CREATE POLICY "project_select_attribute_options_insert"
  ON public.project_select_attribute_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('write', 'admin')
          )
        )
    )
  );

-- Update: same access rule.
CREATE POLICY "project_select_attribute_options_update"
  ON public.project_select_attribute_options FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('write', 'admin')
          )
        )
    )
  );

-- Delete: same access rule.
CREATE POLICY "project_select_attribute_options_delete"
  ON public.project_select_attribute_options FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('write', 'admin')
          )
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_project_select_attribute_options_project_attr
  ON public.project_select_attribute_options(project_id, attribute_name);

-- Keep updated_at in sync.
DROP TRIGGER IF EXISTS update_project_select_attribute_options_updated_at
  ON public.project_select_attribute_options;
CREATE TRIGGER update_project_select_attribute_options_updated_at
  BEFORE UPDATE ON public.project_select_attribute_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

