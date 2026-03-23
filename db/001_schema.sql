-- ============================================================
-- PRODVOTE DATABASE SCHEMA
-- Run this in Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- ============ PROFILES ============
-- Extends Supabase auth.users with app-specific data
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(30) UNIQUE NOT NULL,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro')),
  votes_remaining INT DEFAULT 3,
  votes_reset_at TIMESTAMPTZ DEFAULT NOW(),
  boosts_remaining INT DEFAULT 0,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CATEGORIES ============
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#7c5cfc',
  icon VARCHAR(50) DEFAULT 'lightbulb'
);

INSERT INTO categories (name, color, icon) VALUES
  ('General', '#7c5cfc', 'lightbulb'),
  ('UI/UX', '#ff4d6a', 'palette'),
  ('Performance', '#34d399', 'zap'),
  ('New Feature', '#ffb347', 'star'),
  ('Integration', '#4dc9f6', 'link'),
  ('Bug Fix', '#f472b6', 'bug');

-- ============ FEATURES ============
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category_id INT REFERENCES categories(id) DEFAULT 1,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'planned', 'in_progress', 'shipped', 'declined')),
  score NUMERIC DEFAULT 0,
  vote_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  is_boosted BOOLEAN DEFAULT FALSE,
  dev_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ
);

-- ============ VOTES ============
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  weight INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_id)
);

-- ============ COMMENTS ============
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_dev_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ BOOSTS ============
CREATE TABLE boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_id)
);

-- ============ INDEXES ============
CREATE INDEX idx_features_score ON features(score DESC);
CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_features_user ON features(user_id);
CREATE INDEX idx_features_created ON features(created_at DESC);
CREATE INDEX idx_votes_feature ON votes(feature_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_comments_feature ON comments(feature_id);
CREATE INDEX idx_boosts_feature ON boosts(feature_id);

-- ============ AUTO-UPDATE SCORE ON VOTE ============
CREATE OR REPLACE FUNCTION update_feature_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE features SET
    score = COALESCE((SELECT SUM(weight) FROM votes WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id)), 0),
    vote_count = (SELECT COUNT(*) FROM votes WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id))
  WHERE id = COALESCE(NEW.feature_id, OLD.feature_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_vote_score
AFTER INSERT OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_feature_score();

-- ============ AUTO-UPDATE COMMENT COUNT ============
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE features SET
    comment_count = (SELECT COUNT(*) FROM comments WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id))
  WHERE id = COALESCE(NEW.feature_id, OLD.feature_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ MONTHLY VOTE RESET ============
CREATE OR REPLACE FUNCTION reset_votes_if_needed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.votes_reset_at < NOW() - INTERVAL '30 days' THEN
    NEW.votes_remaining = CASE NEW.tier
      WHEN 'free' THEN 3
      WHEN 'basic' THEN 15
      WHEN 'pro' THEN 999
      ELSE 3
    END;
    NEW.votes_reset_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_votes
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION reset_votes_if_needed();

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, users can update own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Features: anyone can read, authenticated can create
CREATE POLICY "Features are viewable by everyone" ON features FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create features" ON features FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own features" ON features FOR UPDATE USING (auth.uid() = user_id);

-- Votes: anyone can read, authenticated can create/delete own
CREATE POLICY "Votes are viewable by everyone" ON votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own votes" ON votes FOR DELETE USING (auth.uid() = user_id);

-- Comments: anyone can read, authenticated can create
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Boosts: anyone can read, authenticated can create
CREATE POLICY "Boosts are viewable by everyone" ON boosts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can boost" ON boosts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Categories: anyone can read
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- ============ VIEWS ============
CREATE OR REPLACE VIEW features_with_details AS
SELECT
  f.*,
  p.username AS author_username,
  p.avatar_url AS author_avatar,
  p.tier AS author_tier,
  c.name AS category_name,
  c.color AS category_color,
  c.icon AS category_icon,
  (SELECT COUNT(*) FROM boosts b WHERE b.feature_id = f.id) AS boost_count
FROM features f
JOIN profiles p ON f.user_id = p.id
LEFT JOIN categories c ON f.category_id = c.id;
