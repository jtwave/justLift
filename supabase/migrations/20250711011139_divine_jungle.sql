/*
  # Add comprehensive exercise library

  1. New Exercises
    - Adds detailed exercise variations organized by muscle group
    - Includes specific equipment types and movement patterns
    - Covers chest, back, legs, shoulders, arms, core, and full body exercises

  2. Organization
    - Each exercise variation gets its own entry
    - Consistent naming convention for variations
    - Proper categorization by primary muscle group
*/

-- Insert comprehensive exercise library
INSERT INTO exercises (name, category) VALUES
  -- Chest Exercises
  ('Flat Barbell Bench Press', 'Chest'),
  ('Incline Barbell Bench Press', 'Chest'),
  ('Decline Barbell Bench Press', 'Chest'),
  ('Flat Dumbbell Bench Press', 'Chest'),
  ('Incline Dumbbell Bench Press', 'Chest'),
  ('Decline Dumbbell Bench Press', 'Chest'),
  ('Standard Push-ups', 'Chest'),
  ('Incline Push-ups', 'Chest'),
  ('Decline Push-ups', 'Chest'),
  ('Weighted Push-ups', 'Chest'),
  ('Flat Dumbbell Flyes', 'Chest'),
  ('Incline Dumbbell Flyes', 'Chest'),
  ('High Cable Crossover', 'Chest'),
  ('Mid Cable Crossover', 'Chest'),
  ('Low Cable Crossover', 'Chest'),
  ('Machine Chest Press', 'Chest'),
  ('Pec Deck Fly', 'Chest'),

  -- Back Exercises
  ('Conventional Deadlift', 'Back'),
  ('Sumo Deadlift', 'Back'),
  ('Romanian Deadlift', 'Back'),
  ('Stiff-Leg Deadlift', 'Back'),
  ('Bent-Over Barbell Row', 'Back'),
  ('Bent-Over Dumbbell Row', 'Back'),
  ('Seated Cable Row Wide Grip', 'Back'),
  ('Seated Cable Row Close Grip', 'Back'),
  ('T-Bar Row', 'Back'),
  ('Machine Row', 'Back'),
  ('Pendlay Row', 'Back'),
  ('Renegade Row', 'Back'),
  ('Lat Pulldown Wide Grip', 'Back'),
  ('Lat Pulldown Close Grip', 'Back'),
  ('Lat Pulldown Reverse Grip', 'Back'),
  ('Straight-Arm Cable Pulldown', 'Back'),
  ('Pull-ups Overhand', 'Back'),
  ('Chin-ups Underhand', 'Back'),
  ('Assisted Pull-ups', 'Back'),
  ('Assisted Chin-ups', 'Back'),
  ('Cable Face Pulls', 'Back'),
  ('Barbell Shrugs', 'Back'),
  ('Dumbbell Shrugs', 'Back'),
  ('Hyperextensions', 'Back'),
  ('Good Mornings', 'Back'),

  -- Leg Exercises
  ('Barbell Back Squat High Bar', 'Legs'),
  ('Barbell Back Squat Low Bar', 'Legs'),
  ('Barbell Front Squat', 'Legs'),
  ('Goblet Squat', 'Legs'),
  ('Zercher Squat', 'Legs'),
  ('Bodyweight Squat', 'Legs'),
  ('Dumbbell Walking Lunges', 'Legs'),
  ('Dumbbell Stationary Lunges', 'Legs'),
  ('Barbell Walking Lunges', 'Legs'),
  ('Barbell Stationary Lunges', 'Legs'),
  ('Reverse Lunges', 'Legs'),
  ('Side Lunges', 'Legs'),
  ('Bulgarian Split Squat', 'Legs'),
  ('Standard Leg Press', 'Legs'),
  ('Hack Squat Machine', 'Legs'),
  ('Leg Extensions', 'Legs'),
  ('Lying Hamstring Curl', 'Legs'),
  ('Seated Hamstring Curl', 'Legs'),
  ('Standing Hamstring Curl', 'Legs'),
  ('Standing Calf Raises Machine', 'Legs'),
  ('Standing Calf Raises Dumbbell', 'Legs'),
  ('Seated Calf Raises', 'Legs'),
  ('Bodyweight Glute Bridge', 'Legs'),
  ('Barbell Glute Bridge', 'Legs'),
  ('Barbell Hip Thrust', 'Legs'),
  ('Cable Kickbacks', 'Legs'),
  ('Reverse Hyperextension', 'Legs'),

  -- Shoulder Exercises
  ('Standing Barbell Overhead Press', 'Shoulders'),
  ('Seated Barbell Overhead Press', 'Shoulders'),
  ('Standing Dumbbell Overhead Press', 'Shoulders'),
  ('Seated Dumbbell Overhead Press', 'Shoulders'),
  ('Arnold Press', 'Shoulders'),
  ('Machine Shoulder Press', 'Shoulders'),
  ('Dumbbell Lateral Raises', 'Shoulders'),
  ('Cable Lateral Raises', 'Shoulders'),
  ('Dumbbell Front Raises', 'Shoulders'),
  ('Cable Front Raises', 'Shoulders'),
  ('Dumbbell Rear Delt Flyes', 'Shoulders'),
  ('Pec Deck Reverse Fly', 'Shoulders'),
  ('Cable Rear Delt Flyes', 'Shoulders'),
  ('Barbell Upright Rows', 'Shoulders'),
  ('Dumbbell Upright Rows', 'Shoulders'),
  ('Cable Upright Rows', 'Shoulders'),

  -- Arm Exercises - Biceps
  ('Barbell Bicep Curl', 'Arms'),
  ('Standing Dumbbell Bicep Curl', 'Arms'),
  ('Seated Dumbbell Bicep Curl', 'Arms'),
  ('Alternating Dumbbell Bicep Curl', 'Arms'),
  ('Hammer Curl', 'Arms'),
  ('Cable Bicep Curl', 'Arms'),
  ('Barbell Preacher Curl', 'Arms'),
  ('Dumbbell Preacher Curl', 'Arms'),
  ('Machine Preacher Curl', 'Arms'),
  ('Concentration Curl', 'Arms'),

  -- Arm Exercises - Triceps
  ('Tricep Pushdown Rope', 'Arms'),
  ('Tricep Pushdown Straight Bar', 'Arms'),
  ('Tricep Pushdown V-Bar', 'Arms'),
  ('Overhead Dumbbell Tricep Extension Two-Hand', 'Arms'),
  ('Overhead Dumbbell Tricep Extension Single-Arm', 'Arms'),
  ('Overhead Cable Tricep Extension', 'Arms'),
  ('Barbell Skullcrushers', 'Arms'),
  ('Dumbbell Skullcrushers', 'Arms'),
  ('EZ Bar Skullcrushers', 'Arms'),
  ('Close-Grip Barbell Bench Press', 'Arms'),
  ('Bodyweight Tricep Dips', 'Arms'),
  ('Weighted Tricep Dips', 'Arms'),
  ('Machine Tricep Dips', 'Arms'),
  ('Dumbbell Kickbacks', 'Arms'),

  -- Core Exercises
  ('Standard Plank', 'Core'),
  ('Side Plank', 'Core'),
  ('Weighted Plank', 'Core'),
  ('Standard Crunches', 'Core'),
  ('Reverse Crunches', 'Core'),
  ('Bicycle Crunches', 'Core'),
  ('Cable Crunches', 'Core'),
  ('Lying Leg Raises', 'Core'),
  ('Hanging Leg Raises', 'Core'),
  ('Bodyweight Russian Twists', 'Core'),
  ('Weighted Russian Twists', 'Core'),
  ('Ab Wheel Rollout', 'Core'),
  ('Barbell Rollout', 'Core'),
  ('Cable Wood Chops', 'Core'),

  -- Full Body / Olympic / CrossFit Style
  ('Clean and Jerk', 'Full Body'),
  ('Snatch', 'Full Body'),
  ('Kettlebell Swing', 'Full Body'),
  ('Kettlebell Goblet Squat', 'Full Body'),
  ('Kettlebell Clean and Press', 'Full Body'),
  ('Burpees', 'Full Body'),
  ('Box Jumps', 'Full Body'),
  ('Wall Ball Shots', 'Full Body'),
  ('Barbell Thrusters', 'Full Body'),
  ('Dumbbell Thrusters', 'Full Body'),
  ('Dumbbell Farmer''s Walk', 'Full Body'),
  ('Kettlebell Farmer''s Walk', 'Full Body'),
  ('Trap Bar Farmer''s Walk', 'Full Body')

ON CONFLICT (name) DO NOTHING;