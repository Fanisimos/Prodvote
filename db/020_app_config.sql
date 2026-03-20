-- App configuration table for version checks and feature flags
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert version config
INSERT INTO app_config (key, value) VALUES
  ('min_version', '1.0.0'),
  ('latest_version', '1.0.0'),
  ('force_update_message', 'A new version of Prodvote is available. Please update to continue.'),
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read app config" ON app_config FOR SELECT USING (true);
