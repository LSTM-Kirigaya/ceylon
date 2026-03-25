-- When projects SELECT policies recurse with project_members, list owned projects safely.

CREATE OR REPLACE FUNCTION public.list_owned_projects()
RETURNS SETOF public.projects
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.projects
  WHERE owner_id = auth.uid()
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_owned_projects() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_owned_projects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_owned_projects() TO service_role;
