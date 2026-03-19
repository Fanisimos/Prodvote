-- 012: Tier perks implementation
-- Vote limits, monthly coin grants (auto per-user), vote weight, gold names

-- ============================================
-- 1. ADD SUBSCRIPTION TRACKING COLUMNS
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_monthly_grant_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_vote_reset_at TIMESTAMPTZ;

-- ============================================
-- 2. VOTE LIMITS PER TIER
-- ============================================

CREATE OR REPLACE FUNCTION get_vote_limit(user_tier TEXT)
RETURNS INT AS $$
BEGIN
  CASE user_tier
    WHEN 'free' THEN RETURN 3;
    WHEN 'pro' THEN RETURN 10;
    WHEN 'ultra' THEN RETURN 9999;
    WHEN 'legendary' THEN RETURN 9999;
    ELSE RETURN 3;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_monthly_coins(user_tier TEXT)
RETURNS INT AS $$
BEGIN
  CASE user_tier
    WHEN 'pro' THEN RETURN 300;
    WHEN 'ultra' THEN RETURN 1000;
    WHEN 'legendary' THEN RETURN 2500;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 3. AUTO MONTHLY RENEWAL CHECK (called on login/app open)
-- Checks if 30 days passed since last grant for THIS user
-- ============================================

CREATE OR REPLACE FUNCTION check_monthly_renewal(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile RECORD;
  v_coins_amount INT;
  v_votes_reset BOOLEAN := FALSE;
  v_coins_granted BOOLEAN := FALSE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('renewed', false);
  END IF;

  -- Skip free users (no monthly perks)
  IF v_profile.tier = 'free' THEN
    -- Still reset votes if needed (free users get 3/month)
    IF v_profile.last_vote_reset_at IS NULL
       OR v_now - v_profile.last_vote_reset_at >= INTERVAL '30 days' THEN
      UPDATE profiles
      SET votes_remaining = get_vote_limit('free'),
          last_vote_reset_at = v_now
      WHERE id = p_user_id;
      v_votes_reset := TRUE;
    END IF;
    RETURN json_build_object('renewed', v_votes_reset, 'votes_reset', v_votes_reset, 'coins_granted', 0);
  END IF;

  -- Check if 30 days have passed since last monthly grant
  IF v_profile.last_monthly_grant_at IS NULL
     OR v_now - v_profile.last_monthly_grant_at >= INTERVAL '30 days' THEN

    v_coins_amount := get_monthly_coins(v_profile.tier);

    -- Grant coins
    IF v_coins_amount > 0 THEN
      UPDATE profiles
      SET coins = coins + v_coins_amount,
          last_monthly_grant_at = v_now
      WHERE id = p_user_id;

      -- Log the grant
      INSERT INTO coin_rewards (user_id, reward_type, amount)
      VALUES (p_user_id, 'monthly_' || v_profile.tier, v_coins_amount);

      v_coins_granted := TRUE;
    END IF;
  END IF;

  -- Check if 30 days have passed since last vote reset
  IF v_profile.last_vote_reset_at IS NULL
     OR v_now - v_profile.last_vote_reset_at >= INTERVAL '30 days' THEN

    UPDATE profiles
    SET votes_remaining = get_vote_limit(v_profile.tier),
        last_vote_reset_at = v_now
    WHERE id = p_user_id;

    v_votes_reset := TRUE;
  END IF;

  RETURN json_build_object(
    'renewed', v_coins_granted OR v_votes_reset,
    'coins_granted', COALESCE(v_coins_amount, 0),
    'votes_reset', v_votes_reset,
    'tier', v_profile.tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. VOTE WITH LIMITS + WEIGHT
-- ============================================

CREATE OR REPLACE FUNCTION use_vote(p_user_id UUID, p_feature_id UUID)
RETURNS JSON AS $$
DECLARE
  v_tier TEXT;
  v_remaining INT;
  v_weight INT;
BEGIN
  SELECT tier, votes_remaining INTO v_tier, v_remaining
  FROM profiles WHERE id = p_user_id;

  -- Unlimited for ultra/legendary with 3x weight
  IF v_tier IN ('ultra', 'legendary') THEN
    v_weight := 3;
    INSERT INTO votes (feature_id, user_id, weight) VALUES (p_feature_id, p_user_id, v_weight);
    RETURN json_build_object('success', true, 'votes_remaining', -1, 'weight', v_weight);
  END IF;

  -- Check vote limit
  IF v_remaining <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No votes remaining this month', 'votes_remaining', 0);
  END IF;

  v_weight := 1;
  UPDATE profiles SET votes_remaining = votes_remaining - 1 WHERE id = p_user_id;
  INSERT INTO votes (feature_id, user_id, weight) VALUES (p_feature_id, p_user_id, v_weight);

  RETURN json_build_object('success', true, 'votes_remaining', v_remaining - 1, 'weight', v_weight);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. REMOVE VOTE (gives back for free/pro)
-- ============================================

CREATE OR REPLACE FUNCTION remove_vote(p_user_id UUID, p_feature_id UUID)
RETURNS JSON AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier INTO v_tier FROM profiles WHERE id = p_user_id;

  DELETE FROM votes WHERE feature_id = p_feature_id AND user_id = p_user_id;

  IF v_tier NOT IN ('ultra', 'legendary') THEN
    UPDATE profiles SET votes_remaining = LEAST(votes_remaining + 1, get_vote_limit(v_tier))
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TIER CHANGE TRIGGER
-- When tier changes: reset votes, set subscription_started_at, reset grant timer
-- ============================================

CREATE OR REPLACE FUNCTION on_tier_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    NEW.votes_remaining := get_vote_limit(NEW.tier);
    NEW.last_vote_reset_at := NOW();

    -- If upgrading from free, start subscription timer + grant first month coins
    IF OLD.tier = 'free' AND NEW.tier != 'free' THEN
      NEW.subscription_started_at := NOW();
      NEW.last_monthly_grant_at := NOW();
      NEW.coins := NEW.coins + get_monthly_coins(NEW.tier);

      INSERT INTO coin_rewards (user_id, reward_type, amount)
      VALUES (NEW.id, 'monthly_' || NEW.tier, get_monthly_coins(NEW.tier));

    -- If changing between paid tiers, keep subscription date but grant difference
    ELSIF OLD.tier != 'free' AND NEW.tier != 'free' THEN
      -- Reset grant timer so they get full month of new tier
      NEW.last_monthly_grant_at := NOW();

    -- If downgrading to free, clear subscription
    ELSIF NEW.tier = 'free' THEN
      NEW.subscription_started_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tier_change ON profiles;
CREATE TRIGGER trigger_tier_change
  BEFORE UPDATE OF tier ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION on_tier_change();

-- ============================================
-- 7. WEIGHTED SCORE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_feature_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE features
    SET score = (SELECT COALESCE(SUM(weight), 0) FROM votes WHERE feature_id = NEW.feature_id),
        vote_count = (SELECT COUNT(*) FROM votes WHERE feature_id = NEW.feature_id)
    WHERE id = NEW.feature_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE features
    SET score = (SELECT COALESCE(SUM(weight), 0) FROM votes WHERE feature_id = OLD.feature_id),
        vote_count = (SELECT COUNT(*) FROM votes WHERE feature_id = OLD.feature_id)
    WHERE id = OLD.feature_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_score ON votes;
CREATE TRIGGER trigger_update_score
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_score();

-- ============================================
-- 8. Add is_priority column to features
-- ============================================

ALTER TABLE features ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE;

-- ============================================
-- 9. INITIALIZE EXISTING USERS
-- ============================================

-- Set vote limits for all existing users
UPDATE profiles SET votes_remaining = get_vote_limit(tier)
WHERE last_vote_reset_at IS NULL;

-- Set subscription_started_at for existing paid users
UPDATE profiles SET subscription_started_at = created_at
WHERE tier != 'free' AND subscription_started_at IS NULL;

-- Set last grant/reset timestamps so they don't get a double grant on first login
UPDATE profiles
SET last_monthly_grant_at = COALESCE(last_monthly_grant_at, NOW()),
    last_vote_reset_at = COALESCE(last_vote_reset_at, NOW())
WHERE tier != 'free';

UPDATE profiles
SET last_vote_reset_at = COALESCE(last_vote_reset_at, NOW())
WHERE tier = 'free';
