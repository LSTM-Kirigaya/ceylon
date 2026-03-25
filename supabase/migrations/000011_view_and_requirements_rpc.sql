CREATE OR REPLACE FUNCTION public.get_version_view_if_accessible(p_view_id uuid, p_project_id uuid DEFAULT NULL)
RETURNS public.version_views
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  r public.version_views;
BEGIN
  SELECT * INTO r FROM public.version_views WHERE id = p_view_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF p_project_id IS NOT NULL AND r.project_id IS DISTINCT FROM p_project_id THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.projects p WHERE p.id = r.project_id AND p.owner_id = auth.uid()) THEN
    RETURN r;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = r.project_id AND m.user_id = auth.uid()
  ) THEN
    RETURN r;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_requirements_accessible(p_view_id uuid)
RETURNS SETOF public.requirements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  vv public.version_views;
BEGIN
  SELECT * INTO vv FROM public.version_views WHERE id = p_view_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = vv.project_id AND p.owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.project_members m
      WHERE m.project_id = vv.project_id AND m.user_id = auth.uid()
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.requirements
    WHERE version_view_id = p_view_id
    ORDER BY requirement_number ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_requirement_accessible(
  p_view_id uuid,
  p_title text,
  p_description text,
  p_assignee_id uuid,
  p_priority int,
  p_type text,
  p_status text
)
RETURNS public.requirements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vv public.version_views;
  next_num int;
  r public.requirements;
BEGIN
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Title required';
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

  next_num := public.get_next_requirement_number(p_view_id);

  INSERT INTO public.requirements (
    version_view_id,
    requirement_number,
    title,
    description,
    assignee_id,
    priority,
    type,
    status,
    created_by
  )
  VALUES (
    p_view_id,
    next_num,
    btrim(p_title),
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    p_assignee_id,
    COALESCE(p_priority, 5),
    COALESCE(NULLIF(btrim(COALESCE(p_type, '')), ''), 'Feature'),
    COALESCE(NULLIF(btrim(COALESCE(p_status, '')), ''), 'pending'),
    auth.uid()
  )
  RETURNING * INTO r;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.get_version_view_if_accessible(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_version_view_if_accessible(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_version_view_if_accessible(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.list_requirements_accessible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_requirements_accessible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_requirements_accessible(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.insert_requirement_accessible(uuid, text, text, uuid, int, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_requirement_accessible(uuid, text, text, uuid, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_requirement_accessible(uuid, text, text, uuid, int, text, text) TO service_role;
