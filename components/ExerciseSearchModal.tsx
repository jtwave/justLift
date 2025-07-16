import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { Search, X, Info, ChevronDown, Filter } from 'lucide-react-native';
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
  const [forceFilters, setForceFilters] = useState<string[]>([]);
  const [muscleFilters, setMuscleFilters] = useState<string[]>([]);
  const [equipmentFilters, setEquipmentFilters] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { exercises, loadExercises, workoutHistory } = useWorkoutStore();

  useEffect(() => {
    if (visible && exercises.length === 0) {
      loadExercises();
    }
  }, [visible, exercises.length, loadExercises]);

  useEffect(() => {
    console.log('showFilterModal changed to:', showFilterModal);
  }, [showFilterModal]);

  // Extract unique filter values from exercises
  const forceOptions = React.useMemo(() => {
    const set = new Set<string>();
    exercises.forEach(ex => {
      if (ex.force) set.add(ex.force);
    });
    return Array.from(set).sort();
  }, [exercises]);

  const muscleOptions = React.useMemo(() => {
    const set = new Set<string>();
    exercises.forEach(ex => {
      if (Array.isArray(ex.primaryMuscles)) {
        ex.primaryMuscles.forEach((m: string) => set.add(m));
      }
    });
    return Array.from(set).sort();
  }, [exercises]);

  const equipmentOptions = React.useMemo(() => {
    const set = new Set<string>();
    exercises.forEach(ex => {
      if (ex.equipment) set.add(ex.equipment);
    });
    return Array.from(set).sort();
  }, [exercises]);

  // Filtering logic
  const filteredExercises = exercises.filter(exercise => {
    const matchesQuery =
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.category.toLowerCase().includes(searchQuery.toLowerCase());
    // Multi-select force filter logic
    const matchesForce = forceFilters.length > 0
      ? forceFilters.includes(exercise.force)
      : true;
    // Multi-select muscle filter logic
    const matchesMuscle = muscleFilters.length > 0
      ? Array.isArray(exercise.primaryMuscles) && muscleFilters.some(m => exercise.primaryMuscles.includes(m))
      : true;
    // Multi-select equipment filter logic
    const matchesEquipment = equipmentFilters.length > 0
      ? equipmentFilters.includes(exercise.equipment)
      : true;
    return matchesQuery && matchesForce && matchesMuscle && matchesEquipment;
  });

  // Get recent exercises from the last 7 completed workouts
  const recentExerciseIds = new Set();
  const recentExercises = [];

  // Only consider the most recent 7 workouts
  const last7Workouts = workoutHistory.slice(0, 7);
  for (const workout of last7Workouts) {
    for (const workoutExercise of workout.exercises) {
      const exId = workoutExercise.exercise_id;
      if (typeof exId === 'string' && exId.length > 0 && !recentExerciseIds.has(exId)) {
        recentExerciseIds.add(exId);
        const exercise = exercises.find(e => e.id === exId);
        if (exercise) {
          recentExercises.push(exercise);
        }
      }
    }
  }

  const displayedExercises = selectedTab === 'recent'
    ? (searchQuery ? filteredExercises.filter(e => typeof e.id === 'string' && recentExerciseIds.has(e.id)) : recentExercises)
    : filteredExercises;

  const handleSelectExercise = (exerciseId: string) => {
    onSelectExercise(exerciseId);
    setSearchQuery('');
    setSelectedTab('all');
    setForceFilters([]);
    setMuscleFilters([]);
    setEquipmentFilters([]);
    onClose();
  };

  const handleShowExerciseInfo = (exercise: any) => {
    setSelectedExerciseForInfo(exercise);
    setShowExerciseInfo(true);
  };

  const clearAllFilters = () => {
    setForceFilters([]);
    setMuscleFilters([]);
    setEquipmentFilters([]);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (forceFilters.length > 0) count++;
    if (muscleFilters.length > 0) count++;
    if (equipmentFilters.length > 0) count++;
    return count;
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
    <>
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

          {/* Filter Button */}
          <View style={styles.filterButtonContainer}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterModal((prev) => !prev)}
            >
              <Filter size={20} color={Colors.accent} />
              <Text style={styles.filterButtonText}>Filter</Text>
              {getActiveFiltersCount() > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
                </View>
              )}
            </TouchableOpacity>
            {showFilterModal && (
              <View style={styles.dropdownFilterPanel}>
                <View style={styles.headerDropdown}>
                  <Text style={styles.headerTitleDropdown}>Filter Exercises</Text>
                  <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeButtonDropdown}>
                    <X size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.filterModalContentDropdown}>
                  {/* Force Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Force Type</Text>
                    <View style={styles.filterOptions}>
                      <TouchableOpacity
                        style={[
                          styles.filterOption,
                          forceFilters.length === 0 && styles.filterOptionActive
                        ]}
                        onPress={() => setForceFilters([])}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          forceFilters.length === 0 && styles.filterOptionTextActive
                        ]}>
                          All
                        </Text>
                      </TouchableOpacity>
                      {forceOptions.map((force: string) => (
                        <TouchableOpacity
                          key={force}
                          style={[
                            styles.filterOption,
                            forceFilters.includes(force) && styles.filterOptionActive
                          ]}
                          onPress={() => {
                            setForceFilters(prev =>
                              prev.includes(force)
                                ? prev.filter(f => f !== force)
                                : [...prev, force]
                            );
                          }}
                        >
                          <Text style={[
                            styles.filterOptionText,
                            forceFilters.includes(force) && styles.filterOptionTextActive
                          ]}>
                            {force.charAt(0).toUpperCase() + force.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {/* Primary Muscle Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Primary Muscle</Text>
                    <View style={styles.filterOptions}>
                      <TouchableOpacity
                        style={[
                          styles.filterOption,
                          muscleFilters.length === 0 && styles.filterOptionActive
                        ]}
                        onPress={() => setMuscleFilters([])}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          muscleFilters.length === 0 && styles.filterOptionTextActive
                        ]}>
                          All
                        </Text>
                      </TouchableOpacity>
                      {muscleOptions.map((muscle: string) => (
                        <TouchableOpacity
                          key={muscle}
                          style={[
                            styles.filterOption,
                            muscleFilters.includes(muscle) && styles.filterOptionActive
                          ]}
                          onPress={() => {
                            setMuscleFilters(prev =>
                              prev.includes(muscle)
                                ? prev.filter(m => m !== muscle)
                                : [...prev, muscle]
                            );
                          }}
                        >
                          <Text style={[
                            styles.filterOptionText,
                            muscleFilters.includes(muscle) && styles.filterOptionTextActive
                          ]}>
                            {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {/* Equipment Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Equipment</Text>
                    <View style={styles.filterOptions}>
                      <TouchableOpacity
                        style={[
                          styles.filterOption,
                          equipmentFilters.length === 0 && styles.filterOptionActive
                        ]}
                        onPress={() => setEquipmentFilters([])}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          equipmentFilters.length === 0 && styles.filterOptionTextActive
                        ]}>
                          All
                        </Text>
                      </TouchableOpacity>
                      {equipmentOptions.map((equipment: string) => (
                        <TouchableOpacity
                          key={equipment}
                          style={[
                            styles.filterOption,
                            equipmentFilters.includes(equipment) && styles.filterOptionActive
                          ]}
                          onPress={() => {
                            setEquipmentFilters(prev =>
                              prev.includes(equipment)
                                ? prev.filter(e => e !== equipment)
                                : [...prev, equipment]
                            );
                          }}
                        >
                          <Text style={[
                            styles.filterOptionText,
                            equipmentFilters.includes(equipment) && styles.filterOptionTextActive
                          ]}>
                            {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
                <View style={styles.filterModalFooterDropdown}>
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={clearAllFilters}
                  >
                    <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    </>
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
  filterButtonContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    width: '100%',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    position: 'relative',
    width: '100%',
  },
  filterButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.bold,
    color: Colors.accentContrast,
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
  // Filter Modal Styles
  filterModalContent: {
    flex: 1,
    padding: 24,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  filterOptionActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterOptionText: {
    fontSize: FontSizes.body,
    color: Colors.primary,
  },
  filterOptionTextActive: {
    color: Colors.accentContrast,
    fontWeight: FontWeights.medium,
  },
  filterModalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  clearFiltersButton: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.secondary,
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    paddingTop: 16,
    paddingHorizontal: 24,
    minHeight: 420,
    maxHeight: '90%',
    width: '100%',
    alignSelf: 'center',
    marginBottom: 24,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 10,
  },
  filterOverlayInModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  filterPopupModal: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    paddingBottom: 24,
    paddingTop: 16,
    paddingHorizontal: 24,
    minHeight: 320,
    maxHeight: '80%',
    width: '90%',
    alignSelf: 'center',
    marginBottom: 0,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    // Elevation for Android
    elevation: 20,
  },
  dragHandleContainer: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.divider,
    opacity: 0.7,
  },
  dropdownFilterPanel: {
    position: 'absolute',
    top: 56,
    // left: 0,
    // right: 0,
    marginHorizontal: 0,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
    paddingBottom: 12,
    paddingTop: 8,
    paddingHorizontal: 12,
    maxHeight: 340,
    width: 320,
    minWidth: 0,
    alignSelf: 'center',
  },
  headerDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleDropdown: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  closeButtonDropdown: {
    padding: 4,
  },
  filterModalContentDropdown: {
    maxHeight: 200,
    marginBottom: 8,
  },
  filterModalFooterDropdown: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    alignItems: 'center',
  },
});