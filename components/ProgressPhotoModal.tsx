import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Scale, FileImage } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';

interface ProgressPhotoModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (weight: number, notes: string) => void;
    photoUri: string;
}

export function ProgressPhotoModal({ visible, onClose, onSave, photoUri }: ProgressPhotoModalProps) {
    const [weight, setWeight] = useState('');
    const [notes, setNotes] = useState('');

    const handleSave = () => {
        const weightValue = parseFloat(weight);

        if (isNaN(weightValue) || weightValue <= 0) {
            Alert.alert('Invalid Weight', 'Please enter a valid weight greater than 0');
            return;
        }

        onSave(weightValue, notes.trim());
        handleClose();
    };

    const handleClose = () => {
        setWeight('');
        setNotes('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="overFullScreen"
            onRequestClose={handleClose}
            transparent={true}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={handleClose}
            >
                <TouchableOpacity
                    style={styles.container}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                >
                    <SafeAreaView style={styles.modalContent}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.keyboardView}
                        >
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                                    <X size={24} color={Colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>Add Progress Photo</Text>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Content */}
                            <View style={styles.content}>
                                {/* Photo Preview */}
                                <View style={styles.photoSection}>
                                    <View style={styles.photoContainer}>
                                        <Image source={{ uri: photoUri }} style={styles.photo} />
                                    </View>
                                    <View style={styles.photoInfo}>
                                        <View style={styles.photoInfoRow}>
                                            <FileImage size={16} color={Colors.accent} />
                                            <Text style={styles.photoInfoText}>This photo will be saved to your body progress photos</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Weight Input */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>Current Weight *</Text>
                                    <View style={styles.weightInputContainer}>
                                        <Scale size={20} color={Colors.accent} />
                                        <TextInput
                                            style={styles.weightInput}
                                            value={weight}
                                            onChangeText={setWeight}
                                            placeholder="0"
                                            placeholderTextColor={Colors.secondary}
                                            keyboardType="decimal-pad"
                                            returnKeyType="next"
                                        />
                                        <Text style={styles.weightUnit}>lbs</Text>
                                    </View>
                                </View>

                                {/* Notes Input */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>Notes (Optional)</Text>
                                    <TextInput
                                        style={styles.notesInput}
                                        value={notes}
                                        onChangeText={setNotes}
                                        placeholder="How are you feeling? Any notes about your progress..."
                                        placeholderTextColor={Colors.secondary}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        returnKeyType="done"
                                    />
                                </View>

                                {/* Info */}
                                <View style={styles.infoSection}>
                                    <Text style={styles.infoText}>
                                        Weight is required for progress tracking. This helps you monitor your body composition changes over time.
                                    </Text>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </SafeAreaView>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.background || '#000000',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalContent: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
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
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
    },
    saveButton: {
        backgroundColor: Colors.accent,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    saveButtonText: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    photoSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    photoContainer: {
        width: 200,
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoInfo: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 8,
        padding: 12,
        maxWidth: 280,
    },
    photoInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    photoInfoText: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        marginLeft: 8,
        textAlign: 'center',
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
        marginBottom: 8,
    },
    weightInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    weightInput: {
        flex: 1,
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
        marginLeft: 12,
        textAlign: 'center',
    },
    weightUnit: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        fontWeight: FontWeights.medium,
    },
    notesInput: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        padding: 16,
        fontSize: FontSizes.body,
        color: Colors.primary,
        minHeight: 100,
    },
    infoSection: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },
    infoText: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        textAlign: 'center',
        lineHeight: 18,
    },
});