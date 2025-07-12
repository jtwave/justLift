/*
  # Add missing features for workout routines and progress photos

  1. New Tables
    - `workout_routines` - User's saved workout templates
    - `routine_exercises` - Exercises within routines
    - `progress_photos` - User progress photos
  
  2. Updates
    - Add `routine_id` to workouts table
    - Add `is_pr` field to workout_sets table
  
  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for user data access
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

-- Add routine_id to workouts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workouts' AND column_name = 'routine_id'
  ) THEN
    ALTER TABLE workouts ADD COLUMN routine_id uuid REFERENCES workout_routines(id);
  END IF;
END $$;

-- Add is_pr to workout_sets table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sets' AND column_name = 'is_pr'
  ) THEN
    ALTER TABLE workout_sets ADD COLUMN is_pr boolean DEFAULT false;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own workout routines" ON workout_routines;
DROP POLICY IF EXISTS "Users can manage own routine exercises" ON routine_exercises;
DROP POLICY IF EXISTS "Users can manage own progress photos" ON progress_photos;

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
DROP TRIGGER IF EXISTS update_workout_routines_updated_at ON workout_routines;
CREATE TRIGGER update_workout_routines_updated_at
  BEFORE UPDATE ON workout_routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add policies for anon and service_role to profiles (needed for signup)
DROP POLICY IF EXISTS "Allow anon to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

CREATE POLICY "Allow anon to insert profiles"
  ON profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);