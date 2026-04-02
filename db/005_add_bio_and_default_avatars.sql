-- 005: Add bio column to profiles + default avatars table
-- Run this in Supabase SQL Editor

-- 1. Add bio column to profiles (missing, causes crash on edit-profile save)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;

-- 2. Default avatars table — fun monster/creature avatars users can pick from
CREATE TABLE IF NOT EXISTS default_avatars (
  id serial PRIMARY KEY,
  name varchar(50) NOT NULL,
  emoji varchar(10) NOT NULL,
  url text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE default_avatars ENABLE ROW LEVEL SECURITY;

-- Anyone can view default avatars
CREATE POLICY "Anyone can view default avatars"
  ON default_avatars FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage default avatars"
  ON default_avatars FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 3. Insert fun default avatars (URLs point to Supabase storage bucket 'avatars/defaults/')
-- You'll need to upload these images to your Supabase storage bucket first
-- For now we store placeholder paths — update URLs after uploading actual images
INSERT INTO default_avatars (name, emoji, url, sort_order) VALUES
  ('Blobby', '🫠', 'defaults/blobby.png', 1),
  ('Grumpus', '👾', 'defaults/grumpus.png', 2),
  ('Fuzzball', '🧶', 'defaults/fuzzball.png', 3),
  ('Cyclops', '👁️', 'defaults/cyclops.png', 4),
  ('Chomper', '🦷', 'defaults/chomper.png', 5),
  ('Zappy', '⚡', 'defaults/zappy.png', 6),
  ('Gloopy', '🍭', 'defaults/gloopy.png', 7),
  ('Cactoid', '🌵', 'defaults/cactoid.png', 8)
ON CONFLICT DO NOTHING;

-- 4. Also ensure the avatars storage bucket exists
-- Run this separately in Supabase Dashboard > Storage > New Bucket:
--   Name: avatars
--   Public: YES
--   File size limit: 2MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
