/*
  # Add bio field to profiles table

  1. Changes
    - Add `bio` column to profiles table to store user biography
    - Update existing profiles to have null bio initially

  2. Security
    - No changes to RLS policies needed as bio is part of user's own profile data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;
END $$;