/*
  # Fix follower count system

  1. Drop and recreate the follow count trigger function with proper logic
  2. Ensure RLS policies allow the trigger to update profiles
  3. Manually update all existing follower/following counts
  4. Add the trigger back to the follows table
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_follow_counts_trigger ON follows;
DROP FUNCTION IF EXISTS update_follow_counts();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT (new follow)
  IF TG_OP = 'INSERT' THEN
    -- Update follower count for the user being followed
    UPDATE profiles 
    SET followers_count = (
      SELECT COUNT(*) 
      FROM follows 
      WHERE following_id = NEW.following_id
    )
    WHERE id = NEW.following_id;
    
    -- Update following count for the user doing the following
    UPDATE profiles 
    SET following_count = (
      SELECT COUNT(*) 
      FROM follows 
      WHERE follower_id = NEW.follower_id
    )
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (unfollow)
  IF TG_OP = 'DELETE' THEN
    -- Update follower count for the user being unfollowed
    UPDATE profiles 
    SET followers_count = (
      SELECT COUNT(*) 
      FROM follows 
      WHERE following_id = OLD.following_id
    )
    WHERE id = OLD.following_id;
    
    -- Update following count for the user doing the unfollowing
    UPDATE profiles 
    SET following_count = (
      SELECT COUNT(*) 
      FROM follows 
      WHERE follower_id = OLD.follower_id
    )
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Add RLS policy for trigger function to update profiles
CREATE POLICY "Allow trigger updates on profiles"
  ON profiles
  FOR UPDATE
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Manually update all existing follower/following counts
UPDATE profiles 
SET followers_count = (
  SELECT COUNT(*) 
  FROM follows 
  WHERE following_id = profiles.id
),
following_count = (
  SELECT COUNT(*) 
  FROM follows 
  WHERE follower_id = profiles.id
);

-- Recreate the trigger
CREATE TRIGGER update_follow_counts_trigger
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();