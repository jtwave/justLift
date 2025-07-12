import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWeightStore } from '@/store/weightStore';
import { X, Plus, Minus } from 'lucide-react-native';

interface WeightEntryModalProps {
  visible: boolean;
  onClose: () => void;
  entry?: any;
}

export function WeightEntryModal({ visible, onClose, entry }: WeightEntryModalProps) {
  const { addWeightEntry, updateWeightEntry, loading } = useWeightStore();
  
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedDate, setRecordedDate] = useState('');

  useEffect(() => {
    if (entry) {
      setWeight(Number(entry.weight).toString());
      setNotes(entry.notes || '');
      setRecordedDate(new Date(entry.recorded_at).toISOString().split('T')[0]);
    } else {
      setWeight('');
      setNotes('');
      setRecordedDate(new Date().toISOString().split('T')[0]);
    }
  }, [entry, visible]);

  const adjustWeight = (adjustment: number) => {
    const currentWeight = parseFloat(weight) || 0;
    const newWeight = Math.max(0, currentWeight + adjustment);
    setWeight(newWeight.toString());
  };

  const handleSave = async () => {
    const weightValue = parseFloat(weight);
    
    if (!weightValue || weightValue <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight greater than 0.');
      return;
    }

    if (weightValue > 1000) {
      Alert.alert('Invalid Weight', 'Please enter a weight less than 1000 lbs.');
      return;
    }

    try {
      const recordedAt = new Date(recordedDate + 'T12:00:00').toISOString();
      
      if (entry) {
        await updateWeightEntry(entry.id, weightValue, notes.trim() || undefined, recordedAt);
      } else {
        await addWeightEntry(weightValue, notes.trim() || undefined, recordedAt);
      }
      
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save weight entry. Please try again.');
    }
  };

  const isValid = weight && parseFloat(weight) > 0 && parseFloat(weight) <= 1000;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {entry ? 'Edit Weight' : 'Add Weight'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading || !isValid}
            style={[
              styles.saveButton,
              (!isValid || loading) && styles.saveButtonDisabled
            ]}
          >
            <Text style={[
              styles.saveButtonText,
              (!isValid || loading) && styles.saveButtonTextDisabled
            ]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Weight Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Weight (lbs)</Text>
            <View style={styles.weightInputContainer}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustWeight(-0.5)}
              >
                <Minus size={20} color={Colors.primary} />
              </TouchableOpacity>
              
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={Colors.secondary}
                selectTextOnFocus
              />
              
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustWeight(0.5)}
              >
                <Plus size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputHint}>
              Tap the +/- buttons to adjust by 0.5 lbs
            </Text>
          </View>

          {/* Date Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={recordedDate}
              onChangeText={setRecordedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.secondary}
            />
            <Text style={styles.inputHint}>
              When was this weight recorded?
            </Text>
          </View>

          {/* Notes Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this weigh-in..."
              placeholderTextColor={Colors.secondary}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.inputHint}>
              e.g., "Morning weight", "After workout", "Before meal"
            </Text>
          </View>

          {/* Quick Weight Presets */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quick Adjustments</Text>
            <View style={styles.presetsContainer}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => adjustWeight(-2)}
              >
                <Text style={styles.presetButtonText}>-2 lbs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => adjustWeight(-1)}
              >
                <Text style={styles.presetButtonText}>-1 lb</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => adjustWeight(1)}
              >
                <Text style={styles.presetButtonText}>+1 lb</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => adjustWeight(2)}
              >
                <Text style={styles.presetButtonText}>+2 lbs</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  saveButtonTextDisabled: {
    color: Colors.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 12,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  adjustButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightInput: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    textAlign: 'center',
    minWidth: 120,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: FontSizes.body,
    color: Colors.primary,
    marginBottom: 8,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  presetsContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  presetButton: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  presetButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.accent,
  },
});