-- ============================================================
-- COMMENT AWARDS (Reddit-style badges on comments)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============ COMMENT AWARDS TABLE ============
CREATE TABLE comment_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  badge_id INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  giver_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comment_awards_comment ON comment_awards(comment_id);

-- ============ RLS ============
ALTER TABLE comment_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment awards are viewable by everyone" ON comment_awards FOR SELECT USING (true);
CREATE POLICY "Authenticated users can give awards" ON comment_awards FOR INSERT WITH CHECK (auth.uid() = giver_user_id);

-- ============ DEV HEARTED ON FEATURES ============
ALTER TABLE features ADD COLUMN dev_hearted BOOLEAN DEFAULT FALSE;

-- Update the features_with_details view to include dev_hearted
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

-- Allow admin to update features (for dev_hearted)
CREATE POLICY "Admin can update any feature" ON features FOR UPDATE USING (true);
