-- 017: Track terms & privacy policy acceptance

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;

-- Backfill existing users as accepted (they were using the app before terms were added)
UPDATE profiles SET accepted_terms_at = NOW() WHERE accepted_terms_at IS NULL;
