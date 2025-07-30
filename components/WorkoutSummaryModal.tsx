import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Platform,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { useSocialStore } from '@/store/socialStore';
import { useProgressStore } from '@/store/progressStore';
import { X, Share2, Camera, Save, Award, ChevronRight, Image as ImageIcon, Video } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

interface WorkoutSummaryModalProps {
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  workout: any;
}

export function WorkoutSummaryModal({ visible, onSave, onDiscard, workout }: WorkoutSummaryModalProps) {
  const [showSaveRoutine, setShowSaveRoutine] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [routineDescription, setRoutineDescription] = useState('');
  const [routineExerciseSets, setRoutineExerciseSets] = useState<any[]>([]);

  // When opening the Save as Routine modal, initialize sets for editing
  React.useEffect(() => {
    if (showSaveRoutine && workout?.exercises) {
      setRoutineExerciseSets(
        workout.exercises.map((exercise: any) => ({
          exerciseId: exercise.exercise_id,
          name: exercise.exercise.name,
          sets: exercise.sets.map((set: any) => ({
            weight: set.weight,
            reps: set.reps
          }))
        }))
      );
    }
  }, [showSaveRoutine, workout?.exercises]);

  // Save workout form state
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null);
  const [visibility, setVisibility] = useState<'everyone' | 'friends' | 'private'>('everyone');
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  const { saveWorkoutAsRoutine } = useWorkoutStore();
  const { updateWorkoutDetails, discardWorkout, loadCurrentWorkout } = useWorkoutStore();
  const { createWorkoutPost, createWorkoutPostWithMedia, loadWorkoutPost, deleteWorkoutPost } = useSocialStore();
  const { addProgressPhoto } = useProgressStore();

  // Update workout title when workout data changes
  React.useEffect(() => {
    if (workout?.name) {
      setWorkoutTitle(workout.name);
    }
  }, [workout?.name]);

  // Don't render if no workout data
  if (!workout) {
    return null;
  }

  const duration = workout.end_time
    ? Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / (1000 * 60))
    : 0;

  const totalSets = workout.exercises.reduce((total: number, exercise: any) =>
    total + exercise.sets.filter((set: any) => set.completed).length, 0);

  const totalVolume = workout.exercises.reduce((total: number, exercise: any) =>
    total + exercise.sets.reduce((setTotal: number, set: any) =>
      setTotal + (set.completed ? Number(set.weight) * set.reps : 0), 0), 0);

  const prCount = workout.exercises.reduce((total: number, exercise: any) =>
    total + exercise.sets.filter((set: any) => set.is_pr).length, 0);

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

  const handleSaveAsRoutine = async () => {
    if (!routineName.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }
    try {
      // Pass sets/weights for each exercise to the routine creation logic
      await saveWorkoutAsRoutine(
        workout.id,
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
      setShowSaveRoutine(false);
      setRoutineName('');
      setRoutineDescription('');
      Alert.alert('Success', 'Routine saved with sets/weights!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save routine');
    }
  };

  const handleAddMedia = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Media not available', 'Camera and media functionality is not available on web. Please use the mobile app.');
      return;
    }

    Alert.alert(
      'Add Media',
      'Choose how you want to add media to your workout',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handleSelectFromLibrary },
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0].uri);
        setMediaType('photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleTakeVideo = async () => {
    // Video functionality temporarily disabled
    Alert.alert('Not Available', 'Video recording is temporarily disabled. Please use photos instead.');
  };

  // Utility to ensure we always have a local file URI for uploads
  async function getLocalUri(assetUri: string): Promise<string> {
    if (assetUri.startsWith('file://')) {
      return assetUri;
    }
    // For iOS ph:// URIs, copy to cache
    const fileName = assetUri.split('/').pop() || `photo_${Date.now()}.jpg`;
    const localUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.copyAsync({ from: assetUri, to: localUri });
    return localUri;
  }

  const handleSelectFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = await getLocalUri(result.assets[0].uri);
        setSelectedMedia(localUri);
        setMediaType('photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select media');
    }
  };

  // Helper to upload workout photo to Supabase Storage
  async function uploadWorkoutPhoto(uri: string, userId: string): Promise<string | null> {
    try {
      const ext = uri.split('.').pop() || 'jpg';
      const path = `workouts/${userId}_${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = decode(base64);
      const { data, error } = await supabase.storage
        .from('profile-photos') // or 'workout-photos' if you create a separate bucket
        .upload(path, fileBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        });
      if (error) {
        console.error('Upload error:', error);
        return null;
      }
      const { data: publicUrlData } = supabase.storage.from('profile-photos').getPublicUrl(path);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Failed to upload workout photo:', err);
      return null;
    }
  }

  const handleSaveWorkout = async () => {
    try {
      // Update workout details first
      if (workout.id && workoutTitle.trim()) {
        await updateWorkoutDetails(workout.id, workoutTitle.trim(), workoutDescription.trim() || undefined);
      }

      let uploadedMediaUrl = selectedMedia;
      // If selectedMedia is a local file and is a photo, upload it
      if (selectedMedia && mediaType === 'photo' && selectedMedia.startsWith('file://')) {
        // You may want to get the current user ID here
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !currentUser) {
          Alert.alert('Error', 'User not authenticated');
          return;
        }
        uploadedMediaUrl = await uploadWorkoutPhoto(selectedMedia, currentUser.id);
      }

      // Save the media as progress photo if it's a photo
      if (uploadedMediaUrl && mediaType === 'photo') {
        await addProgressPhoto(uploadedMediaUrl, workoutDescription);
      }

      // Create or delete workout post based on visibility setting
      if (workout.id && visibility !== 'private') {
        const isPublic = visibility === 'everyone';
        await createWorkoutPostWithMedia(
          workout.id,
          workoutDescription,
          uploadedMediaUrl || undefined,
          mediaType || undefined,
          isPublic
        );
      } else if (visibility === 'private') {
        // If a post exists for this workout, delete it
        const existingPost = await loadWorkoutPost(workout.id);
        if (existingPost) {
          await deleteWorkoutPost(existingPost.id);
        }
      }

      // Force refresh of current workout state
      setTimeout(() => {
        loadCurrentWorkout();
      }, 100);

      // Call the parent's onSave which will handle finishing the workout
      onSave();
    } catch (error) {
      Alert.alert('Error', `Failed to save workout: ${(error as Error).message}`);
    }
  };

  const handleDiscardWorkout = () => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to discard this workout? This action cannot be undone.')) {
        handleDiscardAction();
      }
    } else {
      Alert.alert(
        'Discard Workout',
        'Are you sure you want to discard this workout? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: handleDiscardAction
          }
        ]
      );
    }
  };

  const handleDiscardAction = async () => {
    try {
      if (workout.id) {
        await discardWorkout(workout.id);
      }
      onDiscard();
    } catch (error) {
      Alert.alert('Error', 'Failed to discard workout');
    }
  };

  const handleShare = async () => {
    const prText = prCount > 0 ? `\n🏆 ${prCount} Personal Record${prCount > 1 ? 's' : ''}!` : '';

    const shareText = `💪 Workout Complete!

📅 ${workoutTitle}
⏱️ Duration: ${duration} minutes
🏋️ ${workout.exercises.length} exercises, ${totalSets} sets
📊 Total Volume: ${Math.round(totalVolume).toLocaleString()} lbs${prText}

#Lift #WorkoutComplete #StrengthTraining`;

    try {
      await Share.share({
        message: shareText,
        title: 'Workout Complete!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getVisibilityText = (vis: 'everyone' | 'friends' | 'private') => {
    switch (vis) {
      case 'everyone':
        return 'Everyone';
      case 'friends':
        return 'Friends';
      case 'private':
        return 'Private';
      default:
        return 'Everyone';
    }
  };

  const getVisibilityDescription = (vis: 'everyone' | 'friends' | 'private') => {
    switch (vis) {
      case 'everyone':
        return 'Visible to all users';
      case 'friends':
        return 'Visible to your friends only';
      case 'private':
        return 'Only visible to you';
      default:
        return 'Visible to all users';
    }
  };

  // Visibility Selection Modal
  if (showVisibilityModal) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowVisibilityModal(false)} style={styles.closeButton}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Choose Visibility</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content}>
            {(['everyone', 'friends', 'private'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.visibilityOption,
                  visibility === option && styles.visibilityOptionSelected
                ]}
                onPress={() => {
                  setVisibility(option);
                  setShowVisibilityModal(false);
                }}
              >
                <View style={styles.visibilityOptionContent}>
                  <Text style={[
                    styles.visibilityOptionTitle,
                    visibility === option && styles.visibilityOptionTitleSelected
                  ]}>
                    {getVisibilityText(option)}
                  </Text>
                  <Text style={[
                    styles.visibilityOptionDescription,
                    visibility === option && styles.visibilityOptionDescriptionSelected
                  ]}>
                    {getVisibilityDescription(option)}
                  </Text>
                </View>
                {visibility === option && (
                  <View style={styles.visibilityCheckmark}>
                    <Text style={styles.visibilityCheckmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  if (showSaveRoutine) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowSaveRoutine(false)} style={styles.closeButton}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Save as Routine</Text>
            <TouchableOpacity onPress={handleSaveAsRoutine} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Routine Name *</Text>
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
                value={routineDescription}
                onChangeText={setRoutineDescription}
                placeholder="Brief description of this routine..."
                placeholderTextColor={Colors.secondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.exercisePreview}>
              <Text style={styles.previewTitle}>Exercises & Sets:</Text>
              {routineExerciseSets.map((exercise, exerciseIdx) => (
                <View key={exercise.exerciseId} style={{ marginBottom: 16 }}>
                  <Text style={styles.previewExercise}>{exercise.name}</Text>
                  {exercise.sets.map((set: any, setIdx: number) => (
                    <View key={setIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ color: Colors.secondary }}>Set {setIdx + 1}:</Text>
                      <TextInput
                        style={[styles.input, { width: 60, paddingVertical: 4, textAlign: 'center' }]}
                        value={String(set.weight)}
                        onChangeText={val => handleSetChange(exerciseIdx, setIdx, 'weight', val)}
                        placeholder="Weight"
                        keyboardType="numeric"
                        placeholderTextColor={Colors.secondary}
                      />
                      <Text style={{ color: Colors.secondary }}>lbs ×</Text>
                      <TextInput
                        style={[styles.input, { width: 40, paddingVertical: 4, textAlign: 'center' }]}
                        value={String(set.reps)}
                        onChangeText={val => handleSetChange(exerciseIdx, setIdx, 'reps', val)}
                        placeholder="Reps"
                        keyboardType="numeric"
                        placeholderTextColor={Colors.secondary}
                      />
                      <Text style={{ color: Colors.secondary }}>reps</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? "pageSheet" : "fullScreen"}
      onRequestClose={onDiscard}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onDiscard} style={styles.closeButton}>
            <X size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Save Workout</Text>
          <TouchableOpacity onPress={handleSaveWorkout} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Workout Title */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Workout title</Text>
            <TextInput
              style={styles.titleInput}
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
              placeholder="Enter workout title"
              placeholderTextColor={Colors.secondary}
            />
          </View>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{duration}min</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Volume</Text>
              <Text style={styles.statValue}>{Math.round(totalVolume)} lbs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Sets</Text>
              <Text style={styles.statValue}>{totalSets}</Text>
            </View>
          </View>

          {/* Date/Time */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>When</Text>
            <Text style={styles.dateText}>{formatDate(workout.start_time)}</Text>
          </View>

          {/* Media Upload */}
          <TouchableOpacity style={styles.mediaSection} onPress={handleAddMedia}>
            <View style={styles.mediaContainer}>
              {selectedMedia ? (
                <View style={styles.selectedMediaContainer}>
                  {mediaType === 'photo' ? (
                    <Image source={{ uri: selectedMedia }} style={styles.selectedMedia} />
                  ) : (
                    <Image source={{ uri: selectedMedia }} style={styles.selectedMedia} />
                  )}
                </View>
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <ImageIcon size={32} color={Colors.secondary} />
                </View>
              )}
              <Text style={styles.mediaText}>Add a photo</Text>
            </View>
          </TouchableOpacity>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              value={workoutDescription}
              onChangeText={setWorkoutDescription}
              placeholder="How did your workout go? Leave some notes here..."
              placeholderTextColor={Colors.secondary}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Visibility */}
          <TouchableOpacity style={styles.visibilitySection} onPress={() => setShowVisibilityModal(true)}>
            <Text style={styles.sectionLabel}>Visibility</Text>
            <View style={styles.visibilityRow}>
              <View style={styles.visibilityInfo}>
                <Text style={styles.visibilityValue}>
                  {getVisibilityText(visibility)}
                </Text>
                <Text style={styles.visibilityDescription}>
                  {getVisibilityDescription(visibility)}
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.secondary} />
            </View>
          </TouchableOpacity>

          {/* PR Badge */}
          {prCount > 0 && (
            <View style={styles.prSection}>
              <Award size={20} color={Colors.warning} />
              <Text style={styles.prText}>
                {prCount} Personal Record{prCount > 1 ? 's' : ''} achieved!
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowSaveRoutine(true)}
            >
              <Save size={20} color={Colors.accent} />
              <Text style={styles.actionButtonText}>Save as Routine</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Share2 size={20} color={Colors.accent} />
              <Text style={styles.actionButtonText}>Share Workout</Text>
            </TouchableOpacity>
          </View>

          {/* Discard Button */}
          <TouchableOpacity style={styles.discardButton} onPress={handleDiscardWorkout}>
            <Text style={styles.discardButtonText}>Discard Workout</Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: FontSizes.screenTitle,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    paddingVertical: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.accent,
  },
  dateText: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.medium,
    color: Colors.accent,
  },
  mediaSection: {
    marginTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mediaPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedMediaContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedMedia: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
    marginTop: 4,
  },
  mediaText: {
    fontSize: FontSizes.sectionHeader,
    color: Colors.primary,
    flex: 1,
  },
  descriptionInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: FontSizes.body,
    color: Colors.primary,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  visibilitySection: {
    marginTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  visibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  visibilityInfo: {
    flex: 1,
  },
  visibilityValue: {
    fontSize: FontSizes.sectionHeader,
    color: Colors.primary,
  },
  visibilityDescription: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 2,
  },
  visibilityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.cardBackground,
  },
  visibilityOptionSelected: {
    backgroundColor: Colors.accent,
  },
  visibilityOptionContent: {
    flex: 1,
  },
  visibilityOptionTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  visibilityOptionTitleSelected: {
    color: Colors.primary,
  },
  visibilityOptionDescription: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 2,
  },
  visibilityOptionDescriptionSelected: {
    color: Colors.primary,
  },
  visibilityCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityCheckmarkText: {
    color: Colors.accent,
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.bold,
  },
  prSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  prText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  actionButtons: {
    marginTop: 32,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  actionButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  discardButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  discardButtonText: {
    fontSize: FontSizes.body,
    color: Colors.error,
    fontWeight: FontWeights.medium,
  },
  bottomPadding: {
    height: 100,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: FontSizes.body,
    color: Colors.primary,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  exercisePreview: {
    marginTop: 24,
  },
  previewTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginBottom: 12,
  },
  previewExercise: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 4,
  },
});