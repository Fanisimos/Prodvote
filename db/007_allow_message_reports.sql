-- Allow reporting chat messages
ALTER TABLE content_reports
  DROP CONSTRAINT IF EXISTS content_reports_content_type_check;

ALTER TABLE content_reports
  ADD CONSTRAINT content_reports_content_type_check
  CHECK (content_type IN ('feature', 'comment', 'user', 'message'));
