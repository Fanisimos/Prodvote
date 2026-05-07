-- @mention push notifications.
-- When a user posts a comment or chat message containing @username, we send
-- a push notification to each mentioned user via the Expo Push API.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION send_mention_pushes(
  p_body TEXT,
  p_author_id UUID,
  p_title TEXT,
  p_route TEXT
) RETURNS VOID AS $$
DECLARE
  v_username TEXT;
  v_target RECORD;
  v_author_username TEXT;
BEGIN
  SELECT username INTO v_author_username FROM profiles WHERE id = p_author_id;

  -- Extract distinct @usernames from the body (alphanumeric + underscore, 1-30 chars)
  FOR v_username IN
    SELECT DISTINCT lower(substring(m[1] from 2))
    FROM regexp_matches(p_body, '@([a-zA-Z0-9_]{1,30})', 'g') m
  LOOP
    -- Look up the mentioned user. Skip self-mentions and users without push tokens.
    FOR v_target IN
      SELECT id, push_token
      FROM profiles
      WHERE lower(username) = v_username
        AND id != p_author_id
        AND push_token IS NOT NULL
    LOOP
      PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
        body := jsonb_build_object(
          'to', v_target.push_token,
          'title', p_title,
          'body', COALESCE(v_author_username, 'Someone') || ' mentioned you: ' ||
                  CASE WHEN length(p_body) > 80 THEN substring(p_body, 1, 80) || '…' ELSE p_body END,
          'data', jsonb_build_object('type', 'mention', 'route', p_route),
          'sound', 'default'
        )
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comments
CREATE OR REPLACE FUNCTION trg_mention_in_comment() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.body LIKE '%@%' THEN
    PERFORM send_mention_pushes(
      NEW.body,
      NEW.user_id,
      'You were mentioned',
      '/feature/' || NEW.feature_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS comments_mention_push ON comments;
CREATE TRIGGER comments_mention_push
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION trg_mention_in_comment();

-- Trigger for chat messages
CREATE OR REPLACE FUNCTION trg_mention_in_message() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.body LIKE '%@%' THEN
    PERFORM send_mention_pushes(
      NEW.body,
      NEW.user_id,
      'You were mentioned in chat',
      '/chat/' || NEW.channel_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS messages_mention_push ON messages;
CREATE TRIGGER messages_mention_push
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION trg_mention_in_message();
