import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
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
  const { startWorkout } = useWorkoutStore();
  
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
    
    try {
      await startWorkout(routine.name, routine.id);
      router.push('/workout');
    } catch (error) {
      Alert.alert('Error', 'Failed to start workout from routine');
    }
  };

  const handleEdit = () => {
    router.push(`/routines/${id}/edit`);
  };

  const handleDelete = () => {
    if (!routine) return;
    
    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete "${routine.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteRoutine(routine.id);
            router.back();
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
          {routine.exercises.map((routineExercise: any, index: number) => (
            <View key={routineExercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{routineExercise.exercise.name}</Text>
                <Text style={styles.exerciseCategory}>{routineExercise.exercise.category}</Text>
                <Text style={styles.exerciseRest}>
                  Rest: {Math.floor(routineExercise.default_rest_time / 60)}:{(routineExercise.default_rest_time % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            </View>
          ))}
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
    paddingVertical: 24,
  },
  routineInfo: {
    alignItems: 'center',
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
    fontWeight: FontWeights.medium,
  },
  startButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  startButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 16,
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginBottom: 4,
  },
  exerciseCategory: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginBottom: 2,
  },
  exerciseRest: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
  },
});