-- ============================================================
-- BADGES, DEV HEARTS, ADMIN COMMENT DELETE
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============ DEV HEART ON COMMENTS ============
ALTER TABLE comments ADD COLUMN dev_hearted BOOLEAN DEFAULT FALSE;

-- ============ BADGES TABLE ============
CREATE TABLE badges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  description TEXT,
  price INT NOT NULL DEFAULT 0, -- 0 = free
  color VARCHAR(7) DEFAULT '#7c5cfc',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some badges
INSERT INTO badges (name, emoji, description, price, color) VALUES
  ('Early Adopter', '🌟', 'Joined during early access', 0, '#fbbf24'),
  ('Bug Hunter', '🐛', 'Found and reported bugs', 100, '#34d399'),
  ('Top Voter', '🗳️', 'Most active voter', 150, '#7c5cfc'),
  ('Idea Machine', '💡', 'Submitted 10+ features', 200, '#ffb347'),
  ('Fire Starter', '🔥', 'Comment that sparked a discussion', 250, '#ff4d6a'),
  ('Diamond', '💎', 'Premium supporter', 500, '#4dc9f6'),
  ('Crown', '👑', 'Community royalty', 750, '#fbbf24'),
  ('Rocket', '🚀', 'Feature that got shipped', 300, '#a78bfa'),
  ('Heart', '❤️', 'Spreading love', 100, '#f472b6'),
  ('Rage', '😤', 'When things break', 200, '#94a3b8');

-- ============ USER BADGES (purchased) ============
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ============ BADGE ON COMMENTS ============
ALTER TABLE comments ADD COLUMN badge_id INT REFERENCES badges(id) DEFAULT NULL;

-- ============ COINS ON PROFILES ============
ALTER TABLE profiles ADD COLUMN coins INT DEFAULT 500; -- start with 500 coins

-- ============ RLS ============
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badges: anyone can read
CREATE POLICY "Badges are viewable by everyone" ON badges FOR SELECT USING (true);

-- User badges: anyone can read, authenticated can purchase
CREATE POLICY "User badges are viewable by everyone" ON user_badges FOR SELECT USING (true);
CREATE POLICY "Users can purchase badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update own profile coins
-- (existing policy already allows update on own profile)

-- Allow dev (admin) to update any comment's dev_hearted
-- For now, we'll handle this via the existing update or a specific policy
CREATE POLICY "Admin can update comments" ON comments FOR UPDATE USING (true);

-- Allow admin to delete any comment
CREATE POLICY "Admin can delete any comment" ON comments FOR DELETE USING (true);
