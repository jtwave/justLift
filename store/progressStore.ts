import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type ProgressPhoto = Database['public']['Tables']['progress_photos']['Row'];

interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  category: string;
  data: {
    date: string;
    e1rm: number;
    volume: number;
    weight: number;
    reps: number;
    sets: number;
  }[];
}

interface ProgressStore {
  progressPhotos: ProgressPhoto[];
  exerciseProgress: ExerciseProgress[];
  loading: boolean;
  error: string | null;

  // Actions
  loadProgressPhotos: () => Promise<void>;
  addProgressPhoto: (photoUrl: string, notes?: string, weight?: number) => Promise<void>;
  deleteProgressPhoto: (photoId: string) => Promise<void>;
  loadExerciseProgress: () => Promise<void>;
  getExerciseProgress: (exerciseId: string) => ExerciseProgress | null;
}

// Calculate estimated 1RM using Epley formula
const calculateE1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progressPhotos: [],
  exerciseProgress: [],
  loading: false,
  error: null,

  loadProgressPhotos: async () => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: photos, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ progressPhotos: photos || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  addProgressPhoto: async (photoUrl: string, notes?: string, weight?: number) => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: photo, error } = await supabase
        .from('progress_photos')
        .insert({
          user_id: user.user.id,
          photo_url: photoUrl,
          notes: notes || null,
          weight: typeof weight === 'number' ? weight : null,
        })
        .select()
        .single();

      if (error) throw error;

      set({
        progressPhotos: [photo, ...get().progressPhotos]
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  deleteProgressPhoto: async (photoId: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('progress_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      set({
        progressPhotos: get().progressPhotos.filter(photo => photo.id !== photoId)
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  loadExerciseProgress: async () => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get all workout data with exercises and sets
      const { data: workouts, error } = await supabase
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
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Process data to create exercise progress
      const exerciseMap = new Map<string, ExerciseProgress>();

      workouts?.forEach(workout => {
        workout.workout_exercises.forEach(workoutExercise => {
          const exerciseId = workoutExercise.exercise_id;
          const exercise = workoutExercise.exercise;

          if (!exerciseMap.has(exerciseId)) {
            exerciseMap.set(exerciseId, {
              exerciseId,
              exerciseName: exercise.name,
              category: exercise.category,
              data: []
            });
          }

          const completedSets = workoutExercise.workout_sets.filter(set => set.completed);
          if (completedSets.length === 0) return;

          // Calculate metrics for this workout session
          const maxWeight = Math.max(...completedSets.map(set => Number(set.weight)));
          const maxWeightSet = completedSets.find(set => Number(set.weight) === maxWeight);
          const e1rm = maxWeightSet ? calculateE1RM(Number(maxWeightSet.weight), maxWeightSet.reps) : 0;
          const volume = completedSets.reduce((total, set) => total + (Number(set.weight) * set.reps), 0);

          exerciseMap.get(exerciseId)!.data.push({
            date: workout.start_time,
            e1rm,
            volume,
            weight: maxWeight,
            reps: maxWeightSet?.reps || 0,
            sets: completedSets.length
          });
        });
      });

      // Convert map to array and sort data points by date
      const exerciseProgress = Array.from(exerciseMap.values()).map(exercise => ({
        ...exercise,
        data: exercise.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }));

      set({ exerciseProgress });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  getExerciseProgress: (exerciseId: string) => {
    return get().exerciseProgress.find(ep => ep.exerciseId === exerciseId) || null;
  },
}));