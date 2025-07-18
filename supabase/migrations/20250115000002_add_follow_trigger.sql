-- Add follow notification trigger only
-- This migration assumes the notification tables and policies already exist

-- Trigger to create follow notifications
CREATE OR REPLACE FUNCTION handle_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_follower record;
BEGIN
  -- Get follower info
  SELECT username, full_name INTO v_follower FROM profiles WHERE id = NEW.follower_id;
  
  -- Don't notify if following yourself
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification for the person being followed
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    'New follower',
    COALESCE(v_follower.full_name, v_follower.username) || ' started following you',
    jsonb_build_object(
      'follower_id', NEW.follower_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create follow notification trigger
DROP TRIGGER IF EXISTS follow_notification_trigger ON follows;
CREATE TRIGGER follow_notification_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_notification(); 