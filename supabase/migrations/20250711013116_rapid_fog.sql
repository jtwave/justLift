/*
  # Fix RLS policies for follower count updates

  1. Security Changes
    - Add service role policy to allow trigger functions to update profile counts
    - Ensure follow count triggers can update profiles table
    - Add policy for authenticated users to read all profiles (needed for search/discovery)

  2. Trigger Function Updates
    - Ensure trigger functions run with proper permissions
*/

-- Allow service role to update profiles (needed for triggers)
CREATE POLICY "Service role can update profiles"
  ON profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read all profiles (needed for user discovery)
DROP POLICY IF EXISTS "Users can search other profiles" ON profiles;
CREATE POLICY "Users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Recreate the follow count trigger function with proper security context
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the user being followed
    UPDATE profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
    
    -- Increment following count for the user doing the following
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE profiles 
    SET followers_count = GREATEST(0, followers_count - 1) 
    WHERE id = OLD.following_id;
    
    -- Decrement following count for the user doing the unfollowing
    UPDATE profiles 
    SET following_count = GREATEST(0, following_count - 1) 
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;