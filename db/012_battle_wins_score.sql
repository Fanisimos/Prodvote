-- Integrate Idea Battles into feed ranking
-- Adds battle_wins column on features and bumps score when a battle is won.

ALTER TABLE features ADD COLUMN IF NOT EXISTS battle_wins INT DEFAULT 0;

-- Backfill from existing battle votes
UPDATE features f SET battle_wins = sub.wins
FROM (
  SELECT winner_id, COUNT(*) AS wins
  FROM idea_battle_votes
  GROUP BY winner_id
) sub
WHERE f.id = sub.winner_id;

-- Recompute score to include battle wins (weight = 2 per win)
UPDATE features
SET score = COALESCE((SELECT SUM(weight) FROM votes WHERE feature_id = features.id), 0)
          + COALESCE(battle_wins, 0) * 2;

-- Update existing vote-score trigger to keep including battle_wins
CREATE OR REPLACE FUNCTION update_feature_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE features SET
    score = COALESCE((SELECT SUM(weight) FROM votes WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id)), 0)
          + COALESCE(battle_wins, 0) * 2,
    vote_count = (SELECT COUNT(*) FROM votes WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id))
  WHERE id = COALESCE(NEW.feature_id, OLD.feature_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Increment battle_wins + score on each battle vote
CREATE OR REPLACE FUNCTION bump_battle_wins()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE features
  SET battle_wins = COALESCE(battle_wins, 0) + 1,
      score = COALESCE(score, 0) + 2
  WHERE id = NEW.winner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_battle_wins ON idea_battle_votes;
CREATE TRIGGER trg_bump_battle_wins
AFTER INSERT ON idea_battle_votes
FOR EACH ROW EXECUTE FUNCTION bump_battle_wins();

-- Rebuild features_with_details view to expose battle_wins
DROP VIEW IF EXISTS features_with_details;
CREATE VIEW features_with_details AS
SELECT
  f.id, f.user_id, f.title, f.description, f.category_id, f.status,
  f.score, f.vote_count, f.comment_count, f.is_boosted, f.is_priority,
  f.battle_wins,
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
