-- 008: Clean up duplicate frames, rename to proper names
-- Run in Supabase SQL Editor

-- Remove all existing frames (keep user purchases intact via frame_id references)
DELETE FROM avatar_frames;

-- Insert clean set of premium frames with proper names
INSERT INTO avatar_frames (name, description, animation_type, price, color, is_active, sort_order) VALUES
  ('Default',      'Clean minimal border',                  'none',      0,    '#7c5cfc', true, 1),
  ('Ember',        'Warm flickering flames around you',     'fire',      300,  '#FF4500', true, 2),
  ('Thunderstrike','Lightning bolts crackle across',        'electric',  400,  '#00D4FF', true, 3),
  ('Prismatic',    'Flowing rainbow color shift',           'rainbow',   500,  '#FF6B6B', true, 4),
  ('Aurora',       'Soft breathing northern lights',        'breathe',   300,  '#845EF7', true, 5),
  ('Radiant',      'Pulsating energy ring',                 'glow',      400,  '#BE4BDB', true, 6),
  ('Stardust',     'Twinkling particles orbit you',         'sparkle',   600,  '#FCC419', true, 7),
  ('Frostbite',    'Icy crystals shimmer and crack',        'frost',     600,  '#74C0FC', true, 8),
  ('24 Karat',     'Luxurious gold gleam',                  'golden',    1500, '#FFD700', true, 9)
ON CONFLICT DO NOTHING;
