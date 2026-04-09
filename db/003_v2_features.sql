-- =============================================================
-- Prodvote v2: Idea Battles, Boosts, Contributors, Feature Flags
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. IDEA BATTLES VOTES
CREATE TABLE IF NOT EXISTS idea_battle_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  idea_a_id UUID REFERENCES features(id) ON DELETE CASCADE NOT NULL,
  idea_b_id UUID REFERENCES features(id) ON DELETE CASCADE NOT NULL,
  winner_id UUID REFERENCES features(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battle_votes_user ON idea_battle_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_votes_winner ON idea_battle_votes(winner_id);
CREATE INDEX IF NOT EXISTS idx_battle_votes_created ON idea_battle_votes(created_at DESC);

-- 2. BOOSTS (extend existing table or create if missing)
CREATE TABLE IF NOT EXISTS boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boosts_feature ON boosts(feature_id);
CREATE INDEX IF NOT EXISTS idx_boosts_user ON boosts(user_id);

-- Add boost_count to features if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'features' AND column_name = 'boost_count') THEN
    ALTER TABLE features ADD COLUMN boost_count INT DEFAULT 0;
  END IF;
END $$;

-- 3. CONTRIBUTOR STATS (materialized as columns on profiles for speed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'ideas_submitted') THEN
    ALTER TABLE profiles ADD COLUMN ideas_submitted INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_votes_cast') THEN
    ALTER TABLE profiles ADD COLUMN total_votes_cast INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'winning_ideas') THEN
    ALTER TABLE profiles ADD COLUMN winning_ideas INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'contributor_badge') THEN
    ALTER TABLE profiles ADD COLUMN contributor_badge TEXT DEFAULT NULL;
  END IF;
END $$;

-- 4. FEATURE FLAGS
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default flags
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('idea_battles', true, 'Enable Idea Battles tab in feed'),
  ('boost_idea', true, 'Enable Boost Idea button on feature cards'),
  ('contributor_badges', true, 'Show contributor badges next to usernames'),
  ('ai_improve', true, 'Enable AI Improve button on submit screen'),
  ('built_by_community', true, 'Show community metadata on apps')
ON CONFLICT (key) DO NOTHING;

-- 5. APP METADATA for "Built by Community"
CREATE TABLE IF NOT EXISTS app_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT UNIQUE NOT NULL,
  suggested_by TEXT,
  vote_count INT DEFAULT 0,
  status TEXT DEFAULT 'shipped',
  is_featured BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert defaults for existing apps
INSERT INTO app_metadata (app_id, suggested_by, vote_count, status, is_featured) VALUES
  ('eisenhower', NULL, 0, 'shipped', true),
  ('pomodoro', NULL, 0, 'shipped', true),
  ('habits', NULL, 0, 'shipped', true),
  ('notes', NULL, 0, 'shipped', true),
  ('journal', NULL, 0, 'shipped', false),
  ('plans', NULL, 0, 'shipped', false),
  ('breathe', NULL, 0, 'shipped', false),
  ('hiit', NULL, 0, 'shipped', false),
  ('kanban', NULL, 0, 'shipped', false),
  ('whiteboard', NULL, 0, 'shipped', false),
  ('lunar-patrol', NULL, 0, 'shipped', true),
  ('snake', NULL, 0, 'shipped', false)
ON CONFLICT (app_id) DO NOTHING;

-- 6. RPC: Boost a feature (atomic coin deduction + boost insert)
CREATE OR REPLACE FUNCTION boost_feature(p_user_id UUID, p_feature_id UUID, p_cost INT DEFAULT 50)
RETURNS BOOLEAN AS $$
DECLARE
  v_coins INT;
  v_boosts INT;
BEGIN
  -- Check coins
  SELECT coins, boosts_remaining INTO v_coins, v_boosts FROM profiles WHERE id = p_user_id;
  IF v_coins < p_cost THEN
    RETURN false;
  END IF;

  -- Deduct coins and boost
  UPDATE profiles SET coins = coins - p_cost, boosts_remaining = GREATEST(0, boosts_remaining - 1) WHERE id = p_user_id;
  INSERT INTO boosts (user_id, feature_id) VALUES (p_user_id, p_feature_id);
  UPDATE features SET boost_count = COALESCE(boost_count, 0) + 1, is_boosted = true WHERE id = p_feature_id;

  -- Log coin transaction
  INSERT INTO coin_rewards (user_id, reward_type, amount) VALUES (p_user_id, 'boost_purchase', -p_cost);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update contributor stats function (call periodically or via trigger)
CREATE OR REPLACE FUNCTION refresh_contributor_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_submitted INT;
  v_votes INT;
  v_shipped INT;
  v_badge TEXT;
BEGIN
  SELECT COUNT(*) INTO v_submitted FROM features WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_votes FROM votes WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_shipped FROM features WHERE user_id = p_user_id AND status = 'shipped';

  -- Determine badge tier
  IF v_shipped >= 5 THEN v_badge := 'legend';
  ELSIF v_shipped >= 2 THEN v_badge := 'builder';
  ELSIF v_submitted >= 10 THEN v_badge := 'prolific';
  ELSIF v_votes >= 50 THEN v_badge := 'power_voter';
  ELSIF v_submitted >= 3 THEN v_badge := 'contributor';
  ELSE v_badge := NULL;
  END IF;

  UPDATE profiles SET
    ideas_submitted = v_submitted,
    total_votes_cast = v_votes,
    winning_ideas = v_shipped,
    contributor_badge = v_badge
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update features_with_details view to include contributor_badge
DROP VIEW IF EXISTS features_with_details;
CREATE VIEW features_with_details AS
SELECT
  f.id, f.user_id, f.title, f.description, f.category_id, f.status,
  f.score, f.vote_count, f.comment_count, f.is_boosted, f.is_priority,
  f.dev_response, f.created_at, f.shipped_at,
  p.username AS author_username,
  p.avatar_url AS author_avatar,
  p.tier AS author_tier,
  p.contributor_badge AS author_contributor_badge,
  af.animation_type AS author_frame_animation,
  af.color AS author_frame_color,
  c.name AS category_name,
  c.color AS category_color,
  c.icon AS category_icon,
  (SELECT COUNT(*) FROM boosts b WHERE b.feature_id = f.id)::INT AS boost_count
FROM features f
JOIN profiles p ON f.user_id = p.id
LEFT JOIN avatar_frames af ON p.active_frame_id = af.id
LEFT JOIN categories c ON f.category_id = c.id;

-- Enable RLS
ALTER TABLE idea_battle_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_metadata ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert their own battle votes" ON idea_battle_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read all battle votes" ON idea_battle_votes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT USING (true);
CREATE POLICY "Only admins can update feature flags" ON feature_flags
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Anyone can read app metadata" ON app_metadata
  FOR SELECT USING (true);
CREATE POLICY "Only admins can manage app metadata" ON app_metadata
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
