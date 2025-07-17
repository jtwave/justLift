import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useRoutineStore } from '@/store/routineStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { router, useFocusEffect } from 'expo-router';
import { X, Plus, Minus, GripVertical, Circle } from 'lucide-react-native';
import { ExerciseSearchModal } from '@/components/ExerciseSearchModal';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import uuid from 'react-native-uuid';

export default function CreateRoutineScreen() {
  const [routineName, setRoutineName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseList, setExerciseList] = useState<any[]>([]); // [{ id, superset_id }]
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [supersetOrder, setSupersetOrder] = useState<string[]>([]); // array of superset_ids in order of creation

  const { createRoutine, loading } = useRoutineStore();
  const { exercises, loadExercises } = useWorkoutStore();

  useEffect(() => {
    if (exercises.length === 0) {
      loadExercises();
    }
  }, [exercises.length, loadExercises]);

  // Update exerciseList when selectedExercises changes
  useEffect(() => {
    setExerciseList(selectedExercises.map(id => ({ id, superset_id: null })));
  }, [selectedExercises]);

  // Add this function inside CreateRoutineScreen
  const updateExerciseConfig = (exerciseId: string, updatedConfig: any) => {
    setExerciseList(list => list.map(e => e.id === exerciseId ? { ...e, ...updatedConfig } : e));
  };

  // Listen for focus events to handle config updates
  useFocusEffect(
    React.useCallback(() => {
      // Check if there is updated config in router params or a global temp store
      // For now, we can use a global temp variable (window.__updatedExerciseConfig)
      if (typeof window !== 'undefined' && window.__updatedExerciseConfig) {
        const { exerciseId, updatedConfig } = window.__updatedExerciseConfig;
        if (exerciseId && updatedConfig) {
          updateExerciseConfig(exerciseId, updatedConfig);
          window.__updatedExerciseConfig = null;
        }
      }
    }, [])
  );

  const handleAddExercise = (exerciseId: string) => {
    if (!exerciseList.some(e => e.id === exerciseId)) {
      setExerciseList([...exerciseList, { id: exerciseId, superset_id: null }]);
    }
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExerciseList(exerciseList.filter(e => e.id !== exerciseId));
    setSelectedIds(selectedIds.filter(id => id !== exerciseId));
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

  const handleDragEnd = ({ data }: { data: any[] }) => {
    setExerciseList(data);
  };

  const handleSelectExercise = (exerciseId: string) => {
    setSelectedIds(prev =>
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleStartSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds([]);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  // Helper to group exercises by superset_id
  const getGroupedExercises = () => {
    const supersets: { [superset_id: string]: any[] } = {};
    const singles: any[] = [];
    exerciseList.forEach(ex => {
      if (ex.superset_id) {
        if (!supersets[ex.superset_id]) supersets[ex.superset_id] = [];
        supersets[ex.superset_id].push(ex);
      } else {
        singles.push(ex);
      }
    });
    return { supersets, singles };
  };

  const getSupersetLabel = (superset_id: string) => {
    const index = supersetOrder.indexOf(superset_id);
    return index !== -1 ? `Superset ${index + 1}` : 'Superset';
  };

  const handleGroupSuperset = () => {
    if (selectedIds.length < 2) return;
    const newSupersetId = uuid.v4();
    setExerciseList(list =>
      list.map(e =>
        selectedIds.includes(e.id)
          ? { ...e, superset_id: newSupersetId }
          : e
      )
    );
    handleExitSelectionMode();
  };

  const handleDropToSuperset = () => {
    if (selectedIds.length < 2) return;
    const newSupersetId = uuid.v4();
    setExerciseList(list =>
      list.map(e =>
        selectedIds.includes(e.id)
          ? { ...e, superset_id: newSupersetId }
          : e
      )
    );
    handleExitSelectionMode();
  };

  const handleSave = async () => {
    if (!routineName.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }

    if (exerciseList.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    try {
      await createRoutine(routineName.trim(), description.trim() || null, exerciseList.map(e => e.id));
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create routine');
    }
  };

  const getExerciseById = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId);
  };

  const handleEditExercise = (exerciseId: string) => {
    const ex = exerciseList.find(e => e.id === exerciseId);
    if (ex) {
      // Navigate to config page instead of opening modal
      router.push({
        pathname: '/workout/routines/exercise-config',
        params: {
          exerciseId: exerciseId,
          exerciseData: JSON.stringify(ex)
        }
      });
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    const exercise = getExerciseById(item.id);
    if (!exercise) return null;
    const isSelected = selectedIds.includes(item.id);
    const isSuperset = !!item.superset_id;
    const supersetLabel = isSuperset ? getSupersetLabel(item.superset_id) : null;
    return (
      <TouchableOpacity
        onPress={selectionMode ? () => handleSelectExercise(item.id) : () => handleEditExercise(item.id)}
        onPressOut={drag}
        style={[
          styles.exerciseItem,
          isSelected && selectionMode && styles.selectedItem,
          isSuperset && styles.supersetItem
        ]}
        activeOpacity={0.9}
      >
        <View style={styles.exerciseInfo}>
          <GripVertical size={16} color={Colors.secondary} />
          <View style={styles.exerciseDetails}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseCategory}>{exercise.category}</Text>
            {/* Show config summary if present */}
            {item.sets && item.reps && item.weight && (
              <Text style={styles.exerciseConfigSummary}>
                {item.sets} sets x {item.reps} reps @ {item.weight} lbs{item.rest_time ? `, ${item.rest_time}s rest` : ''}
              </Text>
            )}
            {supersetLabel && <Text style={styles.supersetLabel}>{supersetLabel}</Text>}
            {isSelected && selectionMode && <Text style={styles.selectedLabel}>Selected</Text>}
          </View>
        </View>
        <View style={styles.exerciseActions}>
          <TouchableOpacity onPress={() => handleRemoveExercise(item.id)} style={styles.removeButton}>
            <Minus size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
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
          disabled={loading || !routineName.trim() || exerciseList.length === 0}
          style={[
            styles.saveButton,
            (!routineName.trim() || exerciseList.length === 0) && styles.saveButtonDisabled
          ]}
        >
          <Text style={[
            styles.saveButtonText,
            (!routineName.trim() || exerciseList.length === 0) && styles.saveButtonTextDisabled
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
          <View style={styles.supersetTopRow}>
            {!selectionMode && exerciseList.length >= 2 && (
              <TouchableOpacity style={styles.createSupersetButton} onPress={handleStartSelectionMode}>
                <Text style={styles.createSupersetButtonText}>Create Superset</Text>
              </TouchableOpacity>
            )}
          </View>
          {exerciseList.length > 0 ? (
            <>
              {selectionMode && (
                <View style={styles.supersetDropZone}>
                  <TouchableOpacity
                    style={[styles.supersetButton, selectedIds.length < 2 && { opacity: 0.5 }]}
                    onPress={handleDropToSuperset}
                    disabled={selectedIds.length < 2}
                  >
                    <Text style={styles.supersetButtonText}>Group Selected as Superset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleExitSelectionMode} style={styles.exitSelectionButton}>
                    <Text style={styles.exitSelectionText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* Render grouped supersets */}
              {Object.entries(getGroupedExercises().supersets).map(([superset_id, group], i) => (
                <View key={superset_id} style={styles.supersetBlock}>
                  <Text style={styles.supersetBlockLabel}>{getSupersetLabel(superset_id)}</Text>
                  {group.map(item => renderItem({ item, drag: () => { }, isActive: false }))}
                </View>
              ))}
              {/* Render singles */}
              {getGroupedExercises().singles.map(item => renderItem({ item, drag: () => { }, isActive: false }))}
              {!selectionMode && (
                <Text style={styles.supersetInstructionsLabel}>
                  Tap "Create Superset" to select exercises
                </Text>
              )}
            </>
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
  selectedItem: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  supersetItem: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  supersetLabel: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
    marginTop: 4,
  },
  selectedLabel: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
    marginTop: 4,
  },
  supersetButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  supersetButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.accentContrast,
  },
  supersetInstructions: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  instructionsText: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginBottom: 4,
  },
  selectionInfo: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  selectionText: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  supersetInstructionsLabel: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
    marginBottom: 8,
    textAlign: 'center',
  },
  selectCircle: {
    marginRight: 8,
    marginLeft: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
  },
  supersetDropZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  exitSelectionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  exitSelectionText: {
    color: Colors.secondary,
    fontSize: FontSizes.body,
  },
  supersetTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  createSupersetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  createSupersetButtonText: {
    color: Colors.accent,
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
  },
  supersetBlock: {
    marginBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 8,
  },
  supersetBlockLabel: {
    color: Colors.accent,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.caption,
    marginBottom: 4,
    marginLeft: 8,
  },
  exerciseConfigSummary: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 2,
  },
});