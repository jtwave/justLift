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
  logSet: (workoutExerciseId: string, setData: any) => Promise<void>;
  addWorkoutSet: (workoutExerciseId: string, setData: Omit<WorkoutSet, 'id' | 'workout_exercise_id' | 'created_at'>) => Promise<void>;
  setActiveExercise: (workoutExerciseId: string) => Promise<void>;
  getPreviousSetData: (exerciseId: string, setNumber: number) => PreviousSetData | null;
  updateRestTime: (workoutExerciseId: string, restTime: number) => Promise<void>;
  saveWorkoutAsRoutine: (
    workoutId: string,
    routineName: string,
    description?: string,
    exerciseConfigs?: { exercise_id: string, sets: { weight: number, reps: number }[] }[]
  ) => Promise<void>;
  updateWorkoutDetails: (workoutId: string, name: string, description?: string) => Promise<void>;
  discardWorkout: (workoutId: string) => Promise<void>;
  deleteWorkoutSet: (setId: string) => Promise<void>;
  updateExerciseNotes: (exerciseId: string, notes: string) => Promise<void>;
  updateWorkoutSets: (workoutExerciseId: string, sets: { id: string, weight: number, reps: number }[]) => Promise<void>;
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
          .select(`*, exercise:exercises (*)`)
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
            .select(`*, exercise:exercises (*), workout_sets (*)`);

          if (addError) throw addError;

          // Prefill sets for each exercise using default_sets
          for (let i = 0; i < addedExercises.length; i++) {
            const we: any = addedExercises[i];
            const routineEx = routineExercises.find((re: any) => re.exercise_id === we.exercise_id);
            if (routineEx && routineEx.default_sets) {
              let sets;
              try {
                sets = typeof routineEx.default_sets === 'string' ? JSON.parse(routineEx.default_sets) : routineEx.default_sets;
              } catch (e) {
                sets = [];
              }
              if (Array.isArray(sets) && sets.length > 0) {
                const workoutSets = sets.map((set: any, idx: number) => ({
                  workout_exercise_id: we.id,
                  set_number: idx + 1,
                  weight: set.weight ?? 0,
                  reps: set.reps ?? 0,
                  completed: false,
                  is_pr: false,
                  timestamp: new Date().toISOString(),
                }));
                await supabase.from('workout_sets').insert(workoutSets);
              }
            }
          }

          // Reload the workout with sets
          await get().loadCurrentWorkout();
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

  logSet: async (workoutExerciseId: string, setData: any) => {
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

  addWorkoutSet: async (workoutExerciseId: string, setData: Omit<WorkoutSet, 'id' | 'workout_exercise_id' | 'created_at'>) => {
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

  saveWorkoutAsRoutine: async (
    workoutId: string,
    routineName: string,
    description?: string,
    exerciseConfigs?: { exercise_id: string, sets: { weight: number, reps: number }[] }[]
  ) => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get the workout with exercises and sets
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (*),
            workout_sets (*)
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

      // Add exercises to the routine, including default_sets
      let routineExercises;
      if (exerciseConfigs && exerciseConfigs.length > 0) {
        routineExercises = exerciseConfigs.map((ex, idx) => ({
          routine_id: routine.id,
          exercise_id: ex.exercise_id,
          order_index: idx,
          default_rest_time: 90, // You can enhance this to allow editing rest time
          default_sets: ex.sets.length > 0 ? JSON.stringify(ex.sets) : null,
        }));
      } else if (workout.workout_exercises.length > 0) {
        routineExercises = workout.workout_exercises.map((we: any) => {
          // Save sets as default_sets (only weight/reps/duration/distance)
          const sets = (we.workout_sets || []).map((set: any) => ({
            weight: set.weight,
            reps: set.reps,
            duration: set.duration,
            distance: set.distance
          }));
          return {
            routine_id: routine.id,
            exercise_id: we.exercise_id,
            order_index: we.order_index,
            default_rest_time: we.rest_time,
            default_sets: sets.length > 0 ? JSON.stringify(sets) : null,
          };
        });
      }

      if (routineExercises && routineExercises.length > 0) {
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

      // First, get all workout exercises for this workout
      const { data: workoutExercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('id')
        .eq('workout_id', workoutId);

      if (exercisesError) throw exercisesError;

      // Delete all workout sets for this workout's exercises
      if (workoutExercises && workoutExercises.length > 0) {
        const exerciseIds = workoutExercises.map((we: any) => we.id);
        const { error: setsError } = await supabase
          .from('workout_sets')
          .delete()
          .in('workout_exercise_id', exerciseIds);

        if (setsError) throw setsError;
        console.log('Deleted workout sets');
      }

      // Delete all workout exercises for this workout
      const { error: deleteExercisesError } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);

      if (deleteExercisesError) throw deleteExercisesError;
      console.log('Deleted workout exercises');

      // Finally, delete the workout itself
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;
      console.log('Workout discarded successfully');

      // Clear current workout immediately
      set({ currentWorkout: null });

      // Remove the deleted workout from the local workout history
      const { workoutHistory } = get();
      const updatedWorkoutHistory = workoutHistory.filter(w => w.id !== workoutId);
      set({ workoutHistory: updatedWorkoutHistory });

      // Also reload workout history from database to ensure consistency
      await get().loadWorkoutHistory();
    } catch (error) {
      console.error('Error discarding workout:', error);
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

  updateWorkoutSets: async (workoutExerciseId: string, sets: { id: string, weight: number, reps: number }[]) => {
    try {
      set({ loading: true, error: null });
      // Update each set in parallel
      const updates = sets.map(setObj =>
        supabase.from('workout_sets')
          .update({ weight: setObj.weight, reps: setObj.reps })
          .eq('id', setObj.id)
      );
      await Promise.all(updates);
      // Reload current workout
      await get().loadCurrentWorkout();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },
}));