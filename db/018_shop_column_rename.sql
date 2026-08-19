-- Align badges + user_frames with app-side names.
-- The app queries badges.price and user_avatar_frames, but the migrations
-- created badges.coin_cost and user_frames — both mismatches make the
-- shop return empty results and any purchase silently no-op.
--
-- These rename to the app-facing names (avatar_frames already uses .price
-- so this also gives badges and frames a consistent column).

ALTER TABLE badges RENAME COLUMN coin_cost TO price;
ALTER TABLE user_frames RENAME TO user_avatar_frames;

NOTIFY pgrst, 'reload schema';
