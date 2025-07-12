-- Add description column to workouts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workouts' AND column_name = 'description'
  ) THEN
    ALTER TABLE workouts ADD COLUMN description text;
  END IF;
END $$;