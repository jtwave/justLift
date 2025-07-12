import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { Minus, Plus, Timer, Settings, Info, Play, Pause, RotateCcw, Trash2, X } from 'lucide-react-native';
import { ExerciseInfoModal } from './ExerciseInfoModal';
import { useRestTimer } from '@/hooks/useRestTimer';

interface ExerciseCardProps {
  exercise: any;
  onLogSet: (setData: any) => void;
  onRestTimerSettings: () => void;
  onDeleteExercise?: () => void;
  onDeleteSet?: (setId: string) => void;
}

export function ExerciseCard({ exercise, onLogSet, onRestTimerSettings, onDeleteExercise, onDeleteSet }: ExerciseCardProps) {
  const { getPreviousSetData } = useWorkoutStore();
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);
  
  // Timer state for time-based exercises
  const { 
    timeLeft, 
    duration, 
    isActive, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    adjustDuration, 
    formatTime 
  } = useRestTimer();
  
  const completedSets = exercise.sets.filter((set: any) => set.completed);
  const currentSetNumber = completedSets.length + 1;
  
  const previousData = getPreviousSetData(exercise.exercise_id, currentSetNumber);
  
  // Initialize timer duration based on exercise default
  React.useEffect(() => {
    if (exercise.exercise.tracking_type === 'time_only' && exercise.exercise.default_duration) {
      adjustDuration(exercise.exercise.default_duration);
    }
  }, [exercise.exercise.default_duration, exercise.exercise.tracking_type]);
  
  const [weight, setWeight] = useState(previousData?.weight?.toString() || '135');
  const [reps, setReps] = useState(previousData?.reps?.toString() || '8');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  
  // Simple manual time input
  const [timeInput, setTimeInput] = useState('0:00');

  const adjustWeight = (adjustment: number) => {
    const currentWeight = parseFloat(weight) || 0;
    const newWeight = Math.max(0, currentWeight + adjustment);
    setWeight(newWeight.toString());
  };

  const adjustReps = (adjustment: number) => {
    const currentReps = parseInt(reps) || 0;
    const newReps = Math.max(0, currentReps + adjustment);
    setReps(newReps.toString());
  };

  const handleDeleteSet = (setId: string) => {
    Alert.alert(
      'Delete Set',
      'Are you sure you want to delete this set?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            console.log('Deleting set with ID:', setId);
            onDeleteSet?.(setId);
          }
        }
      ]
    );
  };

  const handleDeleteExercise = () => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to delete ${exercise.exercise.name} from this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDeleteExercise?.()
        }
      ]
    );
  };
  // Format time input to handle minutes:seconds
  const formatTimeInput = (input: string) => {
    // Remove any non-digit characters
    const digits = input.replace(/\D/g, '');
    
    if (digits.length === 0) return '';
    if (digits.length <= 2) return digits;
    
    // For 3+ digits, treat as minutes:seconds
    const minutes = digits.slice(0, -2);
    const seconds = digits.slice(-2);
    
    return `${minutes}:${seconds}`;
  };

  // Convert formatted time back to total seconds
  const parseTimeInput = (timeStr: string) => {
    if (!timeStr) return 0;
    
    if (timeStr.includes(':')) {
      const [minutes, seconds] = timeStr.split(':');
      return (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
    } else {
      // If no colon, treat as minutes only
      return (parseInt(timeStr) || 0) * 60;
    }
  };

  // Initialize time input when component mounts
  React.useEffect(() => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    setTimeInput(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }, []);

  const handleTimerComplete = () => {
    // Auto-log the set when timer completes for time-only exercises
    if (exercise.exercise.tracking_type === 'time_only') {
      handleLogSet();
    }
  };

  React.useEffect(() => {
    if (timeLeft === 0 && isActive && exercise.exercise.tracking_type === 'time_only') {
      handleTimerComplete();
    }
  }, [timeLeft, isActive]);

  // Simple time parsing - expects MM:SS format
  const parseTimeToSeconds = (input: string) => {
    if (!input) return 0;
    
    if (input.includes(':')) {
      const [minutesStr, secondsStr] = input.split(':');
      const minutes = parseInt(minutesStr) || 0;
      const seconds = parseInt(secondsStr) || 0;
      return minutes * 60 + seconds;
    } else {
      // If no colon, treat as minutes
      const minutes = parseInt(input) || 0;
      return minutes * 60;
    }
  };

  const handleTimeInputChange = (input: string) => {
    setTimeInput(input);
    const totalSeconds = parseTimeToSeconds(input);
    adjustDuration(totalSeconds - duration);
  };

  const handleLogSet = () => {
    let setData: any = {
      set_number: currentSetNumber,
      completed: true,
      timestamp: new Date().toISOString(),
    };
    
    // Add tracking data based on exercise type
    switch (exercise.exercise.tracking_type) {
      case 'weight_reps':
        setData.weight = parseFloat(weight) || 0;
        setData.reps = parseInt(reps) || 0;
        break;
      case 'bodyweight_reps':
        setData.weight = 0; // No weight for bodyweight
        setData.reps = parseInt(reps) || 0;
        break;
      case 'time_only':
        setData.weight = 0;
        setData.reps = duration; // Store duration in reps field
        break;
      case 'cardio':
      case 'distance_time':
        setData.weight = parseFloat(distance) || 0; // Store distance in weight field
        setData.reps = duration; // Store duration in reps field
        break;
      default:
        setData.weight = parseFloat(weight) || 0;
        setData.reps = parseInt(reps) || 0;
    }
    
    onLogSet(setData);
    
    // Reset timer for time-based exercises
    if (exercise.exercise.tracking_type === 'time_only') {
      resetTimer();
    }
  };

  const renderTrackingInputs = () => {
    switch (exercise.exercise.tracking_type) {
      case 'time_only':
        return (
          <View style={styles.timerContainer}>
            <Text style={styles.timerDisplay}>{formatTime(timeLeft || duration)}</Text>
            
            {/* Manual time input */}
            <View style={styles.timeInputContainer}>
              <Text style={styles.inputLabel}>Duration</Text>
              <TextInput
                style={styles.timeInput}
                value={timeInput}
                onChangeText={handleTimeInputChange}
                keyboardType="numbers-and-punctuation"
                placeholder="0:00"
                placeholderTextColor={Colors.secondary}
              />
              <Text style={styles.unit}>min:sec</Text>
            </View>
            
            <View style={styles.timerControls}>
              <TouchableOpacity
                style={[styles.timerButton, styles.playButton]}
                onPress={isActive ? pauseTimer : () => startTimer()}
              >
                {isActive ? (
                  <Pause size={20} color={Colors.primary} />
                ) : (
                  <Play size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.timerButton}
                onPress={resetTimer}
              >
                <RotateCcw size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 'bodyweight_reps':
        return (
          <View style={styles.inputs}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustReps(-1)}
                >
                  <Minus size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.secondary}
                />
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustReps(1)}
                >
                  <Plus size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.unit}>reps</Text>
            </View>
          </View>
        );
        
      case 'cardio':
      case 'distance_time':
        return (
          <View style={styles.inputs}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Distance</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor={Colors.secondary}
                />
              </View>
              <Text style={styles.unit}>miles</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={timeInput}
                  onChangeText={handleTimeInputChange}
                  keyboardType="numbers-and-punctuation"
                  placeholder="0:00"
                  placeholderTextColor={Colors.secondary}
                />
              </View>
              <Text style={styles.unit}>min:sec</Text>
            </View>
          </View>
        );
        
      default: // weight_reps
        return (
          <View style={styles.inputs}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight</Text>
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustWeight(-5)}
                >
                  <Minus size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.secondary}
                />
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustWeight(5)}
                >
                  <Plus size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.unit}>lbs</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustReps(-1)}
                >
                  <Minus size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.secondary}
                />
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustReps(1)}
                >
                  <Plus size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.unit}>reps</Text>
            </View>
          </View>
        );
    }
  };

  const renderCompletedSets = () => {
    if (completedSets.length === 0) return null;
    
    return (
      <View style={styles.completedSets}>
        <View style={styles.completedSetsHeader}>
          <Text style={styles.completedSetsTitle}>Completed Sets</Text>
        </View>
        {completedSets.map((set: any, index: number) => {
          let setText = '';
          
          switch (exercise.exercise.tracking_type) {
            case 'time_only':
              setText = `Set ${set.set_number}: ${formatTime(set.reps)}`;
              break;
            case 'bodyweight_reps':
              setText = `Set ${set.set_number}: ${set.reps} reps`;
              break;
            case 'cardio':
            case 'distance_time':
              setText = `Set ${set.set_number}: ${set.weight} mi in ${formatTime(set.reps)}`;
              break;
            default:
              setText = `Set ${set.set_number}: ${set.weight} lbs × ${set.reps}`;
          }
          
          return (
            <View key={set.id} style={styles.completedSet}>
              <Text style={styles.completedSetText}>{setText}</Text>
              {onDeleteSet && (
                <TouchableOpacity
                  style={styles.deleteSetButton}
                  onPress={() => handleDeleteSet(set.id)}
                >
                  <X size={16} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseHeaderLeft}>
          <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
        </View>
        <View style={styles.exerciseHeaderRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowExerciseInfo(true)}
          >
          </TouchableOpacity>
          {onDeleteExercise && (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleDeleteExercise}
            >
              <Trash2 size={20} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.restTimerContainer}>
        <TouchableOpacity 
          style={styles.restTimerButton}
          onPress={onRestTimerSettings}
        >
          <Timer size={16} color={Colors.accent} />
          <Text style={styles.restTimerButtonText}>
            Rest Timer: {Math.floor(exercise.rest_time / 60)}:{(exercise.rest_time % 60).toString().padStart(2, '0')}
          </Text>
          <Settings size={14} color={Colors.secondary} />
        </TouchableOpacity>
      </View>
      
      {/* Completed Sets */}
      {renderCompletedSets()}

      {/* Active Set */}
      <View style={styles.activeSet}>
        <View style={styles.setHeader}>
          <Text style={styles.setNumber}>Set {currentSetNumber}</Text>
          {previousData && (
            <Text style={styles.previousData}>
              Prev: {previousData.weight} lbs × {previousData.reps}
            </Text>
          )}
        </View>

        {renderTrackingInputs()}

        <TouchableOpacity 
          style={styles.logButton} 
          onPress={handleLogSet}
          disabled={exercise.exercise.tracking_type === 'time_only' && isActive}
        >
          <Text style={styles.logButtonText}>
            {exercise.exercise.tracking_type === 'time_only' ? 'Complete Set' : 'Log Set'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ExerciseInfoModal
        visible={showExerciseInfo}
        onClose={() => setShowExerciseInfo(false)}
        exercise={exercise.exercise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseHeaderLeft: {
    flex: 1,
  },
  exerciseHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseName: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  headerButton: {
    padding: 8,
  },
  restTimerContainer: {
    marginBottom: 16,
  },
  restTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  restTimerButtonText: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
    fontWeight: FontWeights.medium,
  },
  completedSets: {
    marginBottom: 16,
  },
  completedSetsHeader: {
    marginBottom: 8,
  },
  completedSetsTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.secondary,
  },
  completedSet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  completedSetText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    flex: 1,
  },
  deleteSetButton: {
    padding: 4,
    marginLeft: 8,
  },
  activeSet: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  setNumber: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  previousData: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
  inputs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    fontSize: FontSizes.input,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    textAlign: 'center',
    minWidth: 80,
  },
  unit: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 4,
  },
  logButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: FontWeights.bold,
    color: Colors.accent,
    marginBottom: 12,
  },
  timeInputContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timeInput: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    textAlign: 'center',
    minWidth: 100,
    marginVertical: 4,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerButton: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: Colors.accent,
    width: 44,
  },
  durationDisplay: {
    fontSize: FontSizes.input,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    textAlign: 'center',
    minWidth: 80,
  }
});