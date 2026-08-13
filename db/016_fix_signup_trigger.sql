-- Fix "Database error saving new user" on signup.
--
-- Two protections:
-- 1. Explicit `SET search_path` so SECURITY DEFINER can find public tables.
--    Newer Supabase locks down search_path in these functions and the
--    unqualified refs (profiles / coin_rewards) fail with "relation not found".
-- 2. Wrap the coin_rewards INSERT in EXCEPTION so a welcome-bonus insert
--    failure never blocks auth signup. Profile row is still created — a
--    missing coin_rewards row is a cosmetic loss, an auth 500 is not.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username, coins)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    1000
  );

  BEGIN
    INSERT INTO coin_rewards (user_id, amount, reward_type)
    VALUES (NEW.id, 1000, 'welcome_bonus');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: welcome_bonus insert failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- The auth admin role must be able to execute the trigger function.
GRANT EXECUTE ON FUNCTION handle_new_user() TO supabase_auth_admin;
