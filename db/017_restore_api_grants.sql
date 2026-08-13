-- Restore Supabase default grants after any DROP SCHEMA public CASCADE.
--
-- Supabase provisions new projects with GRANT ALL on public to the anon,
-- authenticated, and service_role API roles. Dropping and recreating the
-- schema wipes those grants and PostgREST responds 42501 "permission
-- denied for table X" even when RLS policies would otherwise allow it.
--
-- Row-level access is still enforced by the RLS policies defined in
-- earlier migrations — these grants just let PostgREST see the tables.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
