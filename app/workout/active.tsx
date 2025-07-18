import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { ExerciseCard } from '@/components/ExerciseCard';
import { ExerciseSearchModal } from '@/components/ExerciseSearchModal';
import { RestTimer } from '@/components/RestTimer';
import { RestTimerSettings } from '@/components/RestTimerSettings';
import { WorkoutSummaryModal } from '@/components/WorkoutSummaryModal';
import { router } from 'expo-router';
import { Plus, ArrowLeft, Trash2 } from 'lucide-react-native';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

export default function ActiveWorkoutScreen() {
  const {
    currentWorkout,
    finishWorkout,
    startWorkout,
    addExercise,
    logSet,
    setActiveExercise,
    loadCurrentWorkout,
    updateWorkoutDetails,
    discardWorkout,
    updateRestTime,
    removeExercise,
    loading,
    addWorkoutSet
  } = useWorkoutStore();

  const { elapsedTime, formatTime, startTimer, resetTimer } = useWorkoutTimer();
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [completedWorkout, setCompletedWorkout] = useState<any>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showRestTimerSettings, setShowRestTimerSettings] = useState(false);
  const [selectedExerciseForSettings, setSelectedExerciseForSettings] = useState<string | null>(null);

  // Rest timer state
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(90);

  // State to manage which exercises are open/closed
  const [openExercises, setOpenExercises] = useState<string[]>([]);

  useEffect(() => {
    loadCurrentWorkout();
  }, [loadCurrentWorkout]);

  useEffect(() => {
    if (currentWorkout) {
      const workoutStartTime = new Date(currentWorkout.start_time).getTime();
      startTimer(workoutStartTime);
    }
  }, [currentWorkout, startTimer]);

  const handleAddExercise = async (exerciseId: string) => {
    await addExercise(exerciseId);
  };

  const handleDeleteExercise = async (workoutExerciseId: string) => {
    await removeExercise(workoutExerciseId);
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      console.log('handleDeleteSet called with setId:', setId);
      const { deleteWorkoutSet } = useWorkoutStore.getState();
      await deleteWorkoutSet(setId);
      console.log('Set deleted successfully');

      // Reload current workout to refresh the UI
      await loadCurrentWorkout();
    } catch (error) {
      console.error('Error deleting set:', error);
      Alert.alert('Error', 'Failed to delete set. Please try again.');
    }
  };
  const handleLogSet = async (workoutExerciseId: string, setData: any) => {
    console.log('=== HANDLE LOG SET START ===');
    console.log('workoutExerciseId:', workoutExerciseId);
    console.log('setData:', setData);

    // Get current exercise state before logging
    const exerciseBeforeLog = currentWorkout?.exercises.find(ex => ex.id === workoutExerciseId);
    console.log('Exercise BEFORE log set:', {
      id: exerciseBeforeLog?.id,
      name: exerciseBeforeLog?.exercise.name,
      rest_time: exerciseBeforeLog?.rest_time,
      is_active: exerciseBeforeLog?.is_active
    });

    await logSet(workoutExerciseId, setData);
    console.log('Set logged successfully');

    // Reload current workout to get the latest state
    console.log('Reloading current workout...');
    await loadCurrentWorkout();
    console.log('Current workout reloaded');

    // Get the fresh workout state and check if we should show rest timer
    const state = useWorkoutStore.getState();
    console.log('Fresh workout state loaded');

    const exercise = state.currentWorkout?.exercises.find(ex => ex.id === workoutExerciseId);
    console.log('Exercise AFTER reload:', {
      id: exercise?.id,
      name: exercise?.exercise.name,
      rest_time: exercise?.rest_time,
      is_active: exercise?.is_active
    });

    // Only show rest timer if marking as completed and rest_time is greater than 0
    if (setData.completed && exercise && exercise.rest_time > 0) {
      console.log('Showing rest timer with duration:', exercise.rest_time);
      setRestTimerDuration(exercise.rest_time);
      setShowRestTimer(true);
    } else {
      console.log('NOT showing rest timer. Exercise:', !!exercise, 'rest_time:', exercise?.rest_time);
    }

    console.log('=== HANDLE LOG SET END ===');
  };

  // Update handleAddSet to use addWorkoutSet for adding a set, but do not set completed: true
  const handleAddSet = async (workoutExerciseId: string, setData: any) => {
    console.log('=== HANDLE ADD SET START ===');
    console.log('workoutExerciseId:', workoutExerciseId);
    console.log('setData:', setData);

    // Use addWorkoutSet to add a new set (not completed)
    const { addWorkoutSet } = useWorkoutStore.getState();
    console.log('Calling addWorkoutSet...');
    await addWorkoutSet(workoutExerciseId, setData);
    console.log('addWorkoutSet completed');

    // Reload current workout to refresh the UI
    console.log('Reloading current workout...');
    await loadCurrentWorkout();
    console.log('Current workout reloaded');
    console.log('=== HANDLE ADD SET END ===');
  };

  const handleFinishWorkout = () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise to finish your workout.');
      return;
    }

    if (isFinishing) return; // Prevent double-tap

    const finishWorkoutAction = async () => {
      setIsFinishing(true);
      console.log('Starting finish workout process...');

      // Store the current workout for the summary modal BEFORE finishing
      const workoutForSummary = {
        ...currentWorkout,
        end_time: new Date().toISOString(),
        exercises: currentWorkout.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.filter(set => set.completed)
        }))
      };

      console.log('Workout summary data prepared:', workoutForSummary);
      setCompletedWorkout(workoutForSummary);

      // Show the summary modal immediately without finishing the workout yet
      console.log('Showing summary modal...');
      setShowSummaryModal(true);
      setIsFinishing(false);
    };

    if (Platform.OS === 'web') {
      // On web, use confirm dialog
      if (confirm('Are you sure you want to finish this workout?')) {
        finishWorkoutAction();
      }
    } else {
      // On mobile, use Alert
      Alert.alert(
        'Finish Workout',
        'Are you sure you want to finish this workout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Finish',
            onPress: finishWorkoutAction
          }
        ]
      );
    }
  };

  const handleStartWorkout = async () => {
    // Generate a descriptive name with current time
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const workoutName = `Workout - ${timeString}`;

    await startWorkout(workoutName);
  };

  const handleRestTimerSettings = (exerciseId: string) => {
    setSelectedExerciseForSettings(exerciseId);
    setShowRestTimerSettings(true);
  };

  const handleUpdateRestTime = async (exerciseId: string, restTime: number) => {
    console.log('=== UPDATE REST TIME START ===');
    console.log('exerciseId:', exerciseId);
    console.log('new restTime:', restTime);

    await updateRestTime(exerciseId, restTime);
    console.log('Rest time updated in database');

    // Reload current workout to get updated rest times
    console.log('Reloading current workout after rest time update...');
    await loadCurrentWorkout();
    console.log('Current workout reloaded after rest time update');

    // Log the updated exercise state
    const state = useWorkoutStore.getState();
    const exercise = state.currentWorkout?.exercises.find(ex => ex.id === exerciseId);
    console.log('Exercise after rest time update:', {
      id: exercise?.id,
      name: exercise?.exercise.name,
      rest_time: exercise?.rest_time,
      is_active: exercise?.is_active
    });

    setShowRestTimerSettings(false);
    setSelectedExerciseForSettings(null);
    console.log('=== UPDATE REST TIME END ===');
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleDeleteWorkout = () => {
    if (!currentWorkout) {
      console.log('No current workout to delete');
      return;
    }

    console.log('Attempting to delete workout:', currentWorkout.id);

    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('User confirmed deletion, calling discardWorkout...');
              await discardWorkout(currentWorkout.id);
              console.log('Workout deleted successfully');
              resetTimer();

              // Navigate back to the workout tab and refresh
              router.replace('/(tabs)/workout');
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', `Failed to delete workout: ${(error as Error).message}`);
            }
          }
        }
      ]
    );
  };

  const handleWorkoutSaved = async () => {
    try {
      console.log('Saving and finishing workout...');

      // Finish the workout immediately
      await finishWorkout();
      resetTimer();

      // Close modal and navigate immediately
      setShowSummaryModal(false);
      setCompletedWorkout(null);

      // Navigate directly to home tab
      router.replace('/(tabs)');

    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  const handleWorkoutDiscarded = () => {
    console.log('Workout discarded, returning to home...');
    setShowSummaryModal(false);
    setCompletedWorkout(null);
    router.replace('/(tabs)');
  };

  // Show loading screen while workout is being loaded
  if (loading && !currentWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.workoutName}>Loading...</Text>
          </View>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading your workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Start Workout</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Ready to Train?</Text>
          <Text style={styles.emptyStateText}>
            Start a new workout to begin tracking your lifts.
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartWorkout}
            disabled={loading}
          >
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.elapsedTime}>{formatTime(elapsedTime)}</Text>
          <Text style={styles.workoutName}>{currentWorkout.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleDeleteWorkout} style={styles.deleteButton}>
            <Trash2 size={20} color={Colors.error} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFinishWorkout} disabled={loading}>
            <Text style={[styles.finishButton, isFinishing && styles.finishButtonDisabled]}>
              {isFinishing ? 'Finishing...' : 'Finish'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT, paddingTop: 8, paddingHorizontal: 0 }}>
        {currentWorkout.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            isOpen={openExercises.includes(exercise.id)}
            onToggle={() => {
              setOpenExercises((prev) =>
                prev.includes(exercise.id)
                  ? prev.filter((id) => id !== exercise.id)
                  : [...prev, exercise.id]
              );
            }}
            onLogSet={(setData) => handleLogSet(exercise.id, setData)}
            onAddSet={(setData) => handleAddSet(exercise.id, setData)}
            onRestTimerSettings={() => handleRestTimerSettings(exercise.id)}
            onDeleteExercise={() => handleDeleteExercise(exercise.id)}
            onDeleteSet={(setId) => handleDeleteSet(setId)}
          />
        ))}
        <TouchableOpacity
          style={[styles.addExerciseButton, { marginTop: 16 }]}
          onPress={() => setShowExerciseModal(true)}
          disabled={loading}
        >
          <Plus size={24} color={Colors.accent} />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Exercise Search Modal */}
      <ExerciseSearchModal
        visible={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSelectExercise={handleAddExercise}
      />

      {/* Rest Timer Modal */}
      {showRestTimer && (
        <RestTimer
          visible={showRestTimer}
          onClose={() => setShowRestTimer(false)}
          onComplete={() => setShowRestTimer(false)}
          defaultDuration={restTimerDuration}
          compact={true}
        />
      )}

      {/* Rest Timer Settings Modal */}
      <RestTimerSettings
        visible={showRestTimerSettings}
        onClose={() => {
          setShowRestTimerSettings(false);
          setSelectedExerciseForSettings(null);
        }}
        exerciseId={selectedExerciseForSettings}
        currentRestTime={
          selectedExerciseForSettings
            ? currentWorkout?.exercises.find(ex => ex.id === selectedExerciseForSettings)?.rest_time || 90
            : 90
        }
        onUpdateRestTime={handleUpdateRestTime}
      />

      {/* Workout Summary Modal */}
      <WorkoutSummaryModal
        visible={showSummaryModal}
        onSave={handleWorkoutSaved}
        onDiscard={handleWorkoutDiscarded}
        workout={completedWorkout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
  },
  elapsedTime: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.bold,
    color: Colors.accent,
  },
  workoutName: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 2,
  },
  headerTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  placeholder: {
    width: 40,
  },
  finishButton: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.accent,
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  inactiveExercise: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inactiveExerciseName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  inactiveExerciseStatus: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  addExerciseButton: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  addExerciseText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.accent,
  },
  bottomPadding: {
    height: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyStateTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  startButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
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