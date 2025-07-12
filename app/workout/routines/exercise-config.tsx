import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, X } from 'lucide-react-native';

// Smart time input helpers
function formatSmartTime(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (!digits) return '';
    const padded = digits.padStart(3, '0');
    const min = parseInt(padded.slice(0, -2), 10).toString();
    const sec = padded.slice(-2);
    return `${min}:${sec}`;
}
function parseSmartTime(raw: string) {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return 0;
    const padded = digits.padStart(3, '0');
    let min = parseInt(padded.slice(0, -2), 10);
    let sec = parseInt(padded.slice(-2), 10);
    if (sec >= 60) {
        min += Math.floor(sec / 60);
        sec = sec % 60;
    }
    return min * 60 + sec;
}

export default function ExerciseConfigScreen() {
    const { exerciseId, exerciseData } = useLocalSearchParams<{ exerciseId: string; exerciseData: string }>();
    const { exercises, loadExercises } = useWorkoutStore();
    const [config, setConfig] = useState<any>(null);
    const [sets, setSets] = useState<any[]>([]); // Array of set objects
    const [restTime, setRestTime] = useState('90');
    // For each set, keep a rawTimeInput for smart typing if needed
    const [rawTimeInputs, setRawTimeInputs] = useState<string[]>([]);

    useEffect(() => {
        if (exercises.length === 0) {
            loadExercises();
        }
    }, [exercises.length, loadExercises]);

    useEffect(() => {
        if (exerciseId && exerciseData) {
            const parsedData = JSON.parse(exerciseData);
            setConfig(parsedData);
            setRestTime(parsedData.rest_time ? String(parsedData.rest_time) : '90');
            // Initialize sets array from config or default
            if (parsedData.sets && Array.isArray(parsedData.sets)) {
                setSets(parsedData.sets);
            } else {
                // Default: one set with sensible defaults
                setSets([{ weight: 100, reps: 10, duration: 60, distance: 0 }]);
            }
        }
    }, [exerciseId, exerciseData]);

    // When sets change, ensure rawTimeInputs stays in sync
    useEffect(() => {
        setRawTimeInputs(prev => {
            if (sets.length === prev.length) return prev;
            // Add new rawTimeInputs for new sets, default to previous or blank
            return sets.map((set, i) => prev[i] || (set.duration ? String(set.duration) : ''));
        });
    }, [sets.length]);

    // Find the exercise only after exercises are loaded
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <Text style={{ color: '#fff', fontSize: 18 }}>Loading exercise...</Text>
            </SafeAreaView>
        );
    }

    const handleSetChange = (index: number, field: string, value: string) => {
        setSets(prev => prev.map((set, i) => i === index ? { ...set, [field]: value } : set));
    };
    const handleRemoveSet = (index: number) => {
        setSets(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
    };
    const handleAddSet = () => {
        setSets(prev => {
            const last = prev[prev.length - 1] || {};
            // Prefill with previous set's values
            return [...prev, { ...last }];
        });
    };
    const handleSetTimeInput = (index: number, text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, 4);
        setRawTimeInputs(prev => prev.map((v, i) => i === index ? digits : v));
        // Update set.duration in seconds
        setSets(prev => prev.map((set, i) => i === index ? { ...set, duration: parseSmartTime(digits) } : set));
    };
    const handleSetTimeKeyPress = (index: number, { nativeEvent }: { nativeEvent: { key: string } }) => {
        if (nativeEvent.key === 'Backspace') {
            setRawTimeInputs(prev => prev.map((v, i) => i === index ? v.slice(0, -1) : v));
        }
    };

    const handleSave = () => {
        const updatedConfig = {
            ...config,
            sets: sets.map(set => ({
                ...set,
                weight: set.weight ? Number(set.weight) : undefined,
                reps: set.reps ? Number(set.reps) : undefined,
                duration: set.duration ? Number(set.duration) : undefined,
                distance: set.distance ? Number(set.distance) : undefined,
            })),
            rest_time: Number(restTime),
        };
        if (typeof window !== 'undefined') {
            window.__updatedExerciseConfig = { exerciseId, updatedConfig };
        }
        router.back();
    };

    // Render per-set row based on exercise type
    const renderSetRow = (set: any, i: number) => {
        switch (exercise.tracking_type) {
            case 'time_only':
                return (
                    <View key={i} style={styles.setRow}>
                        <Text style={styles.setNumber}>{i + 1}</Text>
                        <TextInput
                            style={styles.input}
                            value={formatSmartTime(rawTimeInputs[i] || (set.duration ? String(set.duration) : ''))}
                            onChangeText={v => handleSetTimeInput(i, v)}
                            onKeyPress={e => handleSetTimeKeyPress(i, e)}
                            keyboardType="number-pad"
                            placeholder="0:00"
                        />
                        <Text style={styles.unit}>min:sec</Text>
                        <TouchableOpacity onPress={() => handleRemoveSet(i)} style={styles.removeButton}>
                            <X size={20} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                );
            case 'cardio':
            case 'distance_time':
                return (
                    <View key={i} style={styles.setRow}>
                        <Text style={styles.setNumber}>{i + 1}</Text>
                        <TextInput
                            style={styles.input}
                            value={set.distance ? String(set.distance) : ''}
                            onChangeText={v => handleSetChange(i, 'distance', v)}
                            keyboardType="numeric"
                            placeholder="mi"
                        />
                        <TextInput
                            style={styles.input}
                            value={formatSmartTime(rawTimeInputs[i] || (set.duration ? String(set.duration) : ''))}
                            onChangeText={v => handleSetTimeInput(i, v)}
                            onKeyPress={e => handleSetTimeKeyPress(i, e)}
                            keyboardType="number-pad"
                            placeholder="0:00"
                        />
                        <Text style={styles.unit}>min:sec</Text>
                        <TouchableOpacity onPress={() => handleRemoveSet(i)} style={styles.removeButton}>
                            <X size={20} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                );
            case 'bodyweight_reps':
                return (
                    <View key={i} style={styles.setRow}>
                        <Text style={styles.setNumber}>{i + 1}</Text>
                        <TextInput
                            style={styles.input}
                            value={set.reps ? String(set.reps) : ''}
                            onChangeText={v => handleSetChange(i, 'reps', v)}
                            keyboardType="numeric"
                            placeholder="reps"
                        />
                        <TouchableOpacity onPress={() => handleRemoveSet(i)} style={styles.removeButton}>
                            <X size={20} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                );
            default: // weight_reps
                return (
                    <View key={i} style={styles.setRow}>
                        <Text style={styles.setNumber}>{i + 1}</Text>
                        {exercise.tracking_type === 'weight_reps' && (
                            <TextInput
                                style={styles.input}
                                value={set.weight ? String(set.weight) : ''}
                                onChangeText={v => handleSetChange(i, 'weight', v)}
                                keyboardType="numeric"
                                placeholder="lbs"
                            />
                        )}
                        <TextInput
                            style={styles.input}
                            value={set.reps ? String(set.reps) : ''}
                            onChangeText={v => handleSetChange(i, 'reps', v)}
                            keyboardType="numeric"
                            placeholder="reps"
                        />
                        <TouchableOpacity onPress={() => handleRemoveSet(i)} style={styles.removeButton}>
                            <X size={20} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                );
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Configure Exercise</Text>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Save size={24} color={Colors.accent} />
                    </TouchableOpacity>
                </View>
                <View style={styles.content}>
                    <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <Text style={styles.exerciseCategory}>{exercise.category}</Text>
                    </View>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sets</Text>
                        {sets.map((set, i) => renderSetRow(set, i))}
                        <TouchableOpacity style={styles.addSetButton} onPress={handleAddSet}>
                            <Text style={styles.addSetButtonText}>+ Add Set</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Rest Time</Text>
                        <View style={styles.inputRow}>
                            <Text style={styles.label}>Rest (seconds)</Text>
                            <TextInput
                                style={styles.input}
                                value={restTime}
                                onChangeText={setRestTime}
                                keyboardType="numeric"
                                placeholder="90"
                                placeholderTextColor={Colors.secondary}
                            />
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
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
    saveButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    exerciseHeader: {
        marginBottom: 24,
    },
    exerciseName: {
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
        marginBottom: 4,
    },
    exerciseCategory: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: FontSizes.body,
        color: Colors.primary,
        flex: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    adjustButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.cardBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        fontSize: FontSizes.input,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
        backgroundColor: Colors.cardBackground,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        textAlign: 'center',
        minWidth: 80,
    },
    inputs: {
        flexDirection: 'row',
        gap: 16,
    },
    inputGroup: {
        flex: 1,
        alignItems: 'center',
    },
    inputLabel: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        marginBottom: 8,
    },
    unit: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        marginTop: 4,
    },
    timerContainer: {
        alignItems: 'center',
    },
    timerDisplay: {
        fontSize: 48,
        fontWeight: FontWeights.bold,
        color: Colors.accent,
        marginBottom: 12,
    },
    timeInputContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    timeInput: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
        backgroundColor: Colors.cardBackground,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        textAlign: 'center',
        minWidth: 100,
        marginVertical: 4,
    },
    timerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timerButton: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 44,
        alignItems: 'center',
    },
    playButton: {
        backgroundColor: Colors.accent,
        width: 44,
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    setNumber: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
        marginRight: 16,
    },
    removeButton: {
        padding: 8,
    },
    removeButtonText: {
        fontSize: 20,
    },
    addSetButton: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        marginTop: 16,
    },
    addSetButtonText: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
    },
}); 