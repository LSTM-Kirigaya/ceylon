-- Bypass broken RLS recursion on some deployments: create project as SECURITY DEFINER.
-- auth.uid() still reflects the caller.

CREATE OR REPLACE FUNCTION public.create_owned_project(p_name text, p_description text)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.projects;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Name required';
  END IF;

  INSERT INTO public.projects (name, description, owner_id)
  VALUES (
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    auth.uid()
  )
  RETURNING * INTO r;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.create_owned_project(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_owned_project(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_owned_project(text, text) TO service_role;
