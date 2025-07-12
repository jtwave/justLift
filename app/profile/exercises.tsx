import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useProgressStore } from '@/store/progressStore';
import { router } from 'expo-router';
import { ArrowLeft, ChartBar as BarChart3, TrendingUp } from 'lucide-react-native';

export default function ExerciseProgressScreen() {
  const { exerciseProgress, loadExerciseProgress, loading } = useProgressStore();

  useEffect(() => {
    loadExerciseProgress();
  }, [loadExerciseProgress]);

  const handleExercisePress = (exerciseId: string) => {
    router.push(`/profile/exercise/${exerciseId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise Progress</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Exercises</Text>
          {exerciseProgress.length > 0 ? (
            exerciseProgress.map((exercise) => (
              <TouchableOpacity
                key={exercise.exerciseId}
                style={styles.exerciseCard}
                onPress={() => handleExercisePress(exercise.exerciseId)}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                  <Text style={styles.exerciseCategory}>{exercise.category}</Text>
                  <Text style={styles.exerciseStats}>
                    {exercise.data.length} sessions • Best e1RM: {Math.round(Math.max(...exercise.data.map(d => d.e1rm)))} lbs
                  </Text>
                </View>
                <BarChart3 size={20} color={Colors.accent} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <TrendingUp size={48} color={Colors.secondary} />
              <Text style={styles.emptyStateTitle}>No Exercise Data</Text>
              <Text style={styles.emptyStateText}>
                Complete workouts to see your exercise progress and strength gains over time.
              </Text>
            </View>
          )}
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
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginBottom: 4,
  },
  exerciseStats: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 24,
  },
});