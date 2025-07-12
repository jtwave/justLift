/*
  # Add workout routines and progress photos

  1. New Tables
    - `workout_routines`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `description` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `routine_exercises`
      - `id` (uuid, primary key)
      - `routine_id` (uuid, references workout_routines)
      - `exercise_id` (uuid, references exercises)
      - `order_index` (integer)
      - `default_rest_time` (integer, seconds)
      - `created_at` (timestamp)
    
    - `progress_photos`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `photo_url` (text)
      - `notes` (text, nullable)
      - `created_at` (timestamp)

  2. New Columns
    - Add `is_pr` boolean to workout_sets table
    - Add `routine_id` to workouts table (nullable, references workout_routines)

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users to manage their own data
*/

-- Create workout_routines table
CREATE TABLE IF NOT EXISTS workout_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create routine_exercises table
CREATE TABLE IF NOT EXISTS routine_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid REFERENCES workout_routines(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  order_index integer NOT NULL,
  default_rest_time integer DEFAULT 90,
  created_at timestamptz DEFAULT now()
);

-- Create progress_photos table
CREATE TABLE IF NOT EXISTS progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sets' AND column_name = 'is_pr'
  ) THEN
    ALTER TABLE workout_sets ADD COLUMN is_pr boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workouts' AND column_name = 'routine_id'
  ) THEN
    ALTER TABLE workouts ADD COLUMN routine_id uuid REFERENCES workout_routines(id);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Workout routines policies
CREATE POLICY "Users can manage own workout routines"
  ON workout_routines
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Routine exercises policies
CREATE POLICY "Users can manage own routine exercises"
  ON routine_exercises
  FOR ALL
  TO authenticated
  USING (
    routine_id IN (
      SELECT id FROM workout_routines WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    routine_id IN (
      SELECT id FROM workout_routines WHERE user_id = auth.uid()
    )
  );

-- Progress photos policies
CREATE POLICY "Users can manage own progress photos"
  ON progress_photos
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger for workout_routines
CREATE TRIGGER update_workout_routines_updated_at
  BEFORE UPDATE ON workout_routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();