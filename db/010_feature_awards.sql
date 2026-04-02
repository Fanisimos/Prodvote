-- 010: Feature Awards — spend coins to give animated awards to feature posts
-- Run in Supabase SQL Editor

-- Award definitions
CREATE TABLE IF NOT EXISTS award_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  description TEXT,
  coin_cost INT NOT NULL DEFAULT 50,
  animation VARCHAR(30) DEFAULT 'bounce',
  color VARCHAR(7) DEFAULT '#FFD700',
  sort_order INT DEFAULT 0
);

-- Awards given to features
CREATE TABLE IF NOT EXISTS feature_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  award_type_id INT NOT NULL REFERENCES award_types(id) ON DELETE CASCADE,
  giver_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_feature_awards_feature ON feature_awards(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_awards_giver ON feature_awards(giver_user_id);

-- RLS
ALTER TABLE award_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Award types viewable by everyone" ON award_types FOR SELECT USING (true);
CREATE POLICY "Feature awards viewable by everyone" ON feature_awards FOR SELECT USING (true);
CREATE POLICY "Authenticated users can give awards" ON feature_awards FOR INSERT WITH CHECK (auth.uid() = giver_user_id);

-- Seed award types
INSERT INTO award_types (name, emoji, description, coin_cost, animation, color, sort_order) VALUES
  ('Fire',       '🔥', 'This idea is on fire!',           50,  'flame',    '#FF4500', 1),
  ('Brilliant',  '💡', 'Absolutely brilliant idea',       100, 'glow',     '#FFD700', 2),
  ('Rocket',     '🚀', 'Ship it now!',                    100, 'launch',   '#7C5CFC', 3),
  ('Diamond',    '💎', 'Rare and precious idea',          250, 'sparkle',  '#00D4FF', 4),
  ('Crown',      '👑', 'The king of feature requests',    500, 'shine',    '#FFD700', 5),
  ('Supernova',  '🌟', 'Game-changing suggestion',        750, 'explode',  '#BE4BDB', 6),
  ('Legendary',  '⚡', 'Legendary status achieved',      1000, 'electric', '#FFD700', 7);

-- View to count awards per feature grouped by type
CREATE OR REPLACE VIEW feature_award_counts AS
SELECT
  fa.feature_id,
  at.id AS award_type_id,
  at.name,
  at.emoji,
  at.animation,
  at.color,
  COUNT(*) AS count
FROM feature_awards fa
JOIN award_types at ON fa.badge_id = at.id
GROUP BY fa.feature_id, at.id, at.name, at.emoji, at.animation, at.color;
