-- ============================================================
-- AVATAR FRAMES / ANIMATIONS
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============ AVATAR FRAMES TABLE ============
CREATE TABLE avatar_frames (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  animation_type VARCHAR(30) NOT NULL, -- 'glow', 'pulse', 'ring_spin', 'rainbow', 'fire', 'ice', 'lightning'
  price INT NOT NULL DEFAULT 200,
  color VARCHAR(20) DEFAULT '#7c5cfc',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed avatar frames
INSERT INTO avatar_frames (name, description, animation_type, price, color, sort_order) VALUES
  ('Neon Glow',       'Soft neon glow around your avatar',          'glow',       150, '#7c5cfc', 1),
  ('Pulse Ring',      'Pulsing ring that breathes life',            'pulse',      200, '#4dc9f6', 2),
  ('Golden Spin',     'Spinning golden ring of glory',              'ring_spin',  300, '#fbbf24', 3),
  ('Rainbow Aura',    'Shifting rainbow colors around you',         'rainbow',    400, '#ff4d6a', 4),
  ('Fire Ring',       'Blazing fire effect around your avatar',     'fire',       500, '#ff6b35', 5),
  ('Ice Crystal',     'Frozen ice crystal glow',                    'ice',        350, '#67e8f9', 6),
  ('Lightning',       'Electric sparks around your avatar',         'lightning',  450, '#a78bfa', 7),
  ('Shadow Pulse',    'Dark mysterious pulsing shadow',             'shadow',     250, '#64748b', 8),
  ('Challenger',      'Elite diamond aura. Only the worthy.',       'challenger', 750, '#e8d44d', 9);

-- ============ USER AVATAR FRAMES (purchased) ============
CREATE TABLE user_avatar_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frame_id INT NOT NULL REFERENCES avatar_frames(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, frame_id)
);

-- ============ ACTIVE FRAME ON PROFILES ============
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_frame_id INT REFERENCES avatar_frames(id) ON DELETE SET NULL;

-- ============ RLS ============
ALTER TABLE avatar_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_avatar_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avatar frames are viewable by everyone" ON avatar_frames FOR SELECT USING (true);
CREATE POLICY "User avatar frames are viewable by everyone" ON user_avatar_frames FOR SELECT USING (true);
CREATE POLICY "Users can purchase avatar frames" ON user_avatar_frames FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ PURCHASE FUNCTION ============
CREATE OR REPLACE FUNCTION purchase_avatar_frame(p_user_id UUID, p_frame_id INT, p_price INT)
RETURNS VOID AS $$
BEGIN
  -- Check if already owned
  IF EXISTS (SELECT 1 FROM user_avatar_frames WHERE user_id = p_user_id AND frame_id = p_frame_id) THEN
    RAISE EXCEPTION 'Already owned';
  END IF;

  -- Check balance
  IF (SELECT coins FROM profiles WHERE id = p_user_id) < p_price THEN
    RAISE EXCEPTION 'Not enough coins';
  END IF;

  -- Deduct coins
  UPDATE profiles SET coins = coins - p_price WHERE id = p_user_id;

  -- Grant frame
  INSERT INTO user_avatar_frames (user_id, frame_id) VALUES (p_user_id, p_frame_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ UPDATE PUBLIC PROFILES VIEW ============
CREATE OR REPLACE VIEW public_profiles AS
SELECT p.id, p.username, p.avatar_url, p.tier, p.coins, p.created_at,
  p.active_badge_id,
  b.emoji AS active_badge_emoji, b.name AS active_badge_name, b.color AS active_badge_color,
  p.active_frame_id,
  af.animation_type AS active_frame_type, af.color AS active_frame_color, af.name AS active_frame_name
FROM profiles p
LEFT JOIN badges b ON b.id = p.active_badge_id
LEFT JOIN avatar_frames af ON af.id = p.active_frame_id
WHERE p.is_banned = false;

GRANT SELECT ON public_profiles TO authenticated, anon;
