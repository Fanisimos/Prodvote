-- ============================================================
-- WHEEL OF FORTUNE DAILY REWARD (replaces fixed 10 coin base)
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id UUID, p_spin_amount INT DEFAULT 10)
RETURNS JSON AS $$
DECLARE
  v_last_login DATE;
  v_streak INT;
  v_today DATE := CURRENT_DATE;
  v_reward INT;
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
    v_streak := 1;
  END IF;

  -- Base reward from wheel spin (5-50, passed from client)
  v_reward := GREATEST(LEAST(p_spin_amount, 50), 5);

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
    'spin_base', p_spin_amount,
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
