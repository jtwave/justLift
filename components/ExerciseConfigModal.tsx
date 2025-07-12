import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';

export function ExerciseConfigModal({ visible, exercise, onSave, onClose }: any) {
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [weight, setWeight] = useState('');
    const [restTime, setRestTime] = useState('');

    useEffect(() => {
        if (exercise) {
            setSets(exercise.sets ? String(exercise.sets) : '3');
            setReps(exercise.reps ? String(exercise.reps) : '10');
            setWeight(exercise.weight ? String(exercise.weight) : '100');
            setRestTime(exercise.rest_time ? String(exercise.rest_time) : '90');
        }
    }, [exercise]);

    const handleSave = () => {
        onSave({
            ...exercise,
            sets: Number(sets),
            reps: Number(reps),
            weight: Number(weight),
            rest_time: Number(restTime),
        });
    };

    if (!exercise) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.title}>Configure Exercise</Text>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Sets</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={sets}
                            onChangeText={setSets}
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Reps</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={reps}
                            onChangeText={setReps}
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Weight (lbs)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={weight}
                            onChangeText={setWeight}
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Rest (sec)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={restTime}
                            onChangeText={setRestTime}
                        />
                    </View>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 400,
    },
    title: {
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
        marginBottom: 8,
        textAlign: 'center',
    },
    exerciseName: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        marginBottom: 16,
        textAlign: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        flex: 1,
        fontSize: FontSizes.body,
        color: Colors.primary,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: Colors.primary,
        fontSize: FontSizes.body,
        textAlign: 'right',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 24,
        gap: 12,
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: Colors.cardBackground,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.divider,
    },
    cancelButtonText: {
        color: Colors.secondary,
        fontSize: FontSizes.body,
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: Colors.accent,
        borderRadius: 8,
    },
    saveButtonText: {
        color: Colors.accentContrast,
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
    },
}); 