import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProgressStore } from '@/store/progressStore';
import { X, Edit3, Check, Calendar, Scale, FileText, Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedGestureHandler, withSpring } from 'react-native-reanimated';
import { TapGestureHandler, PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

export default function SingleProgressPhotoScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { progressPhotos, loadProgressPhotos, deleteProgressPhoto } = useProgressStore();

    const [photo, setPhoto] = useState<any>(null);
    const [editingNotes, setEditingNotes] = useState(false);
    const [noteText, setNoteText] = useState('');

    // Refs
    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);

    // Zoom state
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // Reset zoom when photo changes
    const resetZoom = () => {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
    };

    // Load the specific photo
    useEffect(() => {
        loadProgressPhotos();
    }, []);

    useEffect(() => {
        if (progressPhotos.length > 0 && id) {
            const foundPhoto = progressPhotos.find(p => p.id === id);
            if (foundPhoto) {
                setPhoto(foundPhoto);
                setNoteText(foundPhoto.notes || '');
                resetZoom();
            }
        }
    }, [progressPhotos, id]);

    // Pinch gesture handler
    const pinchHandler = useAnimatedGestureHandler({
        onStart: (_, context: any) => {
            context.startScale = scale.value;
        },
        onActive: (event: any, context: any) => {
            const newScale = Math.max(1, Math.min(3, context.startScale * event.scale));
            scale.value = newScale;

            // Constrain translation based on new scale
            if (newScale <= 1) {
                // If zoomed out to 1x or less, center the image
                translateX.value = 0;
                translateY.value = 0;
            } else {
                // Calculate new boundaries and constrain translation
                const imageWidth = (width - 40) * newScale;
                const imageHeight = 450 * newScale;
                const containerWidth = width - 40;
                const containerHeight = 450;

                const maxTranslateX = Math.max(0, (imageWidth - containerWidth) / 2);
                const maxTranslateY = Math.max(0, (imageHeight - containerHeight) / 2);

                // Constrain current translation to new boundaries
                translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
                translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));
            }
        },
        onEnd: () => {
            if (scale.value <= 1) {
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            }
        },
    });

    // Pan gesture handler (enabled when zoomed in)
    const panHandler = useAnimatedGestureHandler({
        onStart: (_, context: any) => {
            context.startX = translateX.value;
            context.startY = translateY.value;
        },
        onActive: (event: any, context: any) => {
            // Only allow panning when zoomed in
            if (scale.value > 1) {
                // Calculate boundaries based on scale
                const imageWidth = (width - 40) * scale.value;
                const imageHeight = 450 * scale.value;
                const containerWidth = width - 40;
                const containerHeight = 450;

                const maxTranslateX = (imageWidth - containerWidth) / 2;
                const maxTranslateY = (imageHeight - containerHeight) / 2;

                // Constrain translation to image boundaries
                translateX.value = Math.max(
                    -maxTranslateX,
                    Math.min(maxTranslateX, context.startX + event.translationX)
                );
                translateY.value = Math.max(
                    -maxTranslateY,
                    Math.min(maxTranslateY, context.startY + event.translationY)
                );
            }
        },
    });

    // Double tap handler
    const doubleTapHandler = (event: any) => {
        if (event.nativeEvent.state === State.ACTIVE) {
            if (scale.value > 1.2) {
                // Zoom out to 1x and center
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            } else {
                // Zoom in to 2x and center
                scale.value = withSpring(2);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            }
        }
    };

    // Animated style for image transformations
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
            ],
        };
    });

    // Handle note editing
    const handleEditNotes = () => {
        setEditingNotes(true);
        setNoteText(photo?.notes || '');

        // Focus the text input after a brief delay
        setTimeout(() => {
            textInputRef.current?.focus();
        }, 150);
    };

    // Handle save notes
    const handleSaveNotes = async () => {
        if (!photo) return;

        try {
            const { error } = await supabase
                .from('progress_photos')
                .update({ notes: noteText })
                .eq('id', photo.id);

            if (error) throw error;

            // Update local state
            setPhoto({ ...photo, notes: noteText });
            setEditingNotes(false);

            Alert.alert('Success', 'Notes updated successfully!');
        } catch (error) {
            console.error('Error updating notes:', error);
            Alert.alert('Error', 'Failed to update notes');
        }
    };

    // Handle delete photo
    const handleDeletePhoto = () => {
        if (!photo) return;

        Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete this progress photo? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteProgressPhoto(photo.id);
                            Alert.alert('Success', 'Photo deleted successfully!');
                            router.back(); // Navigate back after deletion
                        } catch (error) {
                            console.error('Error deleting photo:', error);
                            Alert.alert('Error', 'Failed to delete photo');
                        }
                    },
                },
            ]
        );
    };

    if (!photo) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <X size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Progress Photo</Text>
                    <View style={{ width: 32 }} />
                </View>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Photo not found</Text>
                    <Text style={styles.emptyStateSubtext}>
                        The requested photo could not be loaded.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <X size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Progress Photo</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={handleDeletePhoto}
                        style={styles.deleteButton}
                    >
                        <Trash2 size={20} color={Colors.error} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={editingNotes ? handleSaveNotes : handleEditNotes}
                        style={styles.editButton}
                    >
                        {editingNotes ? (
                            <Check size={24} color={Colors.accent} />
                        ) : (
                            <Edit3 size={24} color={Colors.accent} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.body}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.mainScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    automaticallyAdjustKeyboardInsets={true}
                >
                    {/* Photo */}
                    <View style={styles.imageContainer}>
                        <TapGestureHandler
                            numberOfTaps={2}
                            onHandlerStateChange={doubleTapHandler}
                        >
                            <Animated.View style={styles.gestureContainer}>
                                <PinchGestureHandler onGestureEvent={pinchHandler}>
                                    <Animated.View style={styles.gestureContainer}>
                                        <PanGestureHandler onGestureEvent={panHandler}>
                                            <Animated.View style={[styles.gestureContainer, animatedStyle]}>
                                                <Animated.Image
                                                    source={{ uri: photo.photo_url }}
                                                    style={styles.image}
                                                    resizeMode="contain"
                                                />
                                            </Animated.View>
                                        </PanGestureHandler>
                                    </Animated.View>
                                </PinchGestureHandler>
                            </Animated.View>
                        </TapGestureHandler>
                    </View>

                    {/* Photo Details */}
                    <View style={styles.photoDetails}>
                        <View style={styles.detailRow}>
                            <Calendar size={20} color={Colors.accent} />
                            <Text style={styles.detailLabel}>Date:</Text>
                            <Text style={styles.detailValue}>
                                {new Date(photo.created_at).toLocaleDateString()}
                            </Text>
                        </View>

                        {photo.weight && (
                            <View style={styles.detailRow}>
                                <Scale size={20} color={Colors.accent} />
                                <Text style={styles.detailLabel}>Weight:</Text>
                                <Text style={styles.detailValue}>{photo.weight} lbs</Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <FileText size={20} color={Colors.accent} />
                            <Text style={styles.detailLabel}>Notes:</Text>
                        </View>

                        {editingNotes ? (
                            <TextInput
                                ref={textInputRef}
                                style={styles.notesInput}
                                value={noteText}
                                onChangeText={setNoteText}
                                onFocus={() => {
                                    // Scroll to show the text input when keyboard appears
                                    setTimeout(() => {
                                        if (scrollViewRef.current) {
                                            scrollViewRef.current.scrollTo({
                                                y: 400, // Scroll to specific position instead of end
                                                animated: true
                                            });
                                        }
                                    }, 10);
                                }}
                                placeholder="Add notes about your progress..."
                                placeholderTextColor={Colors.secondary}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                blurOnSubmit={false}
                                returnKeyType="done"
                            />
                        ) : (
                            <Text style={styles.notesText}>
                                {photo.notes || 'No notes added yet. Tap the edit icon to add notes.'}
                            </Text>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: Colors.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    closeButton: {
        padding: 8,
        backgroundColor: Colors.background,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.divider,
    },
    headerTitle: {
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deleteButton: {
        padding: 8,
        backgroundColor: Colors.background,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.error,
    },
    editButton: {
        padding: 8,
        backgroundColor: Colors.background,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.accent,
    },
    body: {
        flex: 1,
    },
    mainScroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    gestureContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        width: width - 40,
        height: 450,
        backgroundColor: Colors.background,
        borderRadius: 20,
        overflow: 'hidden',
        marginHorizontal: 20,
        marginVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: width - 40,
        height: 450,
        borderRadius: 20,
    },
    photoDetails: {
        backgroundColor: Colors.cardBackground,
        margin: 24,
        borderRadius: 16,
        padding: 20,
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailLabel: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        fontWeight: FontWeights.medium,
        minWidth: 60,
    },
    detailValue: {
        fontSize: FontSizes.body,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
        flex: 1,
    },
    notesInput: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.accent,
        padding: 16,
        fontSize: FontSizes.body,
        color: Colors.primary,
        minHeight: 120,
        textAlignVertical: 'top',
        marginTop: 8,
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    notesText: {
        fontSize: FontSizes.body,
        color: Colors.primary,
        lineHeight: 20,
        marginTop: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyStateText: {
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        textAlign: 'center',
    },
});