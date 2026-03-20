-- Account deletion function — removes all user data
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Verify the caller is deleting their own account
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete user data from all tables (order matters for foreign keys)
  DELETE FROM coin_rewards WHERE user_id = p_user_id;
  DELETE FROM feature_awards WHERE user_id = p_user_id;
  DELETE FROM comment_awards WHERE user_id = p_user_id;
  DELETE FROM user_badges WHERE user_id = p_user_id;
  DELETE FROM user_frames WHERE user_id = p_user_id;
  DELETE FROM user_reports WHERE reporter_id = p_user_id OR reported_user_id = p_user_id;
  DELETE FROM user_blocks WHERE blocker_id = p_user_id OR blocked_user_id = p_user_id;
  DELETE FROM chat_messages WHERE user_id = p_user_id;
  DELETE FROM comments WHERE user_id = p_user_id;
  DELETE FROM votes WHERE user_id = p_user_id;
  DELETE FROM features WHERE user_id = p_user_id;
  DELETE FROM profiles WHERE id = p_user_id;

  -- Delete avatar files from storage
  DELETE FROM storage.objects WHERE bucket_id = 'avatars' AND (storage.foldername(name))[1] = p_user_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
