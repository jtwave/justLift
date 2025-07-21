import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, ActivityIndicator, Switch } from 'react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { useLocalSearchParams, router } from 'expo-router';
import { X, Minus, GripVertical } from 'lucide-react-native';
import { useRoutineStore } from '@/store/routineStore';

export default function SaveRoutineModalScreen() {
    const { workoutId, postId, workoutExercises: workoutExercisesParam } = useLocalSearchParams();
    const { saveWorkoutAsRoutine, exercises, loadExercises } = useWorkoutStore();
    const { loadRoutines } = useRoutineStore();
    const [routineName, setRoutineName] = useState('');
    const [routineDescription, setRoutineDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [routineExerciseSets, setRoutineExerciseSets] = useState<any[]>([]);
    const [editingExercise, setEditingExercise] = useState<number | null>(null);
    const [includeSets, setIncludeSets] = useState(true);
    const [includeWeights, setIncludeWeights] = useState(true);
    const [includeReps, setIncludeReps] = useState(true);

    // Load exercises if they are not already loaded
    useEffect(() => {
        if (!exercises || exercises.length === 0) {
            loadExercises();
        }
    }, []);

    // Parse exercises from params if provided, and update when toggles change
    useEffect(() => {
        if (workoutExercisesParam && exercises && exercises.length > 0) {
            try {
                const workoutExercises = JSON.parse(workoutExercisesParam as string);
                setRoutineExerciseSets(
                    workoutExercises.map((exercise: any, idx: number) => {
                        const realExerciseId = exercise.exercise_id || (exercise.exercise && exercise.exercise.id);
                        const realExercise = exercises.find((ex: any) => ex.id === realExerciseId);
                        let sets = [];
                        if (includeSets) {
                            sets = exercise.sets.map((set: any) => ({
                                weight: includeWeights ? set.weight : '',
                                reps: includeReps ? set.reps : ''
                            }));
                        }
                        return {
                            exerciseId: realExercise?.id || realExerciseId,
                            name: realExercise?.name || exercise.exercise?.name || exercise.name,
                            category: realExercise?.category || exercise.exercise?.category || exercise.category,
                            ...realExercise,
                            sets
                        };
                    })
                );
            } catch (e) {
                setRoutineExerciseSets([]);
            }
        }
    }, [workoutExercisesParam, exercises, includeSets, includeWeights, includeReps]);

    const handleSaveAsRoutine = async () => {
        if (!routineName.trim()) {
            Alert.alert('Error', 'Please enter a routine name');
            return;
        }
        setSaving(true);
        try {
            await saveWorkoutAsRoutine(
                workoutId as string,
                routineName.trim(),
                routineDescription.trim() || undefined,
                routineExerciseSets.map(ex => ({
                    exercise_id: ex.exerciseId,
                    sets: ex.sets.map((set: any) => ({
                        weight: Number(set.weight) || 0,
                        reps: Number(set.reps) || 0
                    }))
                }))
            );
            await loadRoutines();
            Alert.alert('Success', 'Workout saved as routine!');
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to save routine');
        } finally {
            setSaving(false);
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

    const toggleEditExercise = (exerciseIdx: number) => {
        setEditingExercise(editingExercise === exerciseIdx ? null : exerciseIdx);
    };

    const addSet = (exerciseIdx: number) => {
        setRoutineExerciseSets(prev => prev.map((ex, i) =>
            i === exerciseIdx
                ? {
                    ...ex,
                    sets: [...ex.sets, { weight: '', reps: '' }]
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

    // In the component's return, add a loading spinner if data is not ready
    if (!workoutExercisesParam || !exercises || exercises.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={{ color: Colors.primary, marginTop: 16 }}>Loading routine...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.saveRoutineModalContainer}>
            {/* Header */}
            <View style={styles.saveRoutineHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.saveRoutineHeaderButton}>
                    <X size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.saveRoutineHeaderTitle}>Save as Routine</Text>
                <TouchableOpacity
                    onPress={handleSaveAsRoutine}
                    disabled={saving || !routineName.trim() || routineExerciseSets.length === 0}
                    style={[styles.saveRoutineHeaderButton, (!routineName.trim() || routineExerciseSets.length === 0) && { opacity: 0.5 }]}
                >
                    <Text style={[styles.startWorkoutButtonText, (!routineName.trim() || routineExerciseSets.length === 0) && { color: Colors.secondary }]}>Save</Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.saveRoutineContent} showsVerticalScrollIndicator={false}>
                {/* Routine Details */}
                <View style={styles.saveRoutineSection}>
                    <Text style={styles.saveRoutineSectionTitle}>Routine Details</Text>
                    <View style={styles.saveRoutineInputContainer}>
                        <Text style={styles.saveRoutineInputLabel}>Name *</Text>
                        <TextInput
                            style={styles.saveRoutineInput}
                            value={routineName}
                            onChangeText={setRoutineName}
                            placeholder="e.g., Push Day, Upper Body"
                            placeholderTextColor={Colors.secondary}
                        />
                    </View>
                    <View style={styles.saveRoutineInputContainer}>
                        <Text style={styles.saveRoutineInputLabel}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.saveRoutineInput, styles.saveRoutineTextArea]}
                            value={routineDescription}
                            onChangeText={setRoutineDescription}
                            placeholder="Brief description of this routine..."
                            placeholderTextColor={Colors.secondary}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>
                {/* Divider */}
                <View style={{ height: 1, backgroundColor: Colors.divider, marginVertical: 12 }} />
                {/* Import Options */}
                <View style={styles.importOptionsSection}>
                    <Text style={styles.importOptionsTitle}>Import Options</Text>
                    <View style={styles.importOptionRow}>
                        <Text style={styles.importOptionLabel}>Include sets</Text>
                        <Switch
                            value={includeSets}
                            onValueChange={(value) => {
                                setIncludeSets(value);
                            }}
                        />
                    </View>
                    <View style={styles.importOptionRow}>
                        <Text style={[styles.importOptionLabel, !includeSets && { color: Colors.secondary }]}>Include weights</Text>
                        <Switch
                            value={includeWeights}
                            onValueChange={(value) => {
                                setIncludeWeights(value);
                            }}
                            disabled={!includeSets}
                        />
                    </View>
                    <View style={styles.importOptionRow}>
                        <Text style={[styles.importOptionLabel, !includeSets && { color: Colors.secondary }]}>Include reps</Text>
                        <Switch
                            value={includeReps}
                            onValueChange={(value) => {
                                setIncludeReps(value);
                            }}
                            disabled={!includeSets}
                        />
                    </View>
                </View>
                {/* Exercises */}
                <View style={styles.saveRoutineSection}>
                    <Text style={styles.saveRoutineSectionTitle}>Exercises</Text>
                    {routineExerciseSets.length > 0 ? (
                        routineExerciseSets.map((exercise, exerciseIdx) => (
                            <View key={exercise.exerciseId} style={styles.saveRoutineExerciseCard}>
                                <GripVertical size={18} color={Colors.secondary} />
                                <View style={[styles.saveRoutineExerciseInfo, { flex: 1 }]}>
                                    <View style={styles.exerciseHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.saveRoutineExerciseName}>{exercise.name}</Text>
                                            <Text style={styles.saveRoutineExerciseCategory}>{exercise.category || ''}</Text>
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
                                            {exercise.sets.map((set: any, setIdx: number) => (
                                                <Text key={setIdx} style={styles.setDisplayText}>
                                                    Set {setIdx + 1}: {set.weight} lbs × {set.reps}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={() => setRoutineExerciseSets(prev => prev.filter((_, i) => i !== exerciseIdx))}
                                    style={styles.saveRoutineRemoveButton}
                                >
                                    <Minus size={18} color={Colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <View style={styles.saveRoutineEmptyExercises}>
                            <Text style={styles.saveRoutineEmptyExercisesText}>No exercises added yet</Text>
                            <Text style={styles.saveRoutineEmptyExercisesSubtext}>This routine will be empty</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    saveRoutineModalContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: 0,
    },
    saveRoutineHeader: {
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
    saveRoutineHeaderTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
        flex: 1,
        textAlign: 'center',
    },
    saveRoutineHeaderButton: {
        padding: 8,
    },
    saveRoutineContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 32,
    },
    saveRoutineSection: {
        marginBottom: 28,
    },
    saveRoutineSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 12,
    },
    saveRoutineInputContainer: {
        marginBottom: 18,
    },
    saveRoutineInputLabel: {
        fontSize: 14,
        color: Colors.secondary,
        marginBottom: 6,
    },
    saveRoutineInput: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: Colors.primary,
        borderWidth: 1,
        borderColor: Colors.divider,
        width: '100%',
    },
    saveRoutineTextArea: {
        minHeight: 80,
        paddingTop: 14,
        textAlignVertical: 'top',
    },
    saveRoutineExerciseCard: {
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
    saveRoutineExerciseInfo: {
        flex: 1,
        marginLeft: 10,
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
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
    setDisplayText: {
        fontSize: 13,
        color: Colors.secondary,
        marginBottom: 5,
    },
    saveRoutineExerciseName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 2,
    },
    saveRoutineExerciseCategory: {
        fontSize: 13,
        color: Colors.secondary,
        marginBottom: 2,
    },
    saveRoutineExerciseConfigSummary: {
        fontSize: 13,
        color: Colors.secondary,
        marginTop: 2,
    },
    saveRoutineRemoveButton: {
        padding: 8,
        marginLeft: 8,
    },
    saveRoutineEmptyExercises: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    saveRoutineEmptyExercisesText: {
        fontSize: 15,
        color: Colors.secondary,
        marginBottom: 6,
    },
    saveRoutineEmptyExercisesSubtext: {
        fontSize: 13,
        color: Colors.secondary,
    },
    startWorkoutButtonText: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
    },
    importOptionsSection: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.divider,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    importOptionsTitle: {
        fontSize: 16,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
        marginBottom: 12,
    },
    importOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingVertical: 4,
    },
    importOptionLabel: {
        fontSize: 15,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
    },
}); 