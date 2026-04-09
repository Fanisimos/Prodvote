-- Content reports for Apple App Store compliance
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('feature', 'comment', 'user')),
  content_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'harassment', 'misinformation', 'other')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_content ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON content_reports(reporter_id);

-- Prevent duplicate reports from same user on same content
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique
ON content_reports(reporter_id, content_type, content_id);

-- RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON content_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Users can see their own reports
CREATE POLICY "Users can view own reports"
ON content_reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- Admins can see all reports (via service role or admin check)
CREATE POLICY "Admins can view all reports"
ON content_reports FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admins can update report status
CREATE POLICY "Admins can update reports"
ON content_reports FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
