/*
  # Reorganize Social Features

  1. Updates
    - Update RLS policies to allow viewing workout posts and related data
    - Ensure users can view public workout posts from other users
    - Allow viewing workout exercises and sets for public workouts

  2. Security
    - Maintain user privacy for private workouts
    - Allow public access to workout posts marked as public
    - Enable social features while protecting user data
*/

-- Update workout posts policies to allow viewing public posts
DROP POLICY IF EXISTS "Users can view public posts" ON workout_posts;
CREATE POLICY "Users can view public posts"
  ON workout_posts
  FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

-- Update workout exercises policies to allow viewing for public workouts
DROP POLICY IF EXISTS "Users can manage own workout exercises" ON workout_exercises;

-- Allow users to manage their own workout exercises
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

-- Allow viewing workout exercises for public workout posts
CREATE POLICY "Users can view workout exercises for public posts"
  ON workout_exercises
  FOR SELECT
  TO authenticated
  USING (
    workout_id IN (
      SELECT wp.workout_id 
      FROM workout_posts wp 
      WHERE wp.is_public = true
    )
  );

-- Update workout sets policies to allow viewing for public workouts
DROP POLICY IF EXISTS "Users can manage own workout sets" ON workout_sets;

-- Allow users to manage their own workout sets
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

-- Allow viewing workout sets for public workout posts
CREATE POLICY "Users can view workout sets for public posts"
  ON workout_sets
  FOR SELECT
  TO authenticated
  USING (
    workout_exercise_id IN (
      SELECT we.id 
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      JOIN workout_posts wp ON wp.workout_id = w.id
      WHERE wp.is_public = true
    )
  );

-- Update workouts policies to allow viewing public workouts
DROP POLICY IF EXISTS "Users can manage own workouts" ON workouts;

-- Allow users to manage their own workouts
CREATE POLICY "Users can manage own workouts"
  ON workouts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow viewing workouts that have public posts
CREATE POLICY "Users can view workouts with public posts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workout_id 
      FROM workout_posts 
      WHERE is_public = true
    ) OR user_id = auth.uid()
  );

-- Add media_url and media_type columns to workout_posts if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_posts' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE workout_posts ADD COLUMN media_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_posts' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE workout_posts ADD COLUMN media_type text CHECK (media_type IN ('photo', 'video'));
  END IF;
END $$;