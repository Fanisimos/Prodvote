  -- Daily fortune wheel reward function
  -- Run this in Supabase SQL Editor

  CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id UUID)
  RETURNS INT AS $$
  DECLARE
    last_claim TIMESTAMPTZ;
    coins_won INT;
    weights INT[] := ARRAY[10, 20, 30, 50, 10, 20, 100, 15];
    roll INT;
    cumulative INT := 0;
    i INT;
  BEGIN
    -- Check last claim time
    SELECT last_daily_reward_at INTO last_claim
    FROM profiles
    WHERE id = p_user_id;

    -- If claimed within last 24 hours, reject
    IF last_claim IS NOT NULL AND last_claim > NOW() - INTERVAL '24 hours' THEN
      RAISE EXCEPTION 'Already claimed today';
    END IF;

    -- Weighted random: pick a segment
    -- Weights: 10(25%), 20(20%), 30(15%), 50(15%), 10(10%), 20(5%), 100(5%), 15(5%)
    roll := floor(random() * 100)::INT;

    IF roll < 25 THEN coins_won := 10;
    ELSIF roll < 45 THEN coins_won := 20;
    ELSIF roll < 60 THEN coins_won := 30;
    ELSIF roll < 75 THEN coins_won := 50;
    ELSIF roll < 85 THEN coins_won := 10;
    ELSIF roll < 90 THEN coins_won := 20;
    ELSIF roll < 95 THEN coins_won := 100;
    ELSE coins_won := 15;
    END IF;

    -- Update profile: add coins, update streak, set last claim time
    UPDATE profiles
    SET coins = coins + coins_won,
        last_daily_reward_at = NOW(),
        login_streak = CASE
          WHEN last_claim IS NULL THEN 1
          WHEN last_claim > NOW() - INTERVAL '48 hours' THEN COALESCE(login_streak, 0) + 1
          ELSE 1
        END
    WHERE id = p_user_id;

    -- Log the reward
    INSERT INTO coin_rewards (user_id, amount, reward_type)
    VALUES (p_user_id, coins_won, 'daily_wheel');

    RETURN coins_won;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
