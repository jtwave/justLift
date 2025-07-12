/*
  # Add body weight tracking

  1. New Tables
    - `body_weight_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `weight` (numeric, weight in pounds)
      - `notes` (text, optional notes)
      - `recorded_at` (timestamp, when weight was recorded)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on body_weight_entries table
    - Add policies for users to manage their own weight entries
*/

-- Create body_weight_entries table
CREATE TABLE IF NOT EXISTS body_weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  weight numeric NOT NULL CHECK (weight > 0 AND weight <= 1000),
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE body_weight_entries ENABLE ROW LEVEL SECURITY;

-- Body weight entries policies
CREATE POLICY "Users can manage own body weight entries"
  ON body_weight_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_body_weight_entries_user_recorded 
  ON body_weight_entries(user_id, recorded_at DESC);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_body_weight_entries_user_id 
  ON body_weight_entries(user_id);