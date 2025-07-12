import React, { useState, useRef, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  findNodeHandle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { X, Target, Zap, Settings, Dumbbell, FileMusic as Muscle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
// Add import for ImageViewer
import ImageViewer from 'react-native-image-zoom-viewer';

// Interface for the component's props
interface ExerciseInfoModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: any; // For better type safety, consider defining a specific type for 'exercise'
}

const { width } = Dimensions.get('window');

export function ExerciseInfoModal({ visible, onClose, exercise }: ExerciseInfoModalProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loadingNote, setLoadingNote] = useState(true); // Separate loading state for the note fetch
  const [savingNote, setSavingNote] = useState(false); // Separate loading state for saving
  const [message, setMessage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);
  // New state for enlarged image modal
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  // New state for initial index in zoom viewer
  const [enlargedImageIndex, setEnlargedImageIndex] = useState<number>(0);

  // Fetch note when the modal becomes visible or the exercise changes
  useEffect(() => {
    if (!visible || !exercise?.id || !user?.id) {
      // Reset state when modal is not visible or required data is missing
      setNote('');
      setNoteId(null);
      setEditing(false);
      setMessage(null);
      setLoadingNote(true); // Set to true so it shows a loader next time
      return;
    }

    const fetchNote = async () => {
      setLoadingNote(true);
      setMessage(null);
      setEditing(false);

      try {
        const { data, error } = await supabase
          .from('exercise_notes')
          .select('id, notes')
          .eq('user_id', user.id)
          .eq('exercise_id', exercise.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row not found"
          throw error;
        }

        if (data) {
          setNote(data.notes || '');
          setNoteId(data.id);
        } else {
          setNote('');
          setNoteId(null);
        }
      } catch (error) {
        setMessage('Could not fetch note.');
        console.error("Error fetching note:", error);
      } finally {
        setLoadingNote(false);
      }
    };

    fetchNote();
  }, [exercise?.id, user?.id, visible]);

  // Save or update the note
  const handleSaveNote = async () => {
    if (!user?.id || !exercise?.id) return;

    setSavingNote(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('exercise_notes')
        .upsert({
          user_id: user.id,
          exercise_id: exercise.id,
          notes: note,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,exercise_id' });

      if (error) throw error;

      setMessage('Note saved!');
      setEditing(false);
    } catch (error) {
      setMessage('Failed to save note.');
      console.error("Error saving note:", error);
    } finally {
      setSavingNote(false);
    }
  };

  // Helper function to render a list of muscles
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

  // Helper function to render a single info item
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

  // Helper to scroll to the notes input
  const scrollToNotesInput = () => {
    // Simple approach: scroll to end with a small delay
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // When entering edit mode, focus and scroll to the input
  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        noteInputRef.current?.focus();
        scrollToNotesInput();
      }, 200); // slightly longer delay to ensure layout is ready
    }
  }, [editing]);

  // Do not render the modal if there's no exercise data.
  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom', 'left', 'right']}>
        {/* Header always at the very top, with insets */}
        <View style={[styles.header, { paddingTop: insets.top, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: Colors.background }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <X size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{exercise.name || 'Exercise Info'}</Text>
          <View style={styles.placeholder} />
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top + 56 }} // Add header height offset
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            style={[{ backgroundColor: Colors.background, paddingHorizontal: 24 }]}
            contentContainerStyle={{ paddingBottom: 50, backgroundColor: Colors.background, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
                >
                  {exercise.image_url_1 && (
                    <View style={styles.imageContainer}>
                      <TouchableOpacity onPress={() => {
                        setEnlargedImageUrl(exercise.image_url_1);
                        setEnlargedImageIndex(0);
                      }} activeOpacity={0.85}>
                        <Image
                          source={{ uri: exercise.image_url_1 }}
                          style={styles.exerciseImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <Text style={styles.imageLabel}>Position 1</Text>
                    </View>
                  )}
                  {exercise.image_url_2 && (
                    <View style={styles.imageContainer}>
                      <TouchableOpacity onPress={() => {
                        setEnlargedImageUrl(exercise.image_url_2);
                        setEnlargedImageIndex(exercise.image_url_1 ? 1 : 0);
                      }} activeOpacity={0.85}>
                        <Image
                          source={{ uri: exercise.image_url_2 }}
                          style={styles.exerciseImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
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
            {renderMuscleList(exercise.primaryMuscles, 'Primary Muscles', <Muscle size={16} color={Colors.accent} />)}
            {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 &&
              renderMuscleList(exercise.secondaryMuscles, 'Secondary Muscles', <Muscle size={16} color={Colors.secondary} />)
            }

            {/* Instructions */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <View style={styles.instructionsSection}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                <View style={styles.instructionsList}>
                  {exercise.instructions.map((instruction: string, index: number) => (
                    <View key={index} style={styles.instructionItem}>
                      <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>{index + 1}</Text></View>
                      <Text style={styles.instructionText}>{instruction}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Editable Notes Section */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Your Notes</Text>
              {loadingNote ? (
                <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
              ) : editing || !noteId ? (
                <>
                  <TextInput
                    ref={noteInputRef}
                    style={styles.notesInput}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Add your notes for this exercise..."
                    placeholderTextColor={Colors.secondary}
                    multiline
                    editable={!savingNote}
                    onFocus={scrollToNotesInput}
                  />
                  <TouchableOpacity
                    style={[styles.saveNotesButton, savingNote && { opacity: 0.6 }]}
                    onPress={handleSaveNote}
                    disabled={savingNote}
                  >
                    <Text style={styles.saveNotesButtonText}>{savingNote ? 'Saving...' : 'Save Note'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.savedNoteText}>{note}</Text>
                  <TouchableOpacity
                    style={styles.editNoteButton}
                    onPress={() => setEditing(true)}
                  >
                    <Text style={styles.editNoteButtonText}>Edit Note</Text>
                  </TouchableOpacity>
                </>
              )}
              {message && <Text style={styles.notesMessage}>{message}</Text>}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {/* Enlarged Image Modal */}
      <Modal visible={!!enlargedImageUrl} transparent animationType="fade" onRequestClose={() => setEnlargedImageUrl(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          {/* Close button at the top */}
          <TouchableOpacity style={{ position: 'absolute', top: insets.top + 8, right: 32, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }} onPress={() => setEnlargedImageUrl(null)}>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', lineHeight: 36 }}>×</Text>
          </TouchableOpacity>
          {/* Pinch and swipe viewer */}
          {enlargedImageUrl && (
            <ImageViewer
              imageUrls={[
                ...(exercise.image_url_1 ? [{ url: exercise.image_url_1 }] : []),
                ...(exercise.image_url_2 ? [{ url: exercise.image_url_2 }] : []),
              ]}
              index={enlargedImageIndex}
              enableSwipeDown={true}
              onSwipeDown={() => setEnlargedImageUrl(null)}
              onCancel={() => setEnlargedImageUrl(null)}
              backgroundColor="rgba(0,0,0,0)"
              renderIndicator={(currentIndex, allSize) => (
                <Text style={{ color: '#fff', position: 'absolute', top: insets.top + 16, left: 24, fontSize: 16 }}>{currentIndex} / {allSize}</Text>
              )}
              saveToLocalByLongPress={false}
              renderHeader={() => null}
              renderFooter={() => null}
            />
          )}
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginHorizontal: 8,
  },
  placeholder: {
    width: 40, // to balance the close button
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
  imageContainer: {
    marginRight: 16,
    alignItems: 'center',
  },
  exerciseImage: {
    width: width * 0.6,
    height: width * 0.6 * 0.75, // 4:3 aspect ratio
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
  },
  imageLabel: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 8,
  },
  detailsSection: {
    paddingVertical: 16,
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
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  notesSection: {
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: 16,
  },
  notesInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 8,
    padding: 12,
    fontSize: FontSizes.body,
    color: Colors.primary,
    backgroundColor: Colors.cardBackground,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  saveNotesButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveNotesButtonText: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.body,
  },
  notesMessage: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  savedNoteText: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    marginBottom: 12,
    lineHeight: 22,
  },
  editNoteButton: {
    backgroundColor: Colors.cardBackground,
    borderColor: Colors.divider,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editNoteButtonText: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.body,
  },
  bottomPadding: {
    height: 48,
  },
});
