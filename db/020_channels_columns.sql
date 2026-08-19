-- Missing channels columns the app expects but were never in migrations.
-- Chat tab queries .order('sort_order') and renders `channel.is_locked`.
-- Admin dashboard uses is_locked to prevent deleting the default channel.

ALTER TABLE channels ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

UPDATE channels SET is_locked = true WHERE is_default = true AND is_locked = false;

NOTIFY pgrst, 'reload schema';
