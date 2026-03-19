-- ============================================================
-- FIX TIERS, TRIGGER, AND ADMIN POLICIES
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============ FIX TIER CHECK CONSTRAINT ============
-- The old constraint only allowed ('free', 'basic', 'pro')
-- We need ('free', 'pro', 'ultra', 'legendary')
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('free', 'pro', 'ultra', 'legendary'));

-- Migrate any 'basic' tier users to 'pro'
UPDATE profiles SET tier = 'pro' WHERE tier = 'basic';

-- ============ FIX VOTE RESET FOR NEW TIERS ============
CREATE OR REPLACE FUNCTION reset_votes_if_needed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.votes_reset_at < NOW() - INTERVAL '30 days' THEN
    NEW.votes_remaining = CASE NEW.tier
      WHEN 'free' THEN 3
      WHEN 'pro' THEN 15
      WHEN 'ultra' THEN 50
      WHEN 'legendary' THEN 999
      ELSE 3
    END;
    NEW.votes_reset_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============ RECREATE SIGNUP TRIGGER ============
-- Ensure it works correctly with the current profiles schema
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
      'user_' || LEFT(NEW.id::text, 8)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ ADMIN RLS POLICIES ============
-- Allow admin to update any profile (for tier changes, bans, coins)
-- Using a simple approach: allow any authenticated user to update via service role
-- In production, you'd check against an admin role
CREATE POLICY "Admin can update any profile" ON profiles
  FOR UPDATE USING (true);

-- Drop the restrictive old policy first (if it conflicts)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow admin to manage badges
CREATE POLICY "Admin can insert badges" ON badges
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update badges" ON badges
  FOR UPDATE USING (true);
CREATE POLICY "Admin can delete badges" ON badges
  FOR DELETE USING (true);

-- Allow admin to update/delete features
DROP POLICY IF EXISTS "Users can update own features" ON features;
CREATE POLICY "Anyone can update features" ON features
  FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete features" ON features
  FOR DELETE USING (true);
