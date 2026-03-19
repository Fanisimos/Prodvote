-- ============================================================
-- CHAT CHANNELS (Discord-style)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '💬',
  color TEXT DEFAULT '#7c5cfc',
  is_locked BOOLEAN DEFAULT false,  -- Only admins can post
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id);

-- RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Everyone can read channels
CREATE POLICY "Anyone can view channels" ON channels FOR SELECT USING (true);

-- Everyone can read messages
CREATE POLICY "Anyone can view messages" ON messages FOR SELECT USING (true);

-- Authenticated users can send messages
CREATE POLICY "Auth users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- Admin policies (using the admin check pattern)
CREATE POLICY "Admins can manage channels" ON channels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND username IN ('Fanisimos', 'Fanisimos_ADMIN'))
  );

CREATE POLICY "Admins can delete any message" ON messages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND username IN ('Fanisimos', 'Fanisimos_ADMIN'))
  );

-- Seed some default channels
INSERT INTO channels (name, description, emoji, color, sort_order) VALUES
  ('General', 'General chat for the community', '💬', '#7c5cfc', 1),
  ('Feature Ideas', 'Discuss feature ideas before submitting', '💡', '#fbbf24', 2),
  ('Bug Reports', 'Report bugs and issues', '🐛', '#ef4444', 3),
  ('Off Topic', 'Anything goes!', '🎮', '#22c55e', 4),
  ('Announcements', 'Official announcements from the team', '📢', '#3b82f6', 5);

-- Make Announcements locked (admin only)
UPDATE channels SET is_locked = true WHERE name = 'Announcements';
