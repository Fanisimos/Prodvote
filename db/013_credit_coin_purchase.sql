-- Atomic, idempotent server-side coin credit for IAP purchases.
-- Uses the App Store transaction_id as the idempotency key so a re-delivered
-- StoreKit transaction cannot double-credit coins.

-- Add a unique txn_id column to coin_rewards so we can dedupe.
ALTER TABLE coin_rewards ADD COLUMN IF NOT EXISTS txn_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_rewards_txn_id
  ON coin_rewards(txn_id) WHERE txn_id IS NOT NULL;

-- Drop the old signature if present
DROP FUNCTION IF EXISTS credit_coin_purchase(UUID, INT, TEXT);

CREATE OR REPLACE FUNCTION credit_coin_purchase(
  p_user_id UUID,
  p_amount INT,
  p_product_id TEXT,
  p_txn_id TEXT DEFAULT NULL
) RETURNS TABLE(credited BOOLEAN, new_balance INT) AS $$
DECLARE
  v_balance INT;
BEGIN
  -- If we've already recorded this transaction, no-op and return current balance.
  IF p_txn_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM coin_rewards WHERE txn_id = p_txn_id
  ) THEN
    SELECT coins INTO v_balance FROM profiles WHERE id = p_user_id;
    RETURN QUERY SELECT FALSE, v_balance;
    RETURN;
  END IF;

  UPDATE profiles
  SET coins = COALESCE(coins, 0) + p_amount
  WHERE id = p_user_id
  RETURNING coins INTO v_balance;

  INSERT INTO coin_rewards (user_id, amount, reward_type, txn_id)
  VALUES (p_user_id, p_amount, 'iap_' || p_product_id, p_txn_id);

  RETURN QUERY SELECT TRUE, v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION credit_coin_purchase(UUID, INT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit_coin_purchase(UUID, INT, TEXT, TEXT) TO authenticated;
