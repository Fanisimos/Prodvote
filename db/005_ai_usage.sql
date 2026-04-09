-- AI usage tracking for chatbot & improve features
-- Pro users get 5900 messages/month, free users use free tier (rate-limited by Google)

CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('chat', 'improve')),
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_user_month ON ai_usage (user_id, created_at);

-- View for monthly usage summary per user
CREATE OR REPLACE VIEW ai_usage_monthly AS
SELECT
  user_id,
  COUNT(*) AS message_count,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  DATE_TRUNC('month', NOW()) AS period_start,
  (DATE_TRUNC('month', NOW()) + INTERVAL '1 month') AS period_end
FROM ai_usage
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY user_id;

-- RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Insert via edge function (service role), but also allow authenticated users
CREATE POLICY "Users can insert own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all AI usage"
  ON ai_usage FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
