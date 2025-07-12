import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Switch,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { X, Timer, Clock } from 'lucide-react-native';

interface RestTimerSettingsProps {
  visible: boolean;
  onClose: () => void;
  exerciseId: string | null;
  currentRestTime: number;
  onUpdateRestTime: (exerciseId: string, restTime: number) => void;
}

const REST_TIME_OPTIONS = [
  { value: 0, label: 'Off', description: 'No rest timer' },
  { value: 20, label: '20s', description: '20 seconds' },
  { value: 25, label: '25s', description: '25 seconds' },
  { value: 30, label: '30s', description: '30 seconds' },
  { value: 35, label: '35s', description: '35 seconds' },
  { value: 40, label: '40s', description: '40 seconds' },
  { value: 45, label: '45s', description: '45 seconds' },
  { value: 60, label: '1m', description: '1 minute' },
  { value: 90, label: '1m 30s', description: '1 minute 30 seconds' },
  { value: 120, label: '2m', description: '2 minutes' },
  { value: 150, label: '2m 30s', description: '2 minutes 30 seconds' },
  { value: 180, label: '3m', description: '3 minutes' },
  { value: 240, label: '4m', description: '4 minutes' },
  { value: 300, label: '5m', description: '5 minutes' },
];

export function RestTimerSettings({ 
  visible, 
  onClose, 
  exerciseId, 
  currentRestTime, 
  onUpdateRestTime 
}: RestTimerSettingsProps) {
  const [selectedTime, setSelectedTime] = useState(currentRestTime);

  React.useEffect(() => {
    setSelectedTime(currentRestTime);
  }, [currentRestTime, visible]);

  const handleSave = () => {
    console.log('=== REST TIMER SETTINGS SAVE ===');
    console.log('exerciseId:', exerciseId);
    console.log('selectedTime:', selectedTime);
    
    if (exerciseId) {
      onUpdateRestTime(exerciseId, selectedTime);
    } else {
      console.log('No exerciseId provided, cannot save');
    }
  };

  const handleTimeSelect = (time: number) => {
    console.log('Time selected:', time);
    setSelectedTime(time);
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
          <Text style={styles.headerTitle}>Rest Timer</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Timer size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Choose Rest Duration</Text>
            </View>
            
            <Text style={styles.sectionDescription}>
              Select how long you want to rest between sets for this exercise.
            </Text>

            <View style={styles.optionsContainer}>
              {REST_TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeOption,
                    selectedTime === option.value && styles.timeOptionSelected
                  ]}
                  onPress={() => handleTimeSelect(option.value)}
                >
                  <View style={styles.timeOptionContent}>
                    <Text style={[
                      styles.timeOptionLabel,
                      selectedTime === option.value && styles.timeOptionLabelSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.timeOptionDescription,
                      selectedTime === option.value && styles.timeOptionDescriptionSelected
                    ]}>
                      {option.description}
                    </Text>
                  </View>
                  {selectedTime === option.value && (
                    <View style={styles.selectedIndicator}>
                      <View style={styles.selectedDot} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Clock size={20} color={Colors.accent} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Rest Timer Tips</Text>
                <Text style={styles.infoText}>
                  • Shorter rest (20-45s) for lighter weights and endurance
                </Text>
                <Text style={styles.infoText}>
                  • Medium rest (1-2m) for moderate intensity training
                </Text>
                <Text style={styles.infoText}>
                  • Longer rest (3-5m) for heavy compound movements
                </Text>
                <Text style={styles.infoText}>
                  • Turn off for exercises where you don't need timing
                </Text>
              </View>
            </View>
          </View>
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
    paddingVertical: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  sectionDescription: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 8,
  },
  timeOption: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeOptionSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  timeOptionContent: {
    flex: 1,
  },
  timeOptionLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 2,
  },
  timeOptionLabelSelected: {
    color: Colors.primary,
  },
  timeOptionDescription: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  timeOptionDescriptionSelected: {
    color: Colors.primary,
    opacity: 0.8,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  infoSection: {
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
});