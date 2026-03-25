-- Store a full version view snapshot as a single JSONB field.
-- This enables loading a whole version view in one request.

ALTER TABLE public.version_views
  ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;

