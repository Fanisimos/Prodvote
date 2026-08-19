-- Fill in schema pieces that were dashboard-created in the old project
-- and never captured as migrations. Surface bugs after the DB migration:
--   1. Fortune Wheel: profiles.last_daily_reward_at and login_streak missing
--   2. Frame purchase: purchase_avatar_frame RPC missing
--   3. Avatar upload: avatars storage bucket missing

-- 1. Daily reward columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_reward_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_streak INT DEFAULT 0;

-- 2. RPC to buy an avatar frame atomically.
--    Charges coins, records ownership, sets it active.
CREATE OR REPLACE FUNCTION purchase_avatar_frame(
  p_user_id UUID,
  p_frame_id UUID,
  p_price INT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coins INT;
BEGIN
  SELECT coins INTO v_coins FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF v_coins < p_price THEN
    RAISE EXCEPTION 'Not enough coins';
  END IF;

  UPDATE profiles
  SET coins = coins - p_price,
      active_frame_id = p_frame_id
  WHERE id = p_user_id;

  INSERT INTO user_avatar_frames (user_id, frame_id)
  VALUES (p_user_id, p_frame_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO coin_rewards (user_id, amount, reward_type)
  VALUES (p_user_id, -p_price, 'frame_purchase');
END;
$$;

GRANT EXECUTE ON FUNCTION purchase_avatar_frame(UUID, UUID, INT) TO authenticated;

-- 3. Storage bucket for avatars (public read, auth write).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for the avatars bucket
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

NOTIFY pgrst, 'reload schema';
