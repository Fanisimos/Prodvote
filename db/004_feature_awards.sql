-- ============================================================
-- FEATURE AWARDS (give awards to feature submissions)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============ FEATURE AWARDS TABLE ============
CREATE TABLE feature_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  badge_id INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  giver_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_awards_feature ON feature_awards(feature_id);

-- ============ RLS ============
ALTER TABLE feature_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feature awards are viewable by everyone" ON feature_awards FOR SELECT USING (true);
CREATE POLICY "Authenticated users can give feature awards" ON feature_awards FOR INSERT WITH CHECK (auth.uid() = giver_user_id);

-- ============ ADD INNOVATOR BADGE ============
INSERT INTO badges (name, emoji, description, price, color) VALUES
  ('Innovator', '💡', 'Brilliant idea that pushes boundaries', 200, '#ffb347');
