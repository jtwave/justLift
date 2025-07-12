/*
  # Fix user creation trigger and function

  1. Database Functions
    - Create or replace `handle_new_user` function to automatically create profile when user signs up
    - Create or replace `update_updated_at_column` function for timestamp updates

  2. Triggers
    - Create trigger on auth.users to automatically create profile
    - Ensure existing update triggers work properly

  3. Security
    - Ensure RLS policies allow proper user creation
    - Add missing policies if needed
*/

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the profiles table has proper RLS policies
-- Add policy to allow service role to insert profiles (needed for trigger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Service role can insert profiles'
  ) THEN
    CREATE POLICY "Service role can insert profiles"
      ON profiles
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Ensure anon role can also insert profiles during signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Allow anon to insert profiles'
  ) THEN
    CREATE POLICY "Allow anon to insert profiles"
      ON profiles
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.exercises TO anon, authenticated, service_role;
GRANT ALL ON public.workouts TO anon, authenticated, service_role;
GRANT ALL ON public.workout_exercises TO anon, authenticated, service_role;
GRANT ALL ON public.workout_sets TO anon, authenticated, service_role;