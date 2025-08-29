import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Modal, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProgressStore } from '@/store/progressStore';
import { ArrowLeft, X, Edit3, Check, Calendar, Scale, FileText } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { supabase } from '@/lib/supabase';
import { PinchGestureHandler, PanGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedGestureHandler,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function ComparePhotosScreen() {
    const router = useRouter();
    const { photos } = useLocalSearchParams();
    const { progressPhotos, loadProgressPhotos } = useProgressStore();

    // Full screen viewer state
    const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
    const [showFullScreen, setShowFullScreen] = useState(false);
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

    // Parse photo IDs from query param
    const photoIds = useMemo(() => {
        if (!photos) return [];
        if (Array.isArray(photos)) return photos;
        return photos.split(',');
    }, [photos]);

    const selectedPhotos = progressPhotos.filter(p => photoIds.includes(p.id));



    // Handle photo tap to show full screen
    const handlePhotoTap = (photo: any) => {
        setSelectedPhoto(photo);
        setNoteText(photo.notes || '');
        setShowFullScreen(true);
        setEditingNotes(false);
        resetZoom();
    };

    // Pinch gesture handler
    const pinchHandler = useAnimatedGestureHandler({
        onStart: (_, context: any) => {
            context.startScale = scale.value;
        },
        onActive: (event: any, context: any) => {
            scale.value = Math.max(1, Math.min(3, context.startScale * event.scale));
        },
        onEnd: () => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            }
        },
    });

    // Pan gesture handler
    const panHandler = useAnimatedGestureHandler({
        onStart: (_, context: any) => {
            context.startX = translateX.value;
            context.startY = translateY.value;
        },
        onActive: (event: any, context: any) => {
            if (scale.value > 1) {
                translateX.value = context.startX + event.translationX;
                translateY.value = context.startY + event.translationY;
            }
        },
    });

    // Double tap handler
    const doubleTapHandler = (event: any) => {
        'worklet';
        if (event.nativeEvent.state === State.ACTIVE) {
            if (scale.value > 1.2) {
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            } else {
                scale.value = withSpring(2);
            }
        }
    };

    // Animated style
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
        setNoteText(selectedPhoto?.notes || '');

        // Focus the text input after a brief delay
        setTimeout(() => {
            textInputRef.current?.focus();
        }, 150);
    };

    // Handle save notes
    const handleSaveNotes = async () => {
        if (!selectedPhoto) return;

        try {
            const { error } = await supabase
                .from('progress_photos')
                .update({ notes: noteText.trim() || null })
                .eq('id', selectedPhoto.id);

            if (error) throw error;

            // Update local state
            await loadProgressPhotos();

            // Update selected photo with new notes
            setSelectedPhoto((prev: any) => ({ ...prev, notes: noteText.trim() }));
            setEditingNotes(false);

            Alert.alert('Success', 'Notes updated successfully!');
        } catch (error) {
            console.error('Error updating notes:', error);
            Alert.alert('Error', 'Failed to update notes');
        }
    };

    // Handle close full screen
    const handleCloseFullScreen = () => {
        setShowFullScreen(false);
        setSelectedPhoto(null);
        setEditingNotes(false);
        setNoteText('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Compare Photos</Text>
                <View style={{ width: 32 }} />
            </View>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.compareRow}>
                    {selectedPhotos.map((photo) => (
                        <TouchableOpacity
                            key={photo.id}
                            style={styles.photoCol}
                            onPress={() => handlePhotoTap(photo)}
                            activeOpacity={0.8}
                        >
                            <Image source={{ uri: photo.photo_url }} style={styles.photo} />
                            <View style={styles.photoInfo}>
                                <View style={styles.photoInfoRow}>
                                    <Calendar size={14} color={Colors.secondary} />
                                    <Text style={styles.photoDate}>
                                        {new Date(photo.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                {photo.weight && (
                                    <View style={styles.photoInfoRow}>
                                        <Scale size={14} color={Colors.accent} />
                                        <Text style={styles.photoWeight}>{photo.weight} lbs</Text>
                                    </View>
                                )}
                                {photo.notes && (
                                    <View style={styles.photoInfoRow}>
                                        <FileText size={14} color={Colors.secondary} />
                                        <Text style={styles.photoNotes} numberOfLines={2}>
                                            {photo.notes}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Full Screen Photo Modal */}
            <Modal
                visible={showFullScreen}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={handleCloseFullScreen}
                statusBarTranslucent={false}
            >
                <SafeAreaView style={styles.fullScreenContainer}>
                    <View style={styles.fullScreenContent}>
                        {/* Header */}
                        <View style={styles.fullScreenHeader}>
                            <TouchableOpacity onPress={handleCloseFullScreen} style={styles.closeButton}>
                                <X size={24} color={Colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.fullScreenTitle}>Progress Photo</Text>
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

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.fullScreenBody}
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
                                <View style={styles.fullScreenImageContainer}>
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
                                                                source={{ uri: selectedPhoto?.photo_url }}
                                                                style={styles.fullScreenImage}
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
                                            {selectedPhoto && new Date(selectedPhoto.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>

                                    {selectedPhoto?.weight && (
                                        <View style={styles.detailRow}>
                                            <Scale size={20} color={Colors.accent} />
                                            <Text style={styles.detailLabel}>Weight:</Text>
                                            <Text style={styles.detailValue}>{selectedPhoto.weight} lbs</Text>
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
                                            {selectedPhoto?.notes || 'No notes added yet. Tap the edit icon to add notes.'}
                                        </Text>
                                    )}
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const PHOTO_WIDTH = (width - 72) / 2;

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
    content: {
        flex: 1,
    },
    compareRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        marginTop: 32,
        paddingHorizontal: 16,
        paddingBottom: 50,
        gap: 0,
    },
    photoCol: {
        flex: 1,
        marginHorizontal: 8,
        backgroundColor: Colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    photo: {
        width: '95%',
        aspectRatio: 3 / 4,
        borderRadius: 12,
        marginBottom: 12,
        maxWidth: 200,
    },
    photoInfo: {
        width: '100%',
        gap: 6,
    },
    photoInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    photoDate: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        flex: 1,
    },
    photoWeight: {
        fontSize: FontSizes.body,
        color: Colors.accent,
        fontWeight: FontWeights.bold,
        flex: 1,
    },
    photoNotes: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        flex: 1,
        lineHeight: 16,
    },
    tapHint: {
        fontSize: FontSizes.caption,
        color: Colors.accent,
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
    // Full Screen Modal Styles
    fullScreenContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    fullScreenContent: {
        flex: 1,
    },
    fullScreenHeader: {
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
    fullScreenTitle: {
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
    },
    editButton: {
        padding: 8,
        backgroundColor: Colors.background,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.divider,
    },
    fullScreenBody: {
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
        height: 450,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImageContainer: {
        height: 450,
        backgroundColor: Colors.background,
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: 20,
        marginVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: width - 40,
        height: 450,
        borderRadius: 12,
    },
    photoDetails: {
        backgroundColor: Colors.cardBackground,
        margin: 24,
        borderRadius: 16,
        padding: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    detailLabel: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.secondary,
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
}); 