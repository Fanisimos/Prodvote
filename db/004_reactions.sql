-- Reactions on feature requests
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS feature_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '🤔', '👀', '❤️', '🎉')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_feature_reactions_feature ON feature_reactions(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_reactions_user ON feature_reactions(user_id);

-- Enable RLS
ALTER TABLE feature_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON feature_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add reactions" ON feature_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON feature_reactions FOR DELETE USING (auth.uid() = user_id);

-- View: reaction counts per feature
CREATE OR REPLACE VIEW feature_reaction_counts AS
SELECT
  feature_id,
  emoji,
  COUNT(*) as count
FROM feature_reactions
GROUP BY feature_id, emoji;
