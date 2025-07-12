/*
  # Add Body Weight Tracking

  1. New Tables
    - `body_weight_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `weight` (numeric, weight in pounds)
      - `notes` (text, optional notes)
      - `recorded_at` (timestamptz, when the weight was recorded)
      - `created_at` (timestamptz, when the entry was created)

  2. Security
    - Enable RLS on `body_weight_entries` table
    - Add policy for users to manage their own weight entries
*/

CREATE TABLE IF NOT EXISTS body_weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weight numeric NOT NULL,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE body_weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own body weight entries"
  ON body_weight_entries
  FOR ALL
  TO authenticated
  USING (user_id = uid())
  WITH CHECK (user_id = uid());

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS body_weight_entries_user_id_recorded_at_idx 
  ON body_weight_entries(user_id, recorded_at DESC);