-- Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set existing admin
UPDATE profiles SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'tzoni@litsaitechnologies.com'
);

-- Create a helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix broken RLS policies that used USING (true) — restrict to actual admins

-- Comments: admin update
DROP POLICY IF EXISTS "Admin can update comments" ON comments;
CREATE POLICY "Admin can update comments" ON comments
  FOR UPDATE USING (is_admin());

-- Comments: admin delete
DROP POLICY IF EXISTS "Admin can delete any comment" ON comments;
CREATE POLICY "Admin can delete any comment" ON comments
  FOR DELETE USING (is_admin());

-- Comment awards: admin delete (if exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin can delete comment awards" ON comment_awards;
  CREATE POLICY "Admin can delete comment awards" ON comment_awards
    FOR DELETE USING (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Features: admin update (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin can update features" ON features;
  CREATE POLICY "Admin can update features" ON features
    FOR UPDATE USING (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Chat messages: admin delete
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin can delete messages" ON chat_messages;
  CREATE POLICY "Admin can delete messages" ON chat_messages
    FOR DELETE USING (auth.uid() = user_id OR is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
