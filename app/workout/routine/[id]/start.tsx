import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useRoutineStore } from '@/store/routineStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useLocalSearchParams, router } from 'expo-router';

export default function StartRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { routines, loadRoutines } = useRoutineStore();
  const { startWorkout } = useWorkoutStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (routines.length === 0) {
      loadRoutines();
    }
  }, [routines.length, loadRoutines]);

  useEffect(() => {
    if (id && routines.length > 0) {
      const routine = routines.find(r => r.id === id);
      if (routine) {
        handleStartWorkout(routine);
      }
    }
  }, [id, routines]);

  const handleStartWorkout = async (routine: any) => {
    if (loading) return;
    
    setLoading(true);
    try {
      await startWorkout(routine.name, routine.id);
      router.replace('/workout/active');
    } catch (error) {
      Alert.alert('Error', 'Failed to start workout from routine');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.loadingText}>Starting workout...</Text>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
});