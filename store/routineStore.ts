import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type WorkoutRoutine = Database['public']['Tables']['workout_routines']['Row'];
type RoutineExercise = Database['public']['Tables']['routine_exercises']['Row'] & {
  exercise: Database['public']['Tables']['exercises']['Row'];
};
type Exercise = Database['public']['Tables']['exercises']['Row'];

interface WorkoutRoutineWithExercises extends WorkoutRoutine {
  exercises: RoutineExercise[];
}

interface RoutineStore {
  routines: WorkoutRoutineWithExercises[];
  loading: boolean;
  error: string | null;

  // Actions
  loadRoutines: () => Promise<void>;
  createRoutine: (name: string, description: string | null, exerciseIds: string[]) => Promise<void>;
  updateRoutine: (routineId: string, name: string, description: string | null) => Promise<void>;
  deleteRoutine: (routineId: string) => Promise<void>;
  addExerciseToRoutine: (routineId: string, exerciseId: string, orderIndex: number) => Promise<void>;
  removeExerciseFromRoutine: (routineExerciseId: string) => Promise<void>;
  reorderRoutineExercises: (routineId: string, exerciseIds: string[]) => Promise<void>;
}

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  routines: [],
  loading: false,
  error: null,

  loadRoutines: async () => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: routines, error } = await supabase
        .from('workout_routines')
        .select(`
          *,
          routine_exercises (
            *,
            exercise:exercises (*)
          )
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRoutines = routines?.map(routine => ({
        ...routine,
        exercises: routine.routine_exercises
          .map((re: any) => ({
            ...re,
            exercise: re.exercise
          }))
          .sort((a: any, b: any) => a.order_index - b.order_index)
      })) || [];

      set({ routines: formattedRoutines });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  createRoutine: async (name: string, description: string | null, exerciseIds: string[]) => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Create the routine
      const { data: routine, error: routineError } = await supabase
        .from('workout_routines')
        .insert({
          user_id: user.user.id,
          name,
          description,
        })
        .select()
        .single();

      if (routineError) throw routineError;

      // Add exercises to the routine
      if (exerciseIds.length > 0) {
        const routineExercises = exerciseIds.map((exerciseId, index) => ({
          routine_id: routine.id,
          exercise_id: exerciseId,
          order_index: index,
        }));

        const { error: exercisesError } = await supabase
          .from('routine_exercises')
          .insert(routineExercises);

        if (exercisesError) throw exercisesError;
      }

      // Reload routines
      get().loadRoutines();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  updateRoutine: async (routineId: string, name: string, description: string | null) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('workout_routines')
        .update({ name, description })
        .eq('id', routineId);

      if (error) throw error;

      // Update local state
      set({
        routines: get().routines.map(routine =>
          routine.id === routineId
            ? { ...routine, name, description }
            : routine
        )
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  deleteRoutine: async (routineId: string) => {
    try {
      set({ loading: true, error: null });

      // First, remove any references to this routine in workouts
      const { error: workoutError } = await supabase
        .from('workouts')
        .update({ routine_id: null })
        .eq('routine_id', routineId);

      if (workoutError) {
        console.error('Error updating workouts:', workoutError);
        // Continue anyway, as this might not be critical
      }

      // Delete routine exercises first (due to foreign key constraint)
      const { error: routineExercisesError } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('routine_id', routineId);

      if (routineExercisesError) {
        console.error('Error deleting routine exercises:', routineExercisesError);
        throw routineExercisesError;
      }

      // Now delete the routine itself
      const { error } = await supabase
        .from('workout_routines')
        .delete()
        .eq('id', routineId);

      if (error) {
        console.error('Error deleting routine:', error);
        throw error;
      }

      // Update local state
      set({
        routines: get().routines.filter(routine => routine.id !== routineId)
      });
    } catch (error) {
      console.error('Error in deleteRoutine:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  addExerciseToRoutine: async (routineId: string, exerciseId: string, orderIndex: number) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('routine_exercises')
        .insert({
          routine_id: routineId,
          exercise_id: exerciseId,
          order_index: orderIndex,
        });

      if (error) throw error;

      // Reload routines
      get().loadRoutines();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  removeExerciseFromRoutine: async (routineExerciseId: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('id', routineExerciseId);

      if (error) throw error;

      // Reload routines
      get().loadRoutines();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  reorderRoutineExercises: async (routineId: string, exerciseIds: string[]) => {
    try {
      set({ loading: true, error: null });

      // Update order indices for all exercises in the routine
      const updates = exerciseIds.map((exerciseId, index) =>
        supabase
          .from('routine_exercises')
          .update({ order_index: index })
          .eq('routine_id', routineId)
          .eq('exercise_id', exerciseId)
      );

      await Promise.all(updates);

      // Reload routines
      get().loadRoutines();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },
}));