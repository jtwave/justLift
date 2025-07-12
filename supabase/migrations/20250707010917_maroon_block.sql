/*
  # Initial Database Schema Setup

  1. New Tables
    - `profiles` - User profile information linked to auth.users
    - `exercises` - Exercise library (shared across users)
    - `workouts` - Individual workout sessions
    - `workout_exercises` - Exercises within a workout
    - `workout_sets` - Individual sets with weight/reps data

  2. Security
    - Enable RLS on all tables
    - Add policies for user data isolation
    - Public read access for exercises
    - User-specific access for workouts and related data

  3. Functions & Triggers
    - Auto-create profile on user signup
    - Auto-update timestamps on profile/workout changes

  4. Default Data
    - Insert common exercises into the exercise library
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create exercises table (shared across all users)
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workout_exercises table
CREATE TABLE IF NOT EXISTS workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT false,
  rest_time integer DEFAULT 90,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create workout_sets table
CREATE TABLE IF NOT EXISTS workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id uuid REFERENCES workout_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number integer NOT NULL,
  weight numeric NOT NULL,
  reps integer NOT NULL,
  completed boolean DEFAULT false,
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'profiles' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'exercises' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'workouts' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'workout_exercises' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'workout_sets' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist, then recreate them
DO $$
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  CREATE POLICY "Users can read own profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  CREATE POLICY "Users can insert own profile"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

  -- Exercises policies
  DROP POLICY IF EXISTS "Anyone can read exercises" ON exercises;
  CREATE POLICY "Anyone can read exercises"
    ON exercises
    FOR SELECT
    TO authenticated
    USING (true);

  DROP POLICY IF EXISTS "Authenticated users can insert exercises" ON exercises;
  CREATE POLICY "Authenticated users can insert exercises"
    ON exercises
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- Workouts policies
  DROP POLICY IF EXISTS "Users can manage own workouts" ON workouts;
  CREATE POLICY "Users can manage own workouts"
    ON workouts
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- Workout exercises policies
  DROP POLICY IF EXISTS "Users can manage own workout exercises" ON workout_exercises;
  CREATE POLICY "Users can manage own workout exercises"
    ON workout_exercises
    FOR ALL
    TO authenticated
    USING (
      workout_id IN (
        SELECT id FROM workouts WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      workout_id IN (
        SELECT id FROM workouts WHERE user_id = auth.uid()
      )
    );

  -- Workout sets policies
  DROP POLICY IF EXISTS "Users can manage own workout sets" ON workout_sets;
  CREATE POLICY "Users can manage own workout sets"
    ON workout_sets
    FOR ALL
    TO authenticated
    USING (
      workout_exercise_id IN (
        SELECT we.id FROM workout_exercises we
        JOIN workouts w ON we.workout_id = w.id
        WHERE w.user_id = auth.uid()
      )
    )
    WITH CHECK (
      workout_exercise_id IN (
        SELECT we.id FROM workout_exercises we
        JOIN workouts w ON we.workout_id = w.id
        WHERE w.user_id = auth.uid()
      )
    );
END $$;

-- Insert default exercises (only if they don't exist)
INSERT INTO exercises (name, category) VALUES
  ('Barbell Bench Press', 'Chest'),
  ('Barbell Squat', 'Legs'),
  ('Deadlift', 'Back'),
  ('Overhead Press', 'Shoulders'),
  ('Barbell Row', 'Back'),
  ('Incline Dumbbell Press', 'Chest'),
  ('Pull-ups', 'Back'),
  ('Dips', 'Chest'),
  ('Romanian Deadlift', 'Legs'),
  ('Lat Pulldown', 'Back'),
  ('Leg Press', 'Legs'),
  ('Dumbbell Shoulder Press', 'Shoulders'),
  ('Barbell Curl', 'Arms'),
  ('Close Grip Bench Press', 'Arms'),
  ('Leg Curl', 'Legs'),
  ('Leg Extension', 'Legs'),
  ('Lateral Raise', 'Shoulders'),
  ('Face Pull', 'Shoulders'),
  ('Tricep Dip', 'Arms'),
  ('Hammer Curl', 'Arms')
ON CONFLICT (name) DO NOTHING;

-- Function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();