-- 015: Grant coin pack function (for IAP coin purchases)

CREATE OR REPLACE FUNCTION grant_coin_pack(p_user_id UUID, p_amount INT)
RETURNS JSON AS $$
BEGIN
  UPDATE profiles
  SET coins = coins + p_amount
  WHERE id = p_user_id;

  INSERT INTO coin_rewards (user_id, reward_type, amount)
  VALUES (p_user_id, 'coin_pack_' || p_amount, p_amount);

  RETURN json_build_object('success', true, 'coins_granted', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
