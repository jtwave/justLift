export interface Exercise {
  id: string;
  name: string;
  category: string;
  lastPerformed?: Date;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
  timestamp?: Date;
}

export interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  isActive: boolean;
  restTime: number; // in seconds
}

export interface Workout {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}

export interface PreviousSetData {
  weight: number;
  reps: number;
  date: Date;
}