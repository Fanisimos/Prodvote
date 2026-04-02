-- 006: Add premium animated frames
-- Run this in Supabase SQL Editor

-- Update existing frames to use proper animation types, or insert new ones
-- Available types: none, pulse, breathe, glow, rainbow, fire, electric, sparkle, frost, golden

-- Clear existing frames and start fresh with premium ones
-- (Comment this out if you want to keep existing frames)
-- DELETE FROM avatar_frames;

INSERT INTO avatar_frames (name, description, animation_type, price, color, is_active, sort_order) VALUES
  ('Basic',     'Simple clean border',              'none',     0,    '#7c5cfc', true, 1),
  ('Pulse',     'Rhythmic pulsing ring',            'pulse',    200,  '#7c5cfc', true, 2),
  ('Breathe',   'Soft expanding aura',              'breathe',  300,  '#845EF7', true, 3),
  ('Glow',      'Radiant glowing halo',             'glow',     400,  '#BE4BDB', true, 4),
  ('Rainbow',   'Shifting prismatic colors',        'rainbow',  600,  '#FF6B6B', true, 5),
  ('Inferno',   'Flickering flames',                'fire',     800,  '#FF4500', true, 6),
  ('Lightning', 'Crackling electric energy',        'electric', 800,  '#00D4FF', true, 7),
  ('Stardust',  'Orbiting sparkle particles',       'sparkle',  1000, '#FCC419', true, 8),
  ('Frost',     'Icy crystalline shimmer',          'frost',    1000, '#74C0FC', true, 9),
  ('Legendary', 'Pure gold radiance',               'golden',   2000, '#FFD700', true, 10)
ON CONFLICT DO NOTHING;
