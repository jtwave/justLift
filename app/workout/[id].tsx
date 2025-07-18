import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProgressStore } from '@/store/progressStore';
import { useSocialStore } from '@/store/socialStore';
import { useAuth } from '@/hooks/useAuth';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Clock, Target, Award, TrendingUp, Camera, MoveHorizontal as MoreHorizontal, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workoutHistory, loadWorkoutHistory } = useWorkoutStore();
  const { loadWorkoutPost, deleteWorkoutPost } = useSocialStore();
  const { user } = useAuth();
  const [workout, setWorkout] = useState<any>(null);
  const [workoutPost, setWorkoutPost] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const { saveWorkoutAsRoutine } = useWorkoutStore();
  const [showSaveRoutine, setShowSaveRoutine] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [routineDescription, setRoutineDescription] = useState('');

  useEffect(() => {
    if (workoutHistory.length === 0) {
      loadWorkoutHistory();
    }
  }, [workoutHistory.length, loadWorkoutHistory]);

  useEffect(() => {
    if (id && workoutHistory.length > 0) {
      const foundWorkout = workoutHistory.find(w => w.id === id);
      setWorkout(foundWorkout);

      // Load workout post to get associated media
      if (foundWorkout) {
        loadWorkoutPostForWorkout(foundWorkout.id);
      }
    }
  }, [id, workoutHistory]);

  const loadWorkoutPostForWorkout = async (workoutId: string) => {
    try {
      const post = await loadWorkoutPost(workoutId);
      setWorkoutPost(post);
    } catch (error) {
      console.error('Error loading workout post:', error);
    }
  };

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
    );
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleDeletePost = async () => {
    if (!workoutPost) return;

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this workout post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkoutPost(workoutPost.id);
              setWorkoutPost(null);
              setShowOptions(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteWorkout = async () => {
    if (!workout) {
      console.log('No workout to delete');
      return;
    }

    console.log('Attempting to delete workout:', workout.id);

    Alert.alert(
      'Delete Entire Workout',
      'Are you sure you want to delete this entire workout? This will remove all workout data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('User confirmed deletion, deleting workout post first...');
              // Delete the workout post first if it exists
              if (workoutPost) {
                await deleteWorkoutPost(workoutPost.id);
                console.log('Workout post deleted');
              }

              console.log('Deleting workout from database...');
              // Then delete the workout itself
              const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', workout.id);

              if (error) {
                console.error('Database error:', error);
                throw error;
              }

              console.log('Workout deleted successfully');

              // Navigate back to the workouts list
              router.replace('/profile/workouts');
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', `Failed to delete workout: ${(error as Error).message}`);
            }
          }
        }
      ]
    );
  };

  const handleSaveAsRoutine = async () => {
    if (!routineName.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }
    try {
      await saveWorkoutAsRoutine(workout.id, routineName.trim(), routineDescription.trim() || undefined);
      setShowSaveRoutine(false);
      setRoutineName('');
      setRoutineDescription('');
      Alert.alert('Success', 'Workout saved as routine!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save routine');
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Details</Text>
        <View style={styles.headerActions}>
          {user?.id === workout?.user_id && (
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => setShowOptions(!showOptions)}
            >
              <MoreHorizontal size={24} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Options Menu */}
      {showOptions && user?.id === workout?.user_id && (
        <View style={styles.optionsMenu}>
          {workoutPost && (
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptions(false);
                handleDeletePost();
              }}
            >
              <Trash2 size={16} color={Colors.error} />
              <Text style={styles.optionText}>Delete Post</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              setShowOptions(false);
              handleDeleteWorkout();
            }}
          >
            <Trash2 size={16} color={Colors.error} />
            <Text style={styles.optionText}>Delete Entire Workout</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT }}>
        {/* Workout Info */}
        <View style={styles.section}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          {workout.description && (
            <Text style={styles.workoutDescription}>{workout.description}</Text>
          )}
          <Text style={styles.workoutDate}>{formatDate(workout.start_time)}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Clock size={20} color={Colors.accent} />
              <Text style={styles.statValue}>{duration}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statCard}>
              <Target size={20} color={Colors.accent} />
              <Text style={styles.statValue}>{totalSets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={20} color={Colors.accent} />
              <Text style={styles.statValue}>{Math.round(totalVolume / 1000)}K</Text>
              <Text style={styles.statLabel}>Volume (lbs)</Text>
            </View>
          </View>

          {prCount > 0 && (
            <View style={styles.prSection}>
              <Award size={20} color={Colors.warning} />
              <Text style={styles.prText}>
                {prCount} Personal Record{prCount > 1 ? 's' : ''} achieved!
              </Text>
            </View>
          )}
        </View>

        {/* Workout Media */}
        {workoutPost?.media_url && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {workoutPost.media_type === 'video' ? 'Workout Video' : 'Workout Photo'}
            </Text>
            <View style={styles.mediaContainer}>
              <TouchableOpacity onPress={() => {
                console.log('Image pressed', workoutPost.media_url);
                setShowImageModal(true);
                setModalImageUrl(workoutPost.media_url);
              }} activeOpacity={0.85}>
                <Image source={{ uri: workoutPost.media_url }} style={styles.workoutMedia} />
              </TouchableOpacity>
              {workoutPost.caption && (
                <Text style={styles.mediaCaption}>{workoutPost.caption}</Text>
              )}
            </View>
          </View>
        )}

        {/* Exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {workout.exercises.map((exercise: any, index: number) => {
            const completedSets = exercise.sets.filter((set: any) => set.completed);
            const maxWeight = completedSets.length > 0
              ? Math.max(...completedSets.map((set: any) => Number(set.weight)))
              : 0;

            return (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
                  <Text style={styles.exerciseCategory}>{exercise.exercise.category}</Text>
                </View>

                <View style={styles.exerciseStats}>
                  <Text style={styles.exerciseStatText}>
                    {completedSets.length} sets • Max: {maxWeight} lbs
                  </Text>
                </View>

                {/* Sets */}
                <View style={styles.setsContainer}>
                  {completedSets.map((set: any, setIndex: number) => (
                    <View key={set.id} style={styles.setRow}>
                      <Text style={styles.setNumber}>Set {set.set_number}</Text>
                      <Text style={styles.setData}>
                        {set.weight} lbs × {set.reps}
                      </Text>
                      {set.is_pr && (
                        <View style={styles.prBadge}>
                          <Award size={12} color={Colors.warning} />
                          <Text style={styles.prBadgeText}>PR</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: Colors.accent,
            borderRadius: 8,
            padding: 12,
            margin: 16,
            alignItems: 'center',
          }}
          onPress={() => setShowSaveRoutine(true)}
        >
          <Text style={{ color: Colors.primary, fontWeight: 'bold', fontSize: 16 }}>
            Save as Routine
          </Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Save as Routine Modal */}
      <Modal visible={showSaveRoutine} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: Colors.primary, marginBottom: 16 }}>Save as Routine</Text>
            <Text style={{ color: Colors.secondary, marginBottom: 8 }}>Routine Name *</Text>
            <View style={{ backgroundColor: Colors.cardBackground, borderRadius: 8, marginBottom: 16 }}>
              <TextInput
                style={{ color: Colors.primary, fontSize: 18, padding: 12 }}
                value={routineName}
                onChangeText={setRoutineName}
                placeholder="e.g., Push Day, Upper Body"
                placeholderTextColor={Colors.secondary}
              />
            </View>
            <Text style={{ color: Colors.secondary, marginBottom: 8 }}>Description (Optional)</Text>
            <View style={{ backgroundColor: Colors.cardBackground, borderRadius: 8, marginBottom: 24 }}>
              <TextInput
                style={{ color: Colors.primary, fontSize: 16, padding: 12, minHeight: 60 }}
                value={routineDescription}
                onChangeText={setRoutineDescription}
                placeholder="Brief description of this routine..."
                placeholderTextColor={Colors.secondary}
                multiline
                numberOfLines={3}
              />
            </View>
            <TouchableOpacity
              style={{ backgroundColor: Colors.accent, borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 }}
              onPress={handleSaveAsRoutine}
            >
              <Text style={{ color: Colors.primary, fontWeight: 'bold', fontSize: 16 }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: 'center', padding: 10 }}
              onPress={() => setShowSaveRoutine(false)}
            >
              <Text style={{ color: Colors.secondary, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Enlarged Image Modal */}
      <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setShowImageModal(false)}>
            <Text style={styles.imageModalCloseText}>×</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageModalContent} activeOpacity={1} onPress={() => setShowImageModal(false)}>
            {modalImageUrl && (
              <Image source={{ uri: modalImageUrl }} style={styles.imageModalImage} resizeMode="contain" />
            )}
          </TouchableOpacity>
        </View>
      </Modal>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholder: {
    width: 24,
  },
  optionsButton: {
    padding: 8,
  },
  optionsMenu: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    minWidth: 150,
  },
  optionText: {
    fontSize: FontSizes.body,
    color: Colors.error,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  workoutName: {
    fontSize: FontSizes.screenTitle,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  workoutDate: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statCard: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  prSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginTop: 16,
  },
  prText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  photoContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  mediaContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  workoutMedia: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  mediaCaption: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 2,
  },
  exerciseCategory: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  exerciseStats: {
    marginBottom: 12,
  },
  exerciseStatText: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  setNumber: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    flex: 1,
  },
  setData: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    flex: 2,
    textAlign: 'center',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  prBadgeText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'flex-start', // Start from top
    alignItems: 'center',
    paddingTop: 32, // Add padding to push content below status bar
  },
  imageModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  imageModalImage: {
    width: '90%',
    height: '80%',
    borderRadius: 16,
  },
  imageModalClose: {
    position: 'absolute',
    top: 8, // Move higher up
    right: 32,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
  },
});