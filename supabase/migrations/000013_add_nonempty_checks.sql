-- Enforce non-empty business-required text fields.

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_name_not_blank;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_name_not_blank CHECK (length(btrim(name)) > 0);

ALTER TABLE public.version_views
  DROP CONSTRAINT IF EXISTS version_views_name_not_blank;
ALTER TABLE public.version_views
  ADD CONSTRAINT version_views_name_not_blank CHECK (length(btrim(name)) > 0);

ALTER TABLE public.requirements
  DROP CONSTRAINT IF EXISTS requirements_title_not_blank;
ALTER TABLE public.requirements
  ADD CONSTRAINT requirements_title_not_blank CHECK (length(btrim(title)) > 0);
