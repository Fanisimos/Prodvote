-- 009: Add avatar frame data to features_with_details view
-- Run in Supabase SQL Editor

-- Must drop first because f.* column order changed since original creation
DROP VIEW IF EXISTS features_with_details;

CREATE VIEW features_with_details AS
SELECT
  f.*,
  p.username AS author_username,
  p.avatar_url AS author_avatar,
  p.tier AS author_tier,
  af.animation_type AS author_frame_animation,
  af.color AS author_frame_color,
  c.name AS category_name,
  c.color AS category_color,
  c.icon AS category_icon,
  (SELECT COUNT(*) FROM boosts b WHERE b.feature_id = f.id) AS boost_count
FROM features f
JOIN profiles p ON f.user_id = p.id
LEFT JOIN avatar_frames af ON p.active_frame_id = af.id
LEFT JOIN categories c ON f.category_id = c.id;
