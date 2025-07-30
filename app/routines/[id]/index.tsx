import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useRoutineStore } from '@/store/routineStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Play, CreditCard as Edit, Trash2 } from 'lucide-react-native';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { routines, loadRoutines, deleteRoutine } = useRoutineStore();
  const { startWorkout, currentWorkout } = useWorkoutStore();

  const [routine, setRoutine] = useState<any>(null);

  useEffect(() => {
    if (routines.length === 0) {
      loadRoutines();
    }
  }, [routines.length, loadRoutines]);

  useEffect(() => {
    if (id && routines.length > 0) {
      const foundRoutine = routines.find(r => r.id === id);
      setRoutine(foundRoutine);
    }
  }, [id, routines]);

  const handleStartWorkout = async () => {
    if (!routine) return;

    // Check if there's already an active workout
    if (currentWorkout) {
      Alert.alert(
        'Active Workout Found',
        'You already have an active workout. Would you like to delete the current workout and start a new one?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete & Start New',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete current workout
                const { discardWorkout } = useWorkoutStore.getState();
                await discardWorkout(currentWorkout.id);

                // Start new workout from routine
                await startWorkout(routine.name, routine.id);
                router.push('/workout/active');
              } catch (error) {
                Alert.alert('Error', 'Failed to start workout from routine. Please try again.');
              }
            }
          }
        ]
      );
      return;
    }

    try {
      await startWorkout(routine.name, routine.id);
      router.push('/workout/active');
    } catch (error) {
      Alert.alert('Error', 'Failed to start workout from routine');
    }
  };

  const handleEdit = () => {
    router.push(`/workout/routines/edit?id=${id}`);
  };

  const handleDelete = () => {
    if (!routine) return;

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${routine.name}"?`)) {
        (async () => {
          try {
            await deleteRoutine(routine.id);
            await loadRoutines();
            router.back();
          } catch (error) {
            alert('Failed to delete routine: ' + (error?.message || error?.toString() || 'Unknown error'));
          }
        })();
      }
      return;
    }

    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete "${routine.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoutine(routine.id);
              await loadRoutines();
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete routine: ' + (error?.message || error?.toString() || 'Unknown error'));
            }
          }
        }
      ]
    );
  };

  if (!routine) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{routine.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.headerAction}>
            <Edit size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerAction}>
            <Trash2 size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Routine Info */}
        <View style={styles.section}>
          <View style={styles.routineInfo}>
            <Text style={styles.routineName}>{routine.name}</Text>
            {routine.description && (
              <Text style={styles.routineDescription}>{routine.description}</Text>
            )}
            <Text style={styles.routineStats}>
              {routine.exercises.length} exercises
            </Text>
          </View>
        </View>

        {/* Start Workout Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartWorkout}
          >
            <Play size={24} color={Colors.primary} />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>

        {/* Exercises List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {routine.exercises.map((routineExercise: any, index: number) => {
            // Parse the default_sets to get sets and reps info
            let setsInfo = '';
            try {
              if (routineExercise.default_sets) {
                const defaultSets = JSON.parse(routineExercise.default_sets);
                if (Array.isArray(defaultSets) && defaultSets.length > 0) {
                  const firstSet = defaultSets[0];
                  const totalSets = defaultSets.length;
                  setsInfo = `${totalSets} sets × ${firstSet.reps || 0} reps`;
                  if (firstSet.weight && firstSet.weight > 0) {
                    setsInfo += ` @ ${firstSet.weight} lbs`;
                  }
                }
              }
            } catch (error) {
              console.error('Error parsing default_sets:', error);
            }

            return (
              <View key={routineExercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{routineExercise.exercise.name}</Text>
                  <Text style={styles.exerciseCategory}>{routineExercise.exercise.category}</Text>
                  {setsInfo ? (
                    <Text style={styles.exerciseSets}>{setsInfo}</Text>
                  ) : null}
                  <Text style={styles.exerciseRest}>
                    Rest: {routineExercise.default_rest_time === 0 ? 'Off' : `${Math.floor(routineExercise.default_rest_time / 60)}:${(routineExercise.default_rest_time % 60).toString().padStart(2, '0')}`}
                  </Text>
                </View>
              </View>
            );
          })}
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
  headerTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  routineInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  routineName: {
    fontSize: FontSizes.screenTitle,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  routineDescription: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  routineStats: {
    fontSize: FontSizes.body,
    color: Colors.accent,
    fontWeight: FontWeights.semibold,
  },
  startButton: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: 20,
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  exerciseNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseNumberText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 6,
  },
  exerciseCategory: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  exerciseSets: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
    marginBottom: 4,
    fontWeight: FontWeights.medium,
  },
  exerciseRest: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    fontWeight: FontWeights.medium,
  },
});