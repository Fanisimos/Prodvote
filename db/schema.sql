-- Eisenhower Matrix Feedback System Schema
-- Run this in your Neon SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback/comments table
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  dev_hearted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table (one like per user per feedback)
CREATE TABLE IF NOT EXISTS feedback_likes (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_id INT NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, feedback_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_feedback ON feedback_likes(feedback_id);

-- Create your admin user (password will be set via the register endpoint)
-- After registering, run this to make yourself admin:
-- UPDATE users SET is_admin = TRUE WHERE username = 'YourUsername';
