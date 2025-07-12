import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useRoutineStore } from '@/store/routineStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { router } from 'expo-router';
import { Plus, Play, ChevronRight, Dumbbell } from 'lucide-react-native';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

export default function WorkoutScreen() {
  const { routines, loadRoutines, loading } = useRoutineStore();
  const { startWorkout, currentWorkout, loadCurrentWorkout, loading: workoutLoading } = useWorkoutStore();

  useEffect(() => {
    loadRoutines();
    loadCurrentWorkout(); // Also load current workout state
  }, [loadRoutines, loadCurrentWorkout]);

  const handleStartBlankWorkout = async () => {
    // Check if there's already an active workout
    if (currentWorkout) {
      router.push('/workout/active');
      return;
    }

    try {
      // Generate a descriptive name with current time
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const workoutName = `Workout - ${timeString}`;

      await startWorkout(workoutName);
      router.push('/workout/active');
    } catch (error) {
      console.error('Failed to start workout:', error);
    }
  };

  const handleStartFromRoutine = async (routine: any) => {
    try {
      await startWorkout(routine.name, routine.id);
      router.push('/workout/active');
    } catch (error) {
      console.error('Failed to start workout from routine:', error);
    }
  };

  // Show loading screen while data is being loaded
  if (loading || workoutLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Workout</Text>
          <Text style={styles.headerSubtitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading your workouts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Workout</Text>
          <Text style={styles.headerSubtitle}>Start training or manage routines</Text>
        </View>

        {/* Start Blank Workout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.startWorkoutButton}
            onPress={handleStartBlankWorkout}
            disabled={loading}
          >
            <Dumbbell size={24} color={Colors.primary} />
            <Text style={styles.startWorkoutText}>
              {currentWorkout ? 'Resume Workout' : 'Start Blank Workout'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Your Routines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Routines</Text>
          {routines.length > 0 ? (
            routines.map((routine) => (
              <TouchableOpacity
                key={routine.id}
                style={styles.routineCard}
                onPress={() => handleStartFromRoutine(routine)}
              >
                <View style={styles.routineInfo}>
                  <Text style={styles.routineName}>{routine.name}</Text>
                  <Text style={styles.routineDetails}>
                    {routine.exercises.length} exercises
                  </Text>
                  {routine.description && (
                    <Text style={styles.routineDescription}>{routine.description}</Text>
                  )}
                </View>
                <View style={styles.routineActions}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handleStartFromRoutine(routine)}
                  >
                    <Play size={16} color={Colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => router.push(`/routines/${routine.id}`)}
                  >
                    <ChevronRight size={20} color={Colors.secondary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyRoutines}>
              <Text style={styles.emptyRoutinesText}>No routines yet</Text>
              <Text style={styles.emptyRoutinesSubtext}>
                Create your first routine to save time on future workouts
              </Text>
            </View>
          )}
        </View>

        {/* Create New Routine */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.createRoutineButton}
            onPress={() => router.push('/workout/routines/create')}
            disabled={loading}
          >
            <Plus size={24} color={Colors.accent} />
            <Text style={styles.createRoutineText}>Create New Routine</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: FontSizes.screenTitle,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 16,
  },
  startWorkoutButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  startWorkoutText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  routineCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 4,
  },
  routineDetails: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginBottom: 4,
  },
  routineDescription: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    fontStyle: 'italic',
  },
  routineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsButton: {
    padding: 4,
  },
  emptyRoutines: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyRoutinesText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 4,
  },
  emptyRoutinesSubtext: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    textAlign: 'center',
  },
  createRoutineButton: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  createRoutineText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.accent,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
});