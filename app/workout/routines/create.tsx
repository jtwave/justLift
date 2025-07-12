import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useRoutineStore } from '@/store/routineStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { router } from 'expo-router';
import { X, Plus, Minus, GripVertical } from 'lucide-react-native';
import { ExerciseSearchModal } from '@/components/ExerciseSearchModal';

export default function CreateRoutineScreen() {
  const [routineName, setRoutineName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  
  const { createRoutine, loading } = useRoutineStore();
  const { exercises, loadExercises } = useWorkoutStore();

  useEffect(() => {
    if (exercises.length === 0) {
      loadExercises();
    }
  }, [exercises.length, loadExercises]);

  const handleAddExercise = (exerciseId: string) => {
    if (!selectedExercises.includes(exerciseId)) {
      setSelectedExercises([...selectedExercises, exerciseId]);
    }
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(id => id !== exerciseId));
  };

  const handleMoveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    const currentIndex = selectedExercises.indexOf(exerciseId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= selectedExercises.length) return;

    const newExercises = [...selectedExercises];
    [newExercises[currentIndex], newExercises[newIndex]] = [newExercises[newIndex], newExercises[currentIndex]];
    setSelectedExercises(newExercises);
  };

  const handleSave = async () => {
    if (!routineName.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    try {
      await createRoutine(routineName.trim(), description.trim() || null, selectedExercises);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create routine');
    }
  };

  const getExerciseById = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Routine</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !routineName.trim() || selectedExercises.length === 0}
          style={[
            styles.saveButton,
            (!routineName.trim() || selectedExercises.length === 0) && styles.saveButtonDisabled
          ]}
        >
          <Text style={[
            styles.saveButtonText,
            (!routineName.trim() || selectedExercises.length === 0) && styles.saveButtonTextDisabled
          ]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Routine Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Routine Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={routineName}
              onChangeText={setRoutineName}
              placeholder="e.g., Push Day, Upper Body"
              placeholderTextColor={Colors.secondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of this routine..."
              placeholderTextColor={Colors.secondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowExerciseModal(true)}
            >
              <Plus size={20} color={Colors.accent} />
              <Text style={styles.addExerciseText}>Add</Text>
            </TouchableOpacity>
          </View>

          {selectedExercises.length > 0 ? (
            selectedExercises.map((exerciseId, index) => {
              const exercise = getExerciseById(exerciseId);
              if (!exercise) return null;

              return (
                <View key={exerciseId} style={styles.exerciseItem}>
                  <View style={styles.exerciseInfo}>
                    <GripVertical size={16} color={Colors.secondary} />
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseCategory}>{exercise.category}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      onPress={() => handleMoveExercise(exerciseId, 'up')}
                      disabled={index === 0}
                      style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                    >
                      <Text style={[styles.moveButtonText, index === 0 && styles.moveButtonTextDisabled]}>↑</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleMoveExercise(exerciseId, 'down')}
                      disabled={index === selectedExercises.length - 1}
                      style={[styles.moveButton, index === selectedExercises.length - 1 && styles.moveButtonDisabled]}
                    >
                      <Text style={[styles.moveButtonText, index === selectedExercises.length - 1 && styles.moveButtonTextDisabled]}>↓</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleRemoveExercise(exerciseId)}
                      style={styles.removeButton}
                    >
                      <Minus size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyExercises}>
              <Text style={styles.emptyExercisesText}>No exercises added yet</Text>
              <Text style={styles.emptyExercisesSubtext}>Tap "Add" to include exercises in this routine</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ExerciseSearchModal
        visible={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSelectExercise={handleAddExercise}
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
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.accent,
  },
  saveButtonTextDisabled: {
    color: Colors.secondary,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: FontSizes.body,
    color: Colors.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addExerciseText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.accent,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginBottom: 2,
  },
  exerciseCategory: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
  moveButtonText: {
    fontSize: 16,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  moveButtonTextDisabled: {
    color: Colors.secondary,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyExercises: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyExercisesText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 4,
  },
  emptyExercisesSubtext: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
});