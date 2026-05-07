-- Enable Supabase Realtime broadcasts for chat messages.
-- Without this, INSERT subscriptions on `messages` silently receive no events
-- and chat appears non-realtime.

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
