/*
  # Add exercise tracking types

  1. New Columns
    - `tracking_type` (text) - Defines how the exercise should be tracked
    - `default_duration` (integer) - Default duration in seconds for time-based exercises
    - `supports_distance` (boolean) - Whether exercise supports distance tracking
    - `supports_calories` (boolean) - Whether exercise supports calorie tracking

  2. Updates
    - Update existing exercises with appropriate tracking types
    - Set default values for new columns

  3. Tracking Types
    - 'weight_reps' - Traditional weight and reps (default)
    - 'time_only' - Duration only (stretches, planks)
    - 'cardio' - Time, distance, calories (treadmill, bike)
    - 'bodyweight_reps' - Reps only, no weight (push-ups, jumping jacks)
    - 'distance_time' - Distance and time (walking, running)
*/

-- Add new columns to exercises table
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS tracking_type text DEFAULT 'weight_reps',
ADD COLUMN IF NOT EXISTS default_duration integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS supports_distance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS supports_calories boolean DEFAULT false;

-- Add constraint for tracking_type
ALTER TABLE exercises 
ADD CONSTRAINT exercises_tracking_type_check 
CHECK (tracking_type IN ('weight_reps', 'time_only', 'cardio', 'bodyweight_reps', 'distance_time'));

-- Update cardio exercises
UPDATE exercises SET 
  tracking_type = 'cardio',
  default_duration = 1800, -- 30 minutes
  supports_distance = true,
  supports_calories = true
WHERE name IN (
  'Air Bike',
  'Bicycling',
  'Bicycling, Stationary',
  'Elliptical Trainer',
  'Jogging, Treadmill',
  'Recumbent Bike',
  'Rowing, Stationary',
  'Running, Treadmill',
  'Skating',
  'Stairmaster',
  'Trail Running/Walking',
  'Walking, Treadmill'
);

-- Update time-only exercises (stretches, holds, etc.)
UPDATE exercises SET 
  tracking_type = 'time_only',
  default_duration = 30,
  supports_distance = false,
  supports_calories = false
WHERE name IN (
  '90/90 Hamstring',
  'Adductor',
  'Adductor/Groin',
  'All Fours Quad Stretch',
  'Ankle Circles',
  'Ankle On The Knee',
  'Anterior Tibialis-SMR',
  'Arm Circles',
  'Behind Head Chest Stretch',
  'Calf Stretch Elbows Against Wall',
  'Calf Stretch Hands Against Wall',
  'Calves-SMR',
  'Cat Stretch',
  'Chair Leg Extended Stretch',
  'Chair Lower Back Stretch',
  'Chair Upper Body Stretch',
  'Chest And Front Of Shoulder Stretch',
  'Chest Stretch on Stability Ball',
  'Child''s Pose',
  'Chin To Chest Stretch',
  'Dancer''s Stretch',
  'Dynamic Back Stretch',
  'Dynamic Chest Stretch',
  'Elbow Circles',
  'Foot-SMR',
  'Groin and Back Stretch',
  'Hamstring Stretch',
  'Hamstring-SMR',
  'Hip Circles (prone)',
  'Hug A Ball',
  'Hug Knees To Chest',
  'IT Band and Glute Stretch',
  'Iliotibial Tract-SMR',
  'Intermediate Groin Stretch',
  'Intermediate Hip Flexor and Quad Stretch',
  'Internal Rotation with Band',
  'Iron Crosses (stretch)',
  'Isometric Chest Squeezes',
  'Isometric Neck Exercise - Front And Back',
  'Isometric Neck Exercise - Sides',
  'Knee Across The Body',
  'Knee Circles',
  'Kneeling Forearm Stretch',
  'Kneeling Hip Flexor',
  'Latissimus Dorsi-SMR',
  'Leg-Up Hamstring Stretch',
  'Looking At Ceiling',
  'Lower Back Curl',
  'Lower Back-SMR',
  'Lying Bent Leg Groin',
  'Lying Crossover',
  'Lying Glute',
  'Lying Hamstring',
  'Lying Prone Quadriceps',
  'Middle Back Stretch',
  'Neck-SMR',
  'On Your Side Quad Stretch',
  'On-Your-Back Quad Stretch',
  'One Arm Against Wall',
  'One Handed Hang',
  'One Half Locust',
  'One Knee To Chest',
  'Overhead Lat',
  'Overhead Stretch',
  'Pelvic Tilt Into Bridge',
  'Peroneals Stretch',
  'Peroneals-SMR',
  'Piriformis-SMR',
  'Plank',
  'Posterior Tibialis Stretch',
  'Quad Stretch',
  'Quadriceps-SMR',
  'Rhomboids-SMR',
  'Round The World Shoulder Stretch',
  'Runner''s Stretch',
  'Seated Calf Stretch',
  'Seated Floor Hamstring Stretch',
  'Seated Glute',
  'Seated Hamstring',
  'Seated Hamstring and Calf Stretch',
  'Seated Overhead Stretch',
  'Shoulder Circles',
  'Shoulder Stretch',
  'Side Neck Stretch',
  'Side Wrist Pull',
  'Side-Lying Floor Stretch',
  'Spinal Stretch',
  'Standing Biceps Stretch',
  'Standing Elevated Quad Stretch',
  'Standing Gastrocnemius Calf Stretch',
  'Standing Hamstring and Calf Stretch',
  'Standing Hip Circles',
  'Standing Hip Flexors',
  'Standing Lateral Stretch',
  'Standing Pelvic Tilt',
  'Standing Soleus And Achilles Stretch',
  'Standing Toe Touches',
  'Stomach Vacuum',
  'The Straddle',
  'Tricep Side Stretch',
  'Triceps Stretch',
  'Upper Back Stretch',
  'Upper Back-Leg Grab',
  'Upward Stretch',
  'Windmills',
  'World''s Greatest Stretch',
  'Wrist Circles',
  'Wrist Rotations with Straight Bar'
);

-- Update bodyweight exercises that use reps only
UPDATE exercises SET 
  tracking_type = 'bodyweight_reps',
  default_duration = 60,
  supports_distance = false,
  supports_calories = true
WHERE name IN (
  'Bodyweight Mid Row',
  'Bodyweight Walking Lunge',
  'Butt Lift (Bridge)',
  'Dead Bug',
  'Downward Facing Balance',
  'Fast Skipping',
  'Frog Hops',
  'Hyperextensions (Back Extensions)',
  'Hyperextensions With No Hyperextension Bench',
  'Inchworm',
  'Leg Pull-In',
  'Lunge Pass Through',
  'Monster Walk',
  'Mountain Climbers',
  'Otis-Up',
  'Plate Twist',
  'Rope Jumping',
  'Russian Twist',
  'Scissor Kick',
  'Seated Leg Tucks',
  'Side Bridge',
  'Side Leg Raises',
  'Side to Side Box Shuffle',
  'Standing Calf Raises',
  'Standing Rope Crunch',
  'Superman',
  'Suspended Fallout',
  'Suspended Push-Up',
  'Suspended Reverse Crunch',
  'Suspended Row',
  'Suspended Split Squat',
  'Toe Touchers',
  'Torso Rotation',
  'Tuck Crunch'
);

-- Update distance/time exercises
UPDATE exercises SET 
  tracking_type = 'distance_time',
  default_duration = 1200, -- 20 minutes
  supports_distance = true,
  supports_calories = true
WHERE name IN (
  'Backward Drag',
  'Bear Crawl Sled Drags',
  'Farmer''s Walk',
  'Forward Drag with Press',
  'Prowler Sprint',
  'Rickshaw Carry',
  'Sled Drag - Harness',
  'Sled Overhead Backward Walk',
  'Sled Push',
  'Yoke Walk'
);

-- Update exercises that are weight-based but might have longer durations
UPDATE exercises SET 
  tracking_type = 'weight_reps',
  default_duration = 120, -- 2 minutes for heavier compound movements
  supports_distance = false,
  supports_calories = false
WHERE name IN (
  'Battling Ropes',
  'Keg Load',
  'Log Lift',
  'Lying Face Down Plate Neck Resistance',
  'Lying Face Up Plate Neck Resistance',
  'Neck Press',
  'Overhead Slam',
  'Rickshaw Deadlift',
  'Sandbag Load',
  'Seated Head Harness Neck Resistance',
  'Sledgehammer Swings',
  'Tire Flip',
  'Wrist Roller'
);