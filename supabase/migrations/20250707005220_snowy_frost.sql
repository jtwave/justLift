/*
  # Add description column to workouts table

  1. Changes
    - Add `description` column to `workouts` table to store workout descriptions
    - This allows users to add notes and descriptions to their completed workouts

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

-- Add description column to workouts table
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS description text;