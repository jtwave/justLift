import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Animated, KeyboardAvoidingView } from 'react-native';
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
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

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
    addWorkoutSet,
    updateWorkoutSets,
    reorderExercises
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragEndTime, setDragEndTime] = useState(0);

  useEffect(() => {
    // Only load if we don't have current workout data
    if (!currentWorkout) {
      loadCurrentWorkout();
    }
  }, []);

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
      const { deleteWorkoutSet } = useWorkoutStore.getState();
      await deleteWorkoutSet(setId);

      // Reload current workout to refresh the UI
      await loadCurrentWorkout();
    } catch (error) {
      console.error('Error deleting set:', error);
      Alert.alert('Error', 'Failed to delete set. Please try again.');
    }
  };

  const handleLogSet = async (workoutExerciseId: string, setData: any) => {
    // Get current exercise state before logging
    const exerciseBeforeLog = currentWorkout?.exercises.find(ex => ex.id === workoutExerciseId);

    await logSet(workoutExerciseId, setData);

    // Reload current workout to get the latest state
    await loadCurrentWorkout();

    // Get the fresh workout state and check if we should show rest timer
    const state = useWorkoutStore.getState();

    const exercise = state.currentWorkout?.exercises.find(ex => ex.id === workoutExerciseId);

    // Only show rest timer if marking as completed and rest_time is greater than 0
    if (setData.completed && exercise && exercise.rest_time > 0) {
      setRestTimerDuration(exercise.rest_time);
      setShowRestTimer(true);
    }
  };

  // Update handleAddSet to use addWorkoutSet for adding a set, but do not set completed: true
  const handleAddSet = async (workoutExerciseId: string, setData: any) => {
    // Use addWorkoutSet to add a new set (not completed)
    const { addWorkoutSet } = useWorkoutStore.getState();
    await addWorkoutSet(workoutExerciseId, setData);

    // Reload current workout to refresh the UI
    await loadCurrentWorkout();
  };

  const handleUpdateSets = async (workoutExerciseId: string, sets: any[]) => {
    await updateWorkoutSets(workoutExerciseId, sets);
  };

  const handleFinishWorkout = () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise to finish your workout.');
      return;
    }

    if (isFinishing) return; // Prevent double-tap

    const finishWorkoutAction = async () => {
      setIsFinishing(true);

      // Store the current workout for the summary modal BEFORE finishing
      const workoutForSummary = {
        ...currentWorkout,
        end_time: new Date().toISOString(),
        exercises: currentWorkout.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.filter(set => set.completed)
        }))
      };

      setCompletedWorkout(workoutForSummary);

      // Show the summary modal immediately without finishing the workout yet
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
    await updateRestTime(exerciseId, restTime);

    // Reload current workout to get updated rest times
    await loadCurrentWorkout();

    setShowRestTimerSettings(false);
    setSelectedExerciseForSettings(null);
  };

  const handleReorderExercises = async (data: any[]) => {
    setIsDragging(false);
    setDragEndTime(Date.now());
    const exerciseIds = data.map(item => item.key);
    await reorderExercises(exerciseIds);
  };

  // Memoize the data to prevent unnecessary re-renders
  const draggableData = useMemo(() =>
    currentWorkout?.exercises.map((exercise, index) => ({
      key: exercise.id,
      exercise,
      index
    })) || [], [currentWorkout?.exercises]
  );

  // Memoize the renderItem function
  const renderExerciseItem = useCallback(({ item, drag, isActive }: RenderItemParams<any>) => {
    const handleToggle = () => {
      // Add a small delay after dragging to prevent conflicts
      const timeSinceDragEnd = Date.now() - dragEndTime;
      if (isDragging || timeSinceDragEnd < 300) {
        return; // Prevent toggle if still dragging or recently dragged
      }

      setOpenExercises((prev) =>
        prev.includes(item.exercise.id)
          ? prev.filter((id) => id !== item.exercise.id)
          : [...prev, item.exercise.id]
      );
    };

    const handleLongPress = () => {
      setIsDragging(true);
      drag();
    };

    return (
      <Animated.View style={[styles.draggableItem, isActive && styles.draggableItemActive]}>
        <ExerciseCard
          exercise={item.exercise}
          isOpen={openExercises.includes(item.exercise.id)}
          onToggle={handleToggle}
          onLogSet={(setData) => handleLogSet(item.exercise.id, setData)}
          onAddSet={(setData) => handleAddSet(item.exercise.id, setData)}
          onRestTimerSettings={() => handleRestTimerSettings(item.exercise.id)}
          onDeleteExercise={() => handleDeleteExercise(item.exercise.id)}
          onDeleteSet={(setId) => handleDeleteSet(setId)}
          onUpdateSets={(sets) => handleUpdateSets(item.exercise.id, sets)}
          onLongPress={handleLongPress}
        />
      </Animated.View>
    );
  }, [openExercises, handleLogSet, handleAddSet, handleRestTimerSettings, handleDeleteExercise, handleDeleteSet, handleUpdateSets, isDragging, dragEndTime]);

  // Memoize the ListFooterComponent
  const ListFooterComponent = useCallback(() => (
    <View style={{ paddingHorizontal: 20 }}>
      <TouchableOpacity
        style={[styles.addExerciseButton, { marginTop: 16 }]}
        onPress={() => setShowExerciseModal(true)}
        disabled={loading}
      >
        <Plus size={24} color={Colors.accent} />
        <Text style={styles.addExerciseText}>Add Exercise</Text>
      </TouchableOpacity>
      <View style={styles.bottomPadding} />
    </View>
  ), [loading]);

  const handleBackPress = () => {
    router.back();
  };

  const handleDeleteWorkout = () => {
    if (!currentWorkout) {
      return;
    }

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
              await discardWorkout(currentWorkout.id);
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
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loadingText}>Loading workout...</Text>
          </View>
        )}
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <DraggableFlatList
          data={draggableData}
          onDragEnd={({ data }) => handleReorderExercises(data)}
          onDragBegin={() => setIsDragging(true)}
          keyExtractor={(item) => item.key}
          renderItem={renderExerciseItem}
          ListFooterComponent={ListFooterComponent}
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT, paddingTop: 8, paddingHorizontal: 0 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          simultaneousHandlers={[]}
          activationDistance={10}
          dragHitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        />
      </KeyboardAvoidingView>

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
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  elapsedTime: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.accent,
    textAlign: 'center',
  },
  workoutName: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    textAlign: 'center',
    marginTop: 4,
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
    fontWeight: FontWeights.semibold,
    color: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
  },
  addExerciseText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.accent,
  },
  bottomPadding: {
    height: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  emptyStateTitle: {
    fontSize: FontSizes.screenTitle,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  startButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  draggableItem: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  draggableItemActive: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
    backgroundColor: Colors.accent,
    borderRadius: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
});