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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can read exercises" ON exercises;
DROP POLICY IF EXISTS "Authenticated users can insert exercises" ON exercises;
DROP POLICY IF EXISTS "Users can manage own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can manage own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can manage own workout sets" ON workout_sets;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Exercises policies (public read, authenticated users can add)
CREATE POLICY "Anyone can read exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert exercises"
  ON exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Workouts policies
CREATE POLICY "Users can manage own workouts"
  ON workouts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Workout exercises policies
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

-- Insert default exercises
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

-- Trigger to create profile on user signup
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();