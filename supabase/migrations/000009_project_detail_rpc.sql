-- Bypass RLS recursion when loading project dashboard (views/stats touch policies that reference project_members).

CREATE OR REPLACE FUNCTION public.get_project_if_accessible(p_id uuid)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  r public.projects;
BEGIN
  SELECT * INTO r FROM public.projects WHERE id = p_id AND owner_id = auth.uid();
  IF FOUND THEN
    RETURN r;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = p_id AND m.user_id = auth.uid()
  ) THEN
    SELECT * INTO r FROM public.projects WHERE id = p_id;
    RETURN r;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_version_views_accessible(p_project_id uuid)
RETURNS SETOF public.version_views
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = p_project_id AND p.owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = p_project_id AND m.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.version_views
    WHERE project_id = p_project_id
    ORDER BY created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_requirement_stats_accessible(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  ok boolean;
  tr int := 0;
  cc int := 0;
  ip int := 0;
  pe int := 0;
  bu int := 0;
BEGIN
  ok := EXISTS (SELECT 1 FROM public.projects p WHERE p.id = p_project_id AND p.owner_id = auth.uid())
     OR EXISTS (
       SELECT 1 FROM public.project_members m
       WHERE m.project_id = p_project_id AND m.user_id = auth.uid()
     );
  IF NOT ok THEN
    RETURN NULL;
  END IF;

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE r.status = 'completed')::int,
    COUNT(*) FILTER (WHERE r.status = 'in_progress')::int,
    COUNT(*) FILTER (WHERE r.status = 'pending')::int,
    COUNT(*) FILTER (WHERE r.type = 'Bug')::int
  INTO tr, cc, ip, pe, bu
  FROM public.requirements r
  INNER JOIN public.version_views vv ON vv.id = r.version_view_id
  WHERE vv.project_id = p_project_id;

  RETURN jsonb_build_object(
    'totalRequirements', COALESCE(tr, 0),
    'completed', COALESCE(cc, 0),
    'inProgress', COALESCE(ip, 0),
    'pending', COALESCE(pe, 0),
    'bugs', COALESCE(bu, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_project_if_accessible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_if_accessible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_if_accessible(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.list_version_views_accessible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_version_views_accessible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_version_views_accessible(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.project_requirement_stats_accessible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_requirement_stats_accessible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_requirement_stats_accessible(uuid) TO service_role;
