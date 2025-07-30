import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useRoutineStore } from '@/store/routineStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Plus, Minus, GripVertical } from 'lucide-react-native';
import { ExerciseSearchModal } from '@/components/ExerciseSearchModal';

export default function EditRoutineScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [routineName, setRoutineName] = useState('');
    const [description, setDescription] = useState('');
    const [showExerciseModal, setShowExerciseModal] = useState(false);
    const [routineExerciseSets, setRoutineExerciseSets] = useState<any[]>([]);
    const [editingExercise, setEditingExercise] = useState<number | null>(null);

    const { routines, loadRoutines, updateRoutine, loading } = useRoutineStore();
    const { exercises, loadExercises } = useWorkoutStore();

    // Load routine data when component mounts
    useEffect(() => {
        if (exercises.length === 0) {
            loadExercises();
        }
        if (routines.length === 0) {
            loadRoutines();
        }
    }, [exercises.length, routines.length, loadExercises, loadRoutines]);

    // Load routine data when routines are loaded
    useEffect(() => {
        if (id && routines.length > 0) {
            const routine = routines.find(r => r.id === id);
            if (routine) {
                setRoutineName(routine.name);
                setDescription(routine.description || '');

                // Convert routine exercises to routineExerciseSets format
                const exerciseSetsData = routine.exercises.map((re: any) => ({
                    exerciseId: re.exercise_id,
                    name: re.exercise.name,
                    category: re.exercise.category,
                    sets: re.default_sets ? JSON.parse(re.default_sets) : []
                }));

                setRoutineExerciseSets(exerciseSetsData);
            }
        }
    }, [id, routines]);

    const handleAddExercise = (exerciseId: string) => {
        const exercise = exercises.find(ex => ex.id === exerciseId);
        if (exercise && !routineExerciseSets.some(ex => ex.exerciseId === exerciseId)) {
            const newExercise = {
                exerciseId: exercise.id,
                name: exercise.name,
                category: exercise.category,
                sets: [{ weight: '135', reps: '10' }],
                rest_time: 0
            };
            setRoutineExerciseSets([...routineExerciseSets, newExercise]);
        }
    };

    const handleSave = async () => {
        if (!routineName.trim()) {
            Alert.alert('Error', 'Please enter a routine name');
            return;
        }

        if (routineExerciseSets.length === 0) {
            Alert.alert('Error', 'Please add at least one exercise');
            return;
        }

        try {
            // Convert to the format expected by updateRoutine
            const exerciseConfigs = routineExerciseSets.map(ex => ({
                exercise_id: ex.exerciseId,
                sets: ex.sets ? ex.sets.map((set: any) => ({
                    weight: Number(set.weight) || 0,
                    reps: Number(set.reps) || 0
                })) : [],
                rest_time: ex.rest_time || 0
            }));

            // Use the enhanced updateRoutine function that handles exercise changes
            await updateRoutine(id as string, routineName.trim(), description.trim() || null, exerciseConfigs);

            Alert.alert('Success', 'Routine updated successfully!');
            router.back();
        } catch (error) {
            console.error('Error updating routine:', error);
            Alert.alert('Error', 'Failed to update routine: ' + (error as Error).message);
        }
    };

    const handleSetChange = (exerciseIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
        setRoutineExerciseSets(prev => prev.map((ex, i) =>
            i === exerciseIdx
                ? {
                    ...ex,
                    sets: ex.sets.map((set: any, j: number) =>
                        j === setIdx ? { ...set, [field]: value.replace(/[^0-9.]/g, '') } : set
                    )
                }
                : ex
        ));
    };

    const handleRestTimeChange = (exerciseIdx: number, value: string) => {
        setRoutineExerciseSets(prev => prev.map((ex, i) =>
            i === exerciseIdx
                ? { ...ex, rest_time: value === '' ? 0 : parseInt(value) || 0 }
                : ex
        ));
    };

    const toggleEditExercise = (exerciseIdx: number) => {
        setEditingExercise(editingExercise === exerciseIdx ? null : exerciseIdx);
    };

    const addSet = (exerciseIdx: number) => {
        setRoutineExerciseSets(prev => prev.map((ex, i) =>
            i === exerciseIdx
                ? {
                    ...ex,
                    sets: [...ex.sets, {
                        weight: ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].weight : '135',
                        reps: ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].reps : '10'
                    }]
                }
                : ex
        ));
    };

    const removeSet = (exerciseIdx: number, setIdx: number) => {
        setRoutineExerciseSets(prev => prev.map((ex, i) =>
            i === exerciseIdx
                ? {
                    ...ex,
                    sets: ex.sets.filter((_: any, j: number) => j !== setIdx)
                }
                : ex
        ));
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                        <X size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Routine</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading || !routineName.trim() || routineExerciseSets.length === 0}
                        style={[styles.headerButton, (!routineName.trim() || routineExerciseSets.length === 0) && { opacity: 0.5 }]}
                    >
                        <Text style={[styles.saveButtonText, (!routineName.trim() || routineExerciseSets.length === 0) && { color: Colors.secondary }]}>Save</Text>
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={Colors.secondary} />
                        <Text style={styles.loadingText}>Updating routine...</Text>
                    </View>
                )}

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
                        <View style={styles.exerciseHeader}>
                            <Text style={styles.sectionTitle}>Exercises</Text>
                            <TouchableOpacity
                                style={styles.addExerciseButton}
                                onPress={() => setShowExerciseModal(true)}
                            >
                                <Plus size={20} color={Colors.accent} />
                                <Text style={styles.addExerciseText}>Add</Text>
                            </TouchableOpacity>
                        </View>

                        {routineExerciseSets.length > 0 ? (
                            routineExerciseSets.map((exercise, exerciseIdx) => (
                                <View key={exercise.exerciseId} style={styles.exerciseCard}>
                                    <GripVertical size={18} color={Colors.secondary} />
                                    <View style={[styles.exerciseInfo, { flex: 1 }]}>
                                        <View style={styles.exerciseHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.exerciseName}>{exercise.name}</Text>
                                                <Text style={styles.exerciseCategory}>{exercise.category || ''}</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => toggleEditExercise(exerciseIdx)}
                                                style={styles.editButton}
                                            >
                                                <Text style={styles.editButtonText}>
                                                    {editingExercise === exerciseIdx ? 'Done' : 'Edit'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        {editingExercise === exerciseIdx ? (
                                            <View style={styles.setsEditContainer}>
                                                <View style={styles.restTimeRow}>
                                                    <Text style={styles.restTimeLabel}>Rest time:</Text>
                                                    <TextInput
                                                        style={styles.restTimeInputSmall}
                                                        value={exercise.rest_time?.toString() || ''}
                                                        onChangeText={(value) => handleRestTimeChange(exerciseIdx, value)}
                                                        placeholder="0"
                                                        placeholderTextColor={Colors.secondary}
                                                        keyboardType="numeric"
                                                    />
                                                    <Text style={styles.restTimeUnit}>seconds</Text>
                                                </View>
                                                {exercise.sets.map((set: any, setIdx: number) => (
                                                    <View key={setIdx} style={styles.setEditRow}>
                                                        <Text style={styles.setLabel}>Set {setIdx + 1}</Text>
                                                        <TextInput
                                                            style={styles.setInput}
                                                            value={set.weight.toString()}
                                                            onChangeText={(value) => handleSetChange(exerciseIdx, setIdx, 'weight', value)}
                                                            placeholder="Weight"
                                                            placeholderTextColor={Colors.secondary}
                                                            keyboardType="numeric"
                                                        />
                                                        <Text style={styles.setSeparator}>×</Text>
                                                        <TextInput
                                                            style={styles.setInput}
                                                            value={set.reps.toString()}
                                                            onChangeText={(value) => handleSetChange(exerciseIdx, setIdx, 'reps', value)}
                                                            placeholder="Reps"
                                                            placeholderTextColor={Colors.secondary}
                                                            keyboardType="numeric"
                                                        />
                                                        <TouchableOpacity
                                                            onPress={() => removeSet(exerciseIdx, setIdx)}
                                                            style={styles.removeSetButton}
                                                        >
                                                            <Minus size={16} color={Colors.error} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                                <TouchableOpacity
                                                    onPress={() => addSet(exerciseIdx)}
                                                    style={styles.addSetButton}
                                                >
                                                    <Text style={styles.addSetButtonText}>+ Add Set</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={styles.setsDisplayContainer}>
                                                <Text style={styles.restTimeDisplay}>
                                                    Rest: {exercise.rest_time === 0 ? 'Off' : `${exercise.rest_time}s`}
                                                </Text>
                                                {exercise.sets.map((set: any, setIdx: number) => (
                                                    <Text key={setIdx} style={styles.setDisplayText}>
                                                        Set {setIdx + 1}: {set.weight} lbs × {set.reps}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                    {editingExercise !== exerciseIdx && (
                                        <TouchableOpacity
                                            onPress={() => setRoutineExerciseSets(prev => prev.filter((_, i) => i !== exerciseIdx))}
                                            style={styles.removeButton}
                                        >
                                            <Minus size={18} color={Colors.error} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyExercises}>
                                <Text style={styles.emptyExercisesText}>No exercises added yet</Text>
                                <Text style={styles.emptyExercisesSubtext}>Tap "Add" to include exercises in this routine</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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
    keyboardAvoidingView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.background,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
        flex: 1,
        textAlign: 'center',
    },
    headerButton: {
        padding: 8,
    },
    saveButtonText: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 32,
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 12,
    },
    inputContainer: {
        marginBottom: 18,
    },
    inputLabel: {
        fontSize: 14,
        color: Colors.secondary,
        marginBottom: 6,
    },
    input: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: Colors.primary,
        borderWidth: 1,
        borderColor: Colors.divider,
        width: '100%',
    },
    textArea: {
        minHeight: 80,
        paddingTop: 14,
        textAlignVertical: 'top',
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
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
    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.cardBackground,
        borderRadius: 14,
        marginBottom: 14,
        paddingVertical: 18,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    exerciseInfo: {
        flex: 1,
        marginLeft: 10,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 2,
    },
    exerciseCategory: {
        fontSize: 13,
        color: Colors.secondary,
        marginBottom: 2,
    },
    editButton: {
        padding: 8,
    },
    editButtonText: {
        fontSize: 14,
        color: Colors.primary,
    },
    setsEditContainer: {
        marginBottom: 18,
    },
    restTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    restTimeLabel: {
        fontSize: 14,
        color: Colors.secondary,
        marginRight: 8,
    },
    restTimeInputSmall: {
        backgroundColor: Colors.background,
        borderRadius: 6,
        padding: 8,
        fontSize: 14,
        color: Colors.primary,
        borderWidth: 1,
        borderColor: Colors.divider,
        width: 60,
        textAlign: 'center',
        marginRight: 8,
    },
    restTimeUnit: {
        fontSize: 14,
        color: Colors.secondary,
    },
    setEditRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    setLabel: {
        fontSize: 14,
        color: Colors.secondary,
        marginRight: 10,
    },
    setInput: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        color: Colors.primary,
        borderWidth: 1,
        borderColor: Colors.divider,
        width: 80,
        textAlign: 'center',
    },
    setSeparator: {
        fontSize: 16,
        color: Colors.secondary,
        marginHorizontal: 10,
    },
    removeSetButton: {
        padding: 8,
    },
    addSetButton: {
        alignSelf: 'center',
        marginTop: 10,
    },
    addSetButtonText: {
        fontSize: 14,
        color: Colors.primary,
    },
    setsDisplayContainer: {
        marginTop: 10,
    },
    restTimeDisplay: {
        fontSize: 13,
        color: Colors.secondary,
        marginBottom: 5,
        fontStyle: 'italic',
    },
    setDisplayText: {
        fontSize: 13,
        color: Colors.secondary,
        marginBottom: 5,
    },
    removeButton: {
        padding: 8,
        marginLeft: 8,
    },
    emptyExercises: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyExercisesText: {
        fontSize: 15,
        color: Colors.secondary,
        marginBottom: 6,
    },
    emptyExercisesSubtext: {
        fontSize: 13,
        color: Colors.secondary,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    loadingText: {
        marginTop: 10,
        color: Colors.secondary,
        fontSize: 16,
    },
}); 