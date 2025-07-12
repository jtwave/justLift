import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type BodyWeightEntry = Database['public']['Tables']['body_weight_entries']['Row'];

interface WeightStats {
  currentWeight: number | null;
  previousWeight: number | null;
  weightChange: number | null;
  highestWeight: number | null;
  lowestWeight: number | null;
  totalEntries: number;
  averageWeight: number | null;
}

interface WeightStore {
  weightEntries: BodyWeightEntry[];
  stats: WeightStats;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadWeightEntries: () => Promise<void>;
  addWeightEntry: (weight: number, notes?: string, recordedAt?: string) => Promise<void>;
  updateWeightEntry: (entryId: string, weight: number, notes?: string, recordedAt?: string) => Promise<void>;
  deleteWeightEntry: (entryId: string) => Promise<void>;
  getWeightStats: () => WeightStats;
  getWeightTrend: (days: number) => BodyWeightEntry[];
}

const calculateStats = (entries: BodyWeightEntry[]): WeightStats => {
  if (entries.length === 0) {
    return {
      currentWeight: null,
      previousWeight: null,
      weightChange: null,
      highestWeight: null,
      lowestWeight: null,
      totalEntries: 0,
      averageWeight: null,
    };
  }

  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );

  const weights = entries.map(entry => Number(entry.weight));
  const currentWeight = Number(sortedEntries[0].weight);
  const previousWeight = sortedEntries.length > 1 ? Number(sortedEntries[1].weight) : null;
  const weightChange = previousWeight ? currentWeight - previousWeight : null;

  return {
    currentWeight,
    previousWeight,
    weightChange,
    highestWeight: Math.max(...weights),
    lowestWeight: Math.min(...weights),
    totalEntries: entries.length,
    averageWeight: weights.reduce((sum, weight) => sum + weight, 0) / weights.length,
  };
};

export const useWeightStore = create<WeightStore>((set, get) => ({
  weightEntries: [],
  stats: {
    currentWeight: null,
    previousWeight: null,
    weightChange: null,
    highestWeight: null,
    lowestWeight: null,
    totalEntries: 0,
    averageWeight: null,
  },
  loading: false,
  error: null,

  loadWeightEntries: async () => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: entries, error } = await supabase
        .from('body_weight_entries')
        .select('*')
        .eq('user_id', user.user.id)
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      const weightEntries = entries || [];
      const stats = calculateStats(weightEntries);

      set({ weightEntries, stats });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  addWeightEntry: async (weight: number, notes?: string, recordedAt?: string) => {
    try {
      set({ loading: true, error: null });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: entry, error } = await supabase
        .from('body_weight_entries')
        .insert({
          user_id: user.user.id,
          weight,
          notes: notes || null,
          recorded_at: recordedAt || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const currentEntries = get().weightEntries;
      const newEntries = [entry, ...currentEntries];
      const stats = calculateStats(newEntries);

      set({
        weightEntries: newEntries,
        stats,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  updateWeightEntry: async (entryId: string, weight: number, notes?: string, recordedAt?: string) => {
    try {
      set({ loading: true, error: null });

      const { data: entry, error } = await supabase
        .from('body_weight_entries')
        .update({
          weight,
          notes: notes || null,
          recorded_at: recordedAt || new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;

      const currentEntries = get().weightEntries;
      const newEntries = currentEntries.map(e => e.id === entryId ? entry : e);
      const stats = calculateStats(newEntries);

      set({
        weightEntries: newEntries,
        stats,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  deleteWeightEntry: async (entryId: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('body_weight_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      const currentEntries = get().weightEntries;
      const newEntries = currentEntries.filter(entry => entry.id !== entryId);
      const stats = calculateStats(newEntries);

      set({
        weightEntries: newEntries,
        stats,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  getWeightStats: () => {
    return get().stats;
  },

  getWeightTrend: (days: number) => {
    const entries = get().weightEntries;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return entries
      .filter(entry => new Date(entry.recorded_at) >= cutoffDate)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  },
}));