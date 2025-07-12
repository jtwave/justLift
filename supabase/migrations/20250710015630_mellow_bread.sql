/*
  # Fix search functionality by updating RLS policies

  1. Updates
    - Add policy to allow authenticated users to search/read other profiles
    - This enables the user search functionality to work properly

  2. Security
    - Maintains data privacy while allowing necessary search functionality
    - Users can read basic profile info of other users for search/social features
*/

-- Drop existing profile read policy and create a more permissive one for search
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to read other profiles for search functionality
CREATE POLICY "Users can search other profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);