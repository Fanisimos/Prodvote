-- ============================================================
-- PUSH NOTIFICATIONS
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add push token column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index for quick lookup when sending notifications
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;
