-- ============================================================
-- COIN REWARD SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================

-- Track daily logins and coin rewards
CREATE TABLE IF NOT EXISTS coin_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL, -- 'daily_login', 'vote', 'comment', 'feature_submitted', 'streak_bonus', 'monthly_tier'
  amount INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coin_rewards_user ON coin_rewards(user_id);
CREATE INDEX idx_coin_rewards_type ON coin_rewards(user_id, reward_type, created_at);

-- Track login streaks
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_streak INT DEFAULT 0;

-- RLS
ALTER TABLE coin_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rewards" ON coin_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rewards" ON coin_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to claim daily login reward
CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_last_login DATE;
  v_streak INT;
  v_today DATE := CURRENT_DATE;
  v_reward INT;
  v_already_claimed BOOLEAN;
  v_tier TEXT;
BEGIN
  -- Get current profile
  SELECT last_login_date, login_streak, tier INTO v_last_login, v_streak, v_tier
  FROM profiles WHERE id = p_user_id;

  -- Check if already claimed today
  IF v_last_login = v_today THEN
    RETURN json_build_object('success', false, 'reason', 'already_claimed', 'streak', v_streak);
  END IF;

  -- Calculate streak
  IF v_last_login = v_today - 1 THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    v_streak := 1; -- Reset streak
  END IF;

  -- Base reward: 10 coins per day
  v_reward := 10;

  -- Streak bonus: +5 per streak day (max +50)
  v_reward := v_reward + LEAST(v_streak * 5, 50);

  -- Tier bonus
  IF v_tier = 'pro' THEN v_reward := v_reward * 2;
  ELSIF v_tier = 'ultra' THEN v_reward := v_reward * 3;
  ELSIF v_tier = 'legendary' THEN v_reward := v_reward * 4;
  END IF;

  -- Update profile
  UPDATE profiles SET
    coins = coins + v_reward,
    last_login_date = v_today,
    login_streak = v_streak
  WHERE id = p_user_id;

  -- Log reward
  INSERT INTO coin_rewards (user_id, reward_type, amount)
  VALUES (p_user_id, 'daily_login', v_reward);

  RETURN json_build_object(
    'success', true,
    'coins_earned', v_reward,
    'streak', v_streak,
    'tier_multiplier', CASE v_tier
      WHEN 'pro' THEN 2
      WHEN 'ultra' THEN 3
      WHEN 'legendary' THEN 4
      ELSE 1
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
