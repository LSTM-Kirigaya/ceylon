-- Dynamic columns per version view + per-row JSON cell values.

CREATE TABLE IF NOT EXISTS public.version_view_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_view_id UUID NOT NULL REFERENCES public.version_views(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'select', 'person')),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT version_view_columns_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_version_view_columns_view_position
  ON public.version_view_columns(version_view_id, position);

ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS custom_values JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.version_view_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "version_view_columns_select"
  ON public.version_view_columns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.version_views vv
      JOIN public.projects p ON p.id = vv.project_id
      WHERE vv.id = version_view_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "version_view_columns_insert"
  ON public.version_view_columns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.version_views vv
      JOIN public.projects p ON p.id = vv.project_id
      WHERE vv.id = version_view_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
              AND pm.role IN ('write', 'admin')
          )
        )
    )
  );

CREATE POLICY "version_view_columns_update"
  ON public.version_view_columns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.version_views vv
      JOIN public.projects p ON p.id = vv.project_id
      WHERE vv.id = version_view_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
              AND pm.role IN ('write', 'admin')
          )
        )
    )
  );

CREATE POLICY "version_view_columns_delete"
  ON public.version_view_columns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.version_views vv
      JOIN public.projects p ON p.id = vv.project_id
      WHERE vv.id = version_view_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
              AND pm.role IN ('write', 'admin')
          )
        )
    )
  );

DROP TRIGGER IF EXISTS update_version_view_columns_updated_at ON public.version_view_columns;
CREATE TRIGGER update_version_view_columns_updated_at
  BEFORE UPDATE ON public.version_view_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Remove one key from custom_values for all rows in a view (SECURITY DEFINER + access check).
CREATE OR REPLACE FUNCTION public.strip_requirement_custom_column(p_view_id uuid, p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vv public.version_views;
BEGIN
  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RETURN;
  END IF;

  SELECT * INTO vv FROM public.version_views WHERE id = p_view_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not found';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = vv.project_id AND p.owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.project_members m
      WHERE m.project_id = vv.project_id AND m.user_id = auth.uid()
        AND m.role IN ('write', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.requirements
  SET custom_values = custom_values - p_key
  WHERE version_view_id = p_view_id;
END;
$$;

REVOKE ALL ON FUNCTION public.strip_requirement_custom_column(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.strip_requirement_custom_column(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strip_requirement_custom_column(uuid, text) TO service_role;
