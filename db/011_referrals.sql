-- 011: Referral system — invite friends, earn 500 coins
-- Run in Supabase SQL Editor

-- Add referral columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_been_prompted_rating BOOLEAN DEFAULT FALSE;

-- Generate referral codes for existing users who don't have one
UPDATE profiles
SET referral_code = UPPER(SUBSTR(MD5(id::text || NOW()::text), 1, 8))
WHERE referral_code IS NULL;

-- Auto-generate referral code for new users via trigger
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Function to apply referral reward (called after signup)
CREATE OR REPLACE FUNCTION apply_referral_reward(p_referral_code VARCHAR, p_new_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_coins INT;
BEGIN
  -- Find referrer by code
  SELECT id, coins INTO v_referrer_id, v_referrer_coins
  FROM profiles
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Don't let users refer themselves
  IF v_referrer_id = p_new_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check if new user already has a referrer
  IF (SELECT referred_by FROM profiles WHERE id = p_new_user_id) IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already referred');
  END IF;

  -- Set referred_by on new user
  UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;

  -- Give 500 coins to referrer
  UPDATE profiles SET coins = coins + 500 WHERE id = v_referrer_id;

  -- Log the reward
  INSERT INTO coin_rewards (user_id, amount, reward_type)
  VALUES (v_referrer_id, 500, 'referral_bonus');

  RETURN json_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
