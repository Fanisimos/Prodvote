-- ============================================================
-- PRODVOTE FULL SCHEMA ADDITIONS
-- Run this in Supabase SQL Editor AFTER 001_schema.sql
-- ============================================================

-- ============ BADGES ============
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  color VARCHAR(7) DEFAULT '#7c5cfc',
  description TEXT,
  coin_cost INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ FRAMES ============
CREATE TABLE IF NOT EXISTS frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  animation_type VARCHAR(30) DEFAULT 'none',
  color VARCHAR(7) DEFAULT '#7c5cfc',
  coin_cost INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ PROFILE ADDITIONS ============
-- Add columns AFTER badge/frame tables exist so FK types match
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_frame_id UUID REFERENCES frames(id) ON DELETE SET NULL;

-- ============ USER BADGES ============
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ============ USER FRAMES ============
CREATE TABLE IF NOT EXISTS user_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  frame_id UUID REFERENCES frames(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, frame_id)
);

-- ============ CHAT CHANNELS ============
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CHAT MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ COIN TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ JOURNAL ============
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ HABITS ============
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  streak INT DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ NOTES ============
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200),
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ PLANS ============
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ KANBAN ============
CREATE TABLE IF NOT EXISTS kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  column_name VARCHAR(50) DEFAULT 'todo' CHECK (column_name IN ('todo', 'in_progress', 'done')),
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_frames_user ON user_frames(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_user ON kanban_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board ON kanban_cards(board_id);

-- ============ RLS ============
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;

-- Public read for badges, frames, channels
CREATE POLICY "Badges viewable by everyone" ON badges FOR SELECT USING (true);
CREATE POLICY "Frames viewable by everyone" ON frames FOR SELECT USING (true);
CREATE POLICY "Channels viewable by everyone" ON channels FOR SELECT USING (true);

-- Messages: anyone can read, auth can create
CREATE POLICY "Messages viewable by everyone" ON messages FOR SELECT USING (true);
CREATE POLICY "Auth users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = user_id);

-- User badges/frames: own read/write
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can acquire badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own frames" ON user_frames FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can acquire frames" ON user_frames FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Coin transactions: own read
CREATE POLICY "Users can view own coins" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert coins" ON coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Personal data: own CRUD
CREATE POLICY "Users own journal" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own habits" ON habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own notes" ON notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own plans" ON plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own kanban boards" ON kanban_boards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own kanban cards" ON kanban_cards FOR ALL USING (
  EXISTS (SELECT 1 FROM kanban_boards WHERE id = kanban_cards.board_id AND user_id = auth.uid())
);

-- Admin policies
CREATE POLICY "Admins can manage badges" ON badges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can manage frames" ON frames FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can manage channels" ON channels FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============ SEED DATA ============
-- Default chat channel
INSERT INTO channels (name, description, is_default) VALUES
  ('General', 'General discussion about Prodvote', true),
  ('Feature Ideas', 'Discuss feature ideas before submitting', false),
  ('Bug Reports', 'Report and discuss bugs', false)
ON CONFLICT DO NOTHING;

-- Starter badges
INSERT INTO badges (name, emoji, color, description, coin_cost) VALUES
  ('Early Adopter', '🚀', '#ff4d6a', 'One of the first Prodvote users', 0),
  ('Bug Hunter', '🐛', '#34d399', 'Found and reported bugs', 500),
  ('Top Voter', '🗳️', '#7c5cfc', 'Voted on 50+ features', 1000),
  ('Idea Machine', '💡', '#ffb347', 'Submitted 10+ features', 750),
  ('Commentator', '💬', '#4dc9f6', 'Left 25+ comments', 500),
  ('Legend', '👑', '#fbbf24', 'A true Prodvote legend', 5000),
  ('Fire Starter', '🔥', '#ff6b35', 'Got a feature to 100+ votes', 2000),
  ('Night Owl', '🦉', '#8b5cf6', 'Active late at night', 300),
  ('Streak Master', '⚡', '#ef4444', '30-day activity streak', 1500)
ON CONFLICT DO NOTHING;

-- Starter frames
INSERT INTO frames (name, animation_type, color, coin_cost) VALUES
  ('Default', 'none', '#888888', 0),
  ('Purple Glow', 'glow', '#7c5cfc', 500),
  ('Fire Ring', 'pulse', '#ff4d6a', 1000),
  ('Gold Crown', 'shimmer', '#fbbf24', 2000),
  ('Neon Blue', 'glow', '#4dc9f6', 750),
  ('Emerald', 'pulse', '#34d399', 750),
  ('Rainbow', 'rotate', '#ff6b35', 3000)
ON CONFLICT DO NOTHING;

-- Give starting coins to new users (update the handle_new_user function)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, coins)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)), 1000);

  INSERT INTO coin_transactions (user_id, amount, reason)
  VALUES (NEW.id, 1000, 'Welcome bonus! Starting coins added to your account.');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
