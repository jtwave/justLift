import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Dimensions,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { X, Target, Zap, Settings, Dumbbell, FileMusic as Muscle, Edit3, Save, AlertCircle } from 'lucide-react-native';
import { useWorkoutStore } from '@/store/workoutStore';

interface ExerciseInfoModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: any;
}

const { width } = Dimensions.get('window');

export function ExerciseInfoModal({ visible, onClose, exercise }: ExerciseInfoModalProps) {
  if (!exercise) return null;

  const { updateExerciseNotes } = useWorkoutStore();
  const [exerciseNotes, setExerciseNotes] = React.useState(exercise.user_notes || '');
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState<{[key: string]: boolean}>({});
  const [imageError, setImageError] = React.useState<{[key: string]: boolean}>({});

  React.useEffect(() => {
    setExerciseNotes(exercise.user_notes || '');
    setIsEditingNotes(false);
  }, [exercise.user_notes, visible]);

  const handleSaveNotes = async () => {
    try {
      await updateExerciseNotes(exercise.id, exerciseNotes);
      setIsEditingNotes(false);
      Alert.alert('Success', 'Exercise notes saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    }
  };

  const handleImageLoadStart = (imageKey: string) => {
    setImageLoading(prev => ({ ...prev, [imageKey]: true }));
    setImageError(prev => ({ ...prev, [imageKey]: false }));
  };

  const handleImageLoadEnd = (imageKey: string) => {
    setImageLoading(prev => ({ ...prev, [imageKey]: false }));
  };

  const handleImageError = (imageKey: string) => {
    setImageLoading(prev => ({ ...prev, [imageKey]: false }));
    setImageError(prev => ({ ...prev, [imageKey]: true }));
  };

  const renderMuscleList = (muscles: string[] | null, title: string, icon: React.ReactNode) => {
    if (!muscles || muscles.length === 0) return null;
    
    return (
      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.muscleList}>
          {muscles.map((muscle, index) => (
            <View key={index} style={styles.muscleTag}>
              <Text style={styles.muscleText}>{muscle}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderInfoItem = (label: string, value: string | null, icon: React.ReactNode) => {
    if (!value) return null;
    
    return (
      <View style={styles.infoItem}>
        <View style={styles.infoItemHeader}>
          {icon}
          <Text style={styles.infoItemLabel}>{label}</Text>
        </View>
        <Text style={styles.infoItemValue}>{value}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exercise Info</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Exercise Name and Category */}
          <View style={styles.titleSection}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{exercise.category}</Text>
            </View>
          </View>

          {/* Exercise Images */}
          {(exercise.image_url_1 || exercise.image_url_2) && (
            <View style={styles.imagesSection}>
              <Text style={styles.sectionTitle}>Exercise Images</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imagesContainer}
                contentContainerStyle={styles.imagesContent}
              >
                {exercise.image_url_1 && (
                  <View style={styles.imageContainer}>
                    {imageLoading.image1 && (
                      <View style={styles.imageLoadingContainer}>
                        <View style={styles.loadingSpinner}>
                          <Text style={styles.loadingDots}>●●●</Text>
                        </View>
                        <Text style={styles.imageLoadingText}>Loading...</Text>
                      </View>
                    )}
                    {imageError.image1 && (
                      <View style={styles.imageErrorContainer}>
                        <AlertCircle size={32} color={Colors.secondary} />
                        <Text style={styles.imageErrorText}>Image unavailable</Text>
                      </View>
                    )}
                    <Image 
                      source={{ uri: exercise.image_url_1 }} 
                      style={styles.exerciseImage}
                      resizeMode="cover"
                      onLoadStart={() => handleImageLoadStart('image1')}
                      onLoadEnd={() => handleImageLoadEnd('image1')}
                      onError={() => handleImageError('image1')}
                    />
                    <Text style={styles.imageLabel}>Position 1</Text>
                  </View>
                )}
                {exercise.image_url_2 && (
                  <View style={styles.imageContainer}>
                    {imageLoading.image2 && (
                      <View style={styles.imageLoadingContainer}>
                        <View style={styles.loadingSpinner}>
                          <Text style={styles.loadingDots}>●●●</Text>
                        </View>
                        <Text style={styles.imageLoadingText}>Loading...</Text>
                      </View>
                    )}
                    {imageError.image2 && (
                      <View style={styles.imageErrorContainer}>
                        <AlertCircle size={32} color={Colors.secondary} />
                        <Text style={styles.imageErrorText}>Image unavailable</Text>
                      </View>
                    )}
                    <Image 
                      source={{ uri: exercise.image_url_2 }} 
                      style={styles.exerciseImage}
                      resizeMode="cover"
                      onLoadStart={() => handleImageLoadStart('image2')}
                      onLoadEnd={() => handleImageLoadEnd('image2')}
                      onError={() => handleImageError('image2')}
                    />
                    <Text style={styles.imageLabel}>Position 2</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Exercise Details */}
          <View style={styles.detailsSection}>
            {renderInfoItem('Level', exercise.level, <Target size={16} color={Colors.accent} />)}
            {renderInfoItem('Force', exercise.force, <Zap size={16} color={Colors.accent} />)}
            {renderInfoItem('Mechanic', exercise.mechanic, <Settings size={16} color={Colors.accent} />)}
            {renderInfoItem('Equipment', exercise.equipment, <Dumbbell size={16} color={Colors.accent} />)}
          </View>

          {/* Muscle Groups */}
          {renderMuscleList(
            exercise.primaryMuscles, 
            'Primary Muscles', 
            <Muscle size={16} color={Colors.accent} />
          )}
          
          {renderMuscleList(
            exercise.secondaryMuscles, 
            'Secondary Muscles', 
            <Muscle size={16} color={Colors.secondary} />
          )}

          {/* Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <View style={styles.instructionsSection}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <View style={styles.instructionsList}>
                {exercise.instructions.map((instruction: string, index: number) => (
                  <View key={index} style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                      <Text style={styles.instructionNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Exercise Notes */}
          <View style={styles.notesSection}>
            <View style={styles.notesSectionHeader}>
              <Text style={styles.sectionTitle}>Personal Notes</Text>
              {!isEditingNotes ? (
                <TouchableOpacity
                  style={styles.editNotesButton}
                  onPress={() => setIsEditingNotes(true)}
                >
                  <Edit3 size={16} color={Colors.accent} />
                  <Text style={styles.editNotesText}>
                    {exerciseNotes ? 'Edit' : 'Add Notes'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.saveNotesButton}
                  onPress={handleSaveNotes}
                >
                  <Save size={16} color={Colors.accent} />
                  <Text style={styles.saveNotesText}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {isEditingNotes ? (
              <View style={styles.notesInputContainer}>
                <TextInput
                  style={styles.notesInput}
                  value={exerciseNotes}
                  onChangeText={setExerciseNotes}
                  placeholder="Add personal notes about this exercise (form cues, weight progression, etc.)"
                  placeholderTextColor={Colors.secondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={styles.cancelNotesButton}
                  onPress={() => {
                    setExerciseNotes(exercise.user_notes || '');
                    setIsEditingNotes(false);
                  }}
                >
                  <Text style={styles.cancelNotesText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.notesDisplay}>
                {exerciseNotes ? (
                  <Text style={styles.notesText}>{exerciseNotes}</Text>
                ) : (
                  <Text style={styles.noNotesText}>
                    No notes added yet. Tap "Add Notes" to include personal reminders about this exercise.
                  </Text>
                )}
              </View>
            )}
          </View>

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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  exerciseName: {
    fontSize: FontSizes.screenTitle,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  imagesSection: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  imagesContainer: {
    marginTop: 16,
  },
  imagesContent: {
    paddingRight: 24,
  },
  imageContainer: {
    marginRight: 16,
    alignItems: 'center',
    position: 'relative',
  },
  exerciseImage: {
    width: width * 0.6,
    height: width * 0.6 * 0.75, // 4:3 aspect ratio
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    zIndex: 1,
  },
  loadingSpinner: {
    marginBottom: 8,
  },
  loadingDots: {
    fontSize: 20,
    color: Colors.accent,
    letterSpacing: 3,
  },
  imageLoadingText: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  imageErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    zIndex: 1,
  },
  imageErrorText: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 8,
  },
  imageLabel: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 8,
  },
  detailsSection: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoSection: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoItemLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  infoItemValue: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginLeft: 24,
    textTransform: 'capitalize',
  },
  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleTag: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  muscleText: {
    fontSize: FontSizes.caption,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  instructionsSection: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  instructionText: {
    flex: 1,
    fontSize: FontSizes.body,
    color: Colors.primary,
    lineHeight: 22,
  },
  bottomPadding: {
    height: 32,
  },
  notesSection: {
    paddingVertical: 24,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editNotesText: {
    fontSize: FontSizes.body,
    color: Colors.accent,
    fontWeight: FontWeights.medium,
  },
  saveNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveNotesText: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  notesInputContainer: {
    gap: 12,
  },
  notesInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: FontSizes.body,
    color: Colors.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cancelNotesButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelNotesText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
  notesDisplay: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    minHeight: 60,
  },
  notesText: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    lineHeight: 22,
  },
  noNotesText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
});