-- Track when a user's tier changes, for admin "new paid subs" notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION bump_tier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    NEW.tier_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_tier_updated_at ON profiles;
CREATE TRIGGER trg_bump_tier_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION bump_tier_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_tier_updated_at ON profiles(tier_updated_at) WHERE tier != 'free';
CREATE INDEX IF NOT EXISTS idx_features_created_at ON features(created_at);
