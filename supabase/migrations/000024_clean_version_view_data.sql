-- Clear recursively-nested version_views.data to prevent stale cached snapshots.
-- The field will be rebuilt cleanly by syncVersionViewData on the next mutation.
UPDATE version_views SET data = '{}'::jsonb WHERE data IS NOT NULL;
