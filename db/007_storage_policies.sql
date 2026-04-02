-- 007: Storage RLS policies for avatar uploads
-- Run this in Supabase SQL Editor
-- Fixes "new row violates row-level security policy" error on avatar upload

-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Allow users to update/overwrite their own avatar
CREATE POLICY "Users can update avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

-- Allow public read access to all avatars
CREATE POLICY "Public avatar read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
