import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView 
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { Search, X, Info } from 'lucide-react-native';
import { ExerciseInfoModal } from './ExerciseInfoModal';

interface ExerciseSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exerciseId: string) => void;
}

export function ExerciseSearchModal({ 
  visible, 
  onClose, 
  onSelectExercise
}: ExerciseSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'recent' | 'all'>('all');
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<any>(null);
  
  const { exercises, loadExercises, workoutHistory } = useWorkoutStore();

  useEffect(() => {
    if (visible && exercises.length === 0) {
      loadExercises();
    }
  }, [visible, exercises.length, loadExercises]);

  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get recent exercises from workout history
  const recentExerciseIds = new Set();
  const recentExercises = [];
  
  for (const workout of workoutHistory) {
    for (const workoutExercise of workout.exercises) {
      if (!recentExerciseIds.has(workoutExercise.exercise_id)) {
        recentExerciseIds.add(workoutExercise.exercise_id);
        const exercise = exercises.find(e => e.id === workoutExercise.exercise_id);
        if (exercise) {
          recentExercises.push(exercise);
        }
      }
      if (recentExercises.length >= 10) break;
    }
    if (recentExercises.length >= 10) break;
  }

  const displayedExercises = selectedTab === 'recent' 
    ? (searchQuery ? filteredExercises.filter(e => recentExerciseIds.has(e.id)) : recentExercises)
    : filteredExercises;

  const handleSelectExercise = (exerciseId: string) => {
    onSelectExercise(exerciseId);
    setSearchQuery('');
    setSelectedTab('all');
    onClose();
  };

  const handleShowExerciseInfo = (exercise: any) => {
    setSelectedExerciseForInfo(exercise);
    setShowExerciseInfo(true);
  };
  const renderExerciseItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => handleSelectExercise(item.id)}
    >
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseCategory}>{item.category}</Text>
      </View>
      <TouchableOpacity
        style={styles.infoButton}
        onPress={() => handleShowExerciseInfo(item)}
      >
        <Info size={20} color={Colors.accent} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Exercise</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={Colors.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'recent' && styles.activeTab
            ]}
            onPress={() => setSelectedTab('recent')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'recent' && styles.activeTabText
            ]}>
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'all' && styles.activeTab
            ]}
            onPress={() => setSelectedTab('all')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'all' && styles.activeTabText
            ]}>
              All Exercises
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={displayedExercises}
          renderItem={renderExerciseItem}
          keyExtractor={(item) => item.id}
          style={styles.exerciseList}
          contentContainerStyle={styles.exerciseListContent}
          showsVerticalScrollIndicator={false}
        />
        
        <ExerciseInfoModal
          visible={showExerciseInfo}
          onClose={() => {
            setShowExerciseInfo(false);
            setSelectedExerciseForInfo(null);
          }}
          exercise={selectedExerciseForInfo}
        />
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
  headerTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.body,
    color: Colors.primary,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.secondary,
  },
  activeTabText: {
    color: Colors.accent,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListContent: {
    paddingHorizontal: 24,
  },
  exerciseItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginBottom: 4,
  },
  exerciseCategory: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  infoButton: {
    padding: 8,
    marginLeft: 8,
  },
});