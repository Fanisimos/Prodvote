-- Add active_badge_id to profiles so users can display a badge everywhere
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_badge_id INTEGER REFERENCES badges(id) ON DELETE SET NULL;

-- Create a public profiles view for fetching other users' info
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  p.id,
  p.username,
  p.avatar_url,
  p.tier,
  p.coins,
  p.created_at,
  p.active_badge_id,
  b.emoji AS active_badge_emoji,
  b.name AS active_badge_name,
  b.color AS active_badge_color
FROM profiles p
LEFT JOIN badges b ON b.id = p.active_badge_id
WHERE p.is_banned = false;

-- Grant access
GRANT SELECT ON public_profiles TO authenticated, anon;
