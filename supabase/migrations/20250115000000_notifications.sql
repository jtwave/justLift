/*
  # Notifications System Migration

  1. New Tables
    - `notifications` - User notifications
    - `notification_preferences` - User notification settings

  2. Features
    - Comment notifications
    - Like notifications  
    - New post notifications from followed users
    - Notification preferences per user
    - Read/unread status tracking

  3. Security
    - Enable RLS on notification tables
    - Add appropriate policies for user data access
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('comment', 'like', 'new_post', 'follow')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb, -- Additional data like post_id, comment_id, etc.
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  comments_enabled boolean DEFAULT true,
  likes_enabled boolean DEFAULT true,
  new_posts_enabled boolean DEFAULT true,
  follows_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Notification preferences policies
CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
  v_preferences record;
BEGIN
  -- Check if user has notifications enabled for this type
  SELECT * INTO v_preferences 
  FROM notification_preferences 
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, create default ones
  IF v_preferences IS NULL THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id);
    v_preferences := (SELECT * FROM notification_preferences WHERE user_id = p_user_id);
  END IF;
  
  -- Check if this type of notification is enabled
  CASE p_type
    WHEN 'comment' THEN
      IF NOT v_preferences.comments_enabled THEN
        RETURN NULL;
      END IF;
    WHEN 'like' THEN
      IF NOT v_preferences.likes_enabled THEN
        RETURN NULL;
      END IF;
    WHEN 'new_post' THEN
      IF NOT v_preferences.new_posts_enabled THEN
        RETURN NULL;
      END IF;
    WHEN 'follow' THEN
      IF NOT v_preferences.follows_enabled THEN
        RETURN NULL;
      END IF;
  END CASE;
  
  -- Create the notification
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id uuid, p_notification_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true 
  WHERE user_id = p_user_id AND id = ANY(p_notification_ids);
END;
$$;

-- Trigger to create comment notifications
CREATE OR REPLACE FUNCTION handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_post record;
  v_commenter record;
BEGIN
  -- Get post and commenter info
  SELECT user_id INTO v_post FROM workout_posts WHERE id = NEW.post_id;
  SELECT username, full_name INTO v_commenter FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if commenting on own post
  IF v_post.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification
  PERFORM create_notification(
    v_post.user_id,
    'comment',
    'New comment on your post',
    COALESCE(v_commenter.full_name, v_commenter.username) || ' commented on your post',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'comment_id', NEW.id,
      'commenter_id', NEW.user_id,
      'comment_content', NEW.content
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create like notifications
CREATE OR REPLACE FUNCTION handle_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_post record;
  v_liker record;
BEGIN
  -- Get post and liker info
  SELECT user_id INTO v_post FROM workout_posts WHERE id = NEW.post_id;
  SELECT username, full_name INTO v_liker FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if liking own post
  IF v_post.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification
  PERFORM create_notification(
    v_post.user_id,
    'like',
    'New like on your post',
    COALESCE(v_liker.full_name, v_liker.username) || ' liked your post',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'liker_id', NEW.user_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create new post notifications for followers
CREATE OR REPLACE FUNCTION handle_new_post_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_poster record;
  v_follower record;
BEGIN
  -- Get poster info
  SELECT username, full_name INTO v_poster FROM profiles WHERE id = NEW.user_id;
  
  -- Notify all followers
  FOR v_follower IN 
    SELECT follower_id FROM follows WHERE following_id = NEW.user_id
  LOOP
    PERFORM create_notification(
      v_follower.follower_id,
      'new_post',
      'New post from someone you follow',
      COALESCE(v_poster.full_name, v_poster.username) || ' posted a new workout',
      jsonb_build_object(
        'post_id', NEW.id,
        'poster_id', NEW.user_id
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Create triggers
DROP TRIGGER IF EXISTS comment_notification_trigger ON workout_comments;
CREATE TRIGGER comment_notification_trigger
  AFTER INSERT ON workout_comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_notification();

DROP TRIGGER IF EXISTS like_notification_trigger ON workout_likes;
CREATE TRIGGER like_notification_trigger
  AFTER INSERT ON workout_likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_like_notification();

DROP TRIGGER IF EXISTS new_post_notification_trigger ON workout_posts;
CREATE TRIGGER new_post_notification_trigger
  AFTER INSERT ON workout_posts
  FOR EACH ROW
  WHEN (NEW.is_public = true)
  EXECUTE FUNCTION handle_new_post_notification();

DROP TRIGGER IF EXISTS follow_notification_trigger ON follows;
CREATE TRIGGER follow_notification_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_notification();

-- Function to update notification preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification preferences updated_at
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at_trigger ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at_trigger
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at(); 