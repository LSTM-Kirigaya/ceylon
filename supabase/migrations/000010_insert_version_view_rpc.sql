CREATE OR REPLACE FUNCTION public.insert_version_view_accessible(
  p_project_id uuid,
  p_name text,
  p_description text
)
RETURNS public.version_views
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.version_views;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Name required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = p_project_id AND p.owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = p_project_id AND m.user_id = auth.uid()
      AND m.role IN ('write', 'admin')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.version_views (project_id, name, description)
  VALUES (
    p_project_id,
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_description, '')), '')
  )
  RETURNING * INTO r;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_version_view_accessible(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_version_view_accessible(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_version_view_accessible(uuid, text, text) TO service_role;
