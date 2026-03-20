-- Atomic coin reward function: inserts reward record + updates balance in one call
-- Prevents race conditions from read-then-write pattern
CREATE OR REPLACE FUNCTION award_coins_atomic(
  p_user_id UUID,
  p_reward_type TEXT,
  p_amount INT
)
RETURNS void AS $$
BEGIN
  -- Insert reward record
  INSERT INTO coin_rewards (user_id, reward_type, amount)
  VALUES (p_user_id, p_reward_type, p_amount);

  -- Atomically increment coins
  UPDATE profiles
  SET coins = coins + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
