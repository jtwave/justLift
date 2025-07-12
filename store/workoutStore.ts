import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Exercise = Database['public']['Tables']['exercises']['Row'];
type Workout = Database['public']['Tables']['workouts']['Row'];
type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row'] & {
  exercise: Exercise;
  sets: WorkoutSet[];
};
type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];

interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExercise[];
}

interface PreviousSetData {
  weight: number;
  reps: number;
  date: string;
}

interface WorkoutStore {
  currentWorkout: WorkoutWithExercises | null;
  workoutHistory: WorkoutWithExercises[];
  exercises: Exercise[];
  loading: boolean;
  error: string | null;

  // Actions
  loadExercises: () => Promise<void>;
  loadWorkoutHistory: () => Promise<void>;
  loadCurrentWorkout: () => Promise<void>;
  startWorkout: (name: string, routineId?: string) => Promise<void>;
  finishWorkout: () => Promise<void>;
  getWorkoutStartTime: () => number | null;
  addExercise: (exerciseId: string) => Promise<void>;
  removeExercise: (workoutExerciseId: string) => Promise<void>;
  logSet: (workoutExerciseId: string, setData: Omit<WorkoutSet, 'id' | 'workout_exercise_id' | 'created_at'>) => Promise<void>;
  addWorkoutSet: (workoutExerciseId: string, setData: Omit<WorkoutSet, 'id' | 'workout_exercise_id' | 'created_at'>) => Promise<void>;
  setActiveExercise: (workoutExerciseId: string) => Promise<void>;
  getPreviousSetData: (exerciseId: string, setNumber: number) => PreviousSetData | null;
  updateRestTime: (workoutExerciseId: string, restTime: number) => Promise<void>;
  saveWorkoutAsRoutine: (workoutId: string, routineName: string, description?: string) => Promise<void>;
  updateWorkoutDetails: (workoutId: string, name: string, description?: string) => Promise<void>;
  discardWorkout: (workoutId: string) => Promise<void>;
  deleteWorkoutSet: (setId: string) => Promise<void>;
  updateExerciseNotes: (exerciseId: string, notes: string) => Promise<void>;
}

// Calculate estimated 1RM using Epley formula
const calculateE1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  currentWorkout: null,
  workoutHistory: [],
  exercises: [],
  loading: false,
  error: null,

  loadExercises: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      set({ exercises: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  loadWorkoutHistory: async () => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (*),
            workout_sets (*)
          )
        `)
        .eq('user_id', user.user.id)
        .eq('is_active', false)
        .order('start_time', { ascending: false });

      if (workoutsError) throw workoutsError;

      const formattedWorkouts = workouts?.map(workout => ({
        ...workout,
        exercises: workout.workout_exercises.map(we => ({
          ...we,
          sets: we.workout_sets.sort((a, b) => a.set_number - b.set_number)
        })).sort((a, b) => a.order_index - b.order_index)
      })) || [];

      set({ workoutHistory: formattedWorkouts });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  loadCurrentWorkout: async () => {
    try {
      console.log('=== LOAD CURRENT WORKOUT START ===');
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.log('No user found, skipping workout load');
        return;
      }

      console.log('Loading current workout for user:', user.user.id);

      // Join exercise_notes for the current user
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (
              *,
              exercise_notes(user_id, notes)
            ),
            workout_sets (*)
          )
        `)
        .eq('user_id', user.user.id)
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Database error loading current workout:', error);
        throw error;
      }

      console.log('Database query successful, workouts found:', workouts?.length || 0);

      if (workouts && workouts.length > 0) {
        const workout = workouts[0];
        console.log('Processing workout:', workout.id, workout.name);

        // Map user_note from exercise_note for each exercise
        const formattedWorkout = {
          ...workout,
          exercises: workout.workout_exercises.map((we: any) => ({
            ...we,
            user_note: we.exercise.exercise_notes?.find((n: any) => n.user_id === user.user.id)?.notes || null,
            sets: we.workout_sets.sort((a: any, b: any) => a.set_number - b.set_number)
          })).sort((a: any, b: any) => a.order_index - b.order_index)
        };

        set({ currentWorkout: formattedWorkout });
      } else {
        set({ currentWorkout: null });
      }
      console.log('=== LOAD CURRENT WORKOUT END ===');
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  startWorkout: async (name: string, routineId?: string) => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user.user.id,
          name,
          start_time: new Date().toISOString(),
          is_active: true,
          routine_id: routineId || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newWorkout = {
        ...data,
        exercises: []
      };

      set({ currentWorkout: newWorkout });

      // If starting from a routine, add all exercises from the routine
      if (routineId) {
        const { data: routineExercises, error: routineError } = await supabase
          .from('routine_exercises')
          .select(`
            *,
            exercise:exercises (*)
          `)
          .eq('routine_id', routineId)
          .order('order_index', { ascending: true });

        if (routineError) throw routineError;

        if (routineExercises && routineExercises.length > 0) {
          // Add exercises to the workout
          const workoutExercises = routineExercises.map((re, index) => ({
            workout_id: data.id,
            exercise_id: re.exercise_id,
            is_active: index === 0, // First exercise is active
            rest_time: re.default_rest_time,
            order_index: re.order_index,
          }));

          const { data: addedExercises, error: addError } = await supabase
            .from('workout_exercises')
            .insert(workoutExercises)
            .select(`
              *,
              exercise:exercises (*),
              workout_sets (*)
            `);

          if (addError) throw addError;

          const formattedExercises = addedExercises.map(we => ({
            ...we,
            sets: []
          }));

          set({
            currentWorkout: {
              ...newWorkout,
              exercises: formattedExercises
            }
          });
        }
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  getWorkoutStartTime: () => {
    const { currentWorkout } = get();
    if (!currentWorkout) return null;
    return new Date(currentWorkout.start_time).getTime();
  },

  finishWorkout: async () => {
    try {
      const { currentWorkout } = get();
      if (!currentWorkout) return;

      set({ loading: true, error: null });
      console.log('Finishing workout:', currentWorkout.id);

      const { error } = await supabase
        .from('workouts')
        .update({
          end_time: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', currentWorkout.id);

      if (error) throw error;
      console.log('Workout finished successfully');

      // Clear current workout immediately
      set({ currentWorkout: null });

      // Reload workout history immediately
      await get().loadWorkoutHistory();
      console.log('Workout history reloaded');

    } catch (error) {
      console.error('Error finishing workout:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  addExercise: async (exerciseId: string) => {
    try {
      const { currentWorkout } = get();
      if (!currentWorkout) return;

      set({ loading: true, error: null });

      // Set all current exercises to inactive
      if (currentWorkout.exercises.length > 0) {
        await supabase
          .from('workout_exercises')
          .update({ is_active: false })
          .eq('workout_id', currentWorkout.id);
      }

      // Add new exercise as active
      const { data, error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: currentWorkout.id,
          exercise_id: exerciseId,
          is_active: true,
          order_index: currentWorkout.exercises.length,
        })
        .select(`
          *,
          exercise:exercises (*),
          workout_sets (*)
        `)
        .single();

      if (error) throw error;

      const newExercise = {
        ...data,
        sets: []
      };

      set({
        currentWorkout: {
          ...currentWorkout,
          exercises: [
            ...currentWorkout.exercises.map(ex => ({ ...ex, is_active: false })),
            newExercise
          ]
        }
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  removeExercise: async (workoutExerciseId: string) => {
    try {
      const { currentWorkout } = get();
      if (!currentWorkout) return;

      set({ loading: true, error: null });

      const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', workoutExerciseId);

      if (error) throw error;

      // Reload current workout to get fresh state
      await get().loadCurrentWorkout();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  deleteWorkoutSet: async (setId: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      // Reload current workout to get fresh state
      await get().loadCurrentWorkout();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  logSet: async (workoutExerciseId: string, setData) => {
    try {
      const { currentWorkout } = get();
      if (!currentWorkout) return;

      set({ loading: true, error: null });

      // Toggle completed/uncompleted
      const updateFields = setData.completed
        ? { completed: true, timestamp: new Date().toISOString() }
        : { completed: false, timestamp: null };

      const { data, error } = await supabase
        .from('workout_sets')
        .update(updateFields)
        .eq('id', setData.id)
        .select()
        .single();

      if (error) throw error;

      // Reload current workout to get fresh state
      await get().loadCurrentWorkout();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  addWorkoutSet: async (workoutExerciseId: string, setData) => {
    try {
      const { currentWorkout } = get();
      if (!currentWorkout) return;

      set({ loading: true, error: null });

      console.log('=== ADD WORKOUT SET START ===');
      console.log('workoutExerciseId:', workoutExerciseId);
      console.log('setData:', setData);
      console.log('Current workout exercises:', currentWorkout.exercises.map(ex => ({ id: ex.id, name: ex.exercise.name, setsCount: ex.sets.length })));

      const { data, error } = await supabase
        .from('workout_sets')
        .insert({
          workout_exercise_id: workoutExerciseId,
          ...setData,
          completed: false, // Always set to false for adding sets
          is_pr: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Database response:', data);

      set({
        currentWorkout: {
          ...currentWorkout,
          exercises: currentWorkout.exercises.map(ex =>
            ex.id === workoutExerciseId
              ? { ...ex, sets: [...ex.sets, data] }
              : ex
          )
        }
      });

      console.log('Updated current workout exercises:', get().currentWorkout?.exercises.map(ex => ({ id: ex.id, name: ex.exercise.name, setsCount: ex.sets.length })));
      console.log('=== ADD WORKOUT SET END ===');
    } catch (error) {
      console.error('Error in addWorkoutSet:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  setActiveExercise: async (workoutExerciseId: string) => {
    try {
      const { currentWorkout } = get();
      if (!currentWorkout) return;

      set({ loading: true, error: null });

      // Set all exercises to inactive
      await supabase
        .from('workout_exercises')
        .update({ is_active: false })
        .eq('workout_id', currentWorkout.id);

      // Set selected exercise to active
      const { error } = await supabase
        .from('workout_exercises')
        .update({ is_active: true })
        .eq('id', workoutExerciseId);

      if (error) throw error;

      set({
        currentWorkout: {
          ...currentWorkout,
          exercises: currentWorkout.exercises.map(ex => ({
            ...ex,
            is_active: ex.id === workoutExerciseId
          }))
        }
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  getPreviousSetData: (exerciseId: string, setNumber: number) => {
    const { workoutHistory } = get();

    for (const workout of workoutHistory) {
      const exercise = workout.exercises.find(ex => ex.exercise_id === exerciseId);
      if (exercise) {
        const set = exercise.sets.find(s => s.set_number === setNumber && s.completed);
        if (set) {
          return {
            weight: Number(set.weight),
            reps: set.reps,
            date: set.timestamp,
          };
        }
      }
    }

    return null;
  },

  updateRestTime: async (workoutExerciseId: string, restTime: number) => {
    try {
      const { currentWorkout } = get();
      if (!currentWorkout) return;

      set({ loading: true, error: null });

      const { error } = await supabase
        .from('workout_exercises')
        .update({ rest_time: restTime })
        .eq('id', workoutExerciseId);

      if (error) throw error;

      set({
        currentWorkout: {
          ...currentWorkout,
          exercises: currentWorkout.exercises.map(ex =>
            ex.id === workoutExerciseId
              ? { ...ex, rest_time: restTime }
              : ex
          )
        }
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  saveWorkoutAsRoutine: async (workoutId: string, routineName: string, description?: string) => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get the workout with exercises
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (*)
          )
        `)
        .eq('id', workoutId)
        .single();

      if (workoutError) throw workoutError;

      // Create the routine
      const { data: routine, error: routineError } = await supabase
        .from('workout_routines')
        .insert({
          user_id: user.user.id,
          name: routineName,
          description: description || null,
        })
        .select()
        .single();

      if (routineError) throw routineError;

      // Add exercises to the routine
      if (workout.workout_exercises.length > 0) {
        const routineExercises = workout.workout_exercises.map(we => ({
          routine_id: routine.id,
          exercise_id: we.exercise_id,
          order_index: we.order_index,
          default_rest_time: we.rest_time,
        }));

        const { error: exercisesError } = await supabase
          .from('routine_exercises')
          .insert(routineExercises);

        if (exercisesError) throw exercisesError;
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  updateWorkoutDetails: async (workoutId: string, name: string, description?: string) => {
    try {
      set({ loading: true, error: null });
      console.log('Updating workout details:', { workoutId, name, description });

      console.log('Updating workout details:', { workoutId, name, description });

      const { error } = await supabase
        .from('workouts')
        .update({
          name,
          description: description || null
        })
        .eq('id', workoutId);

      if (error) {
        console.error('Database error updating workout:', error);
        throw error;
      }

      console.log('Workout details updated successfully in database');
    } catch (error) {
      console.error('Error in updateWorkoutDetails:', error);
      set({ error: (error as Error).message });
      throw error; // Re-throw so the UI can handle it
    } finally {
      set({ loading: false });
    }
  },

  discardWorkout: async (workoutId: string) => {
    try {
      set({ loading: true, error: null });
      console.log('Discarding workout:', workoutId);

      // Delete the workout entirely
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;
      console.log('Workout discarded successfully');
      console.log('Workout details updated successfully');

      set({ currentWorkout: null });

      // Reload workout history to ensure consistency
      await get().loadWorkoutHistory();
    } catch (error) {
      console.error('Error discarding workout:', error);
      console.error('Error updating workout details:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  updateExerciseNotes: async (exerciseId: string, notes: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('exercises')
        .update({ user_notes: notes.trim() || null })
        .eq('id', exerciseId);

      if (error) throw error;

      // Update local state
      const { exercises, currentWorkout } = get();

      // Update exercises list
      const updatedExercises = exercises.map(ex =>
        ex.id === exerciseId
          ? { ...ex, user_notes: notes.trim() || null }
          : ex
      );

      // Update current workout if it contains this exercise
      let updatedCurrentWorkout = currentWorkout;
      if (currentWorkout) {
        updatedCurrentWorkout = {
          ...currentWorkout,
          exercises: currentWorkout.exercises.map(we =>
            we.exercise_id === exerciseId
              ? { ...we, exercise: { ...we.exercise, user_notes: notes.trim() || null } }
              : we
          )
        };
      }

      set({
        exercises: updatedExercises,
        currentWorkout: updatedCurrentWorkout
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },
}));