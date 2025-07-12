import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useRestTimer } from '@/hooks/useRestTimer';
import { Minus, Plus, X } from 'lucide-react-native';

interface RestTimerProps {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
  defaultDuration?: number;
  compact?: boolean;
}

export function RestTimer({ 
  visible, 
  onClose, 
  onComplete, 
  defaultDuration = 90,
  compact = false
}: RestTimerProps) {
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

  React.useEffect(() => {
    if (visible) {
      console.log('RestTimer: Setting new duration from', duration, 'to', defaultDuration);
      adjustDuration(defaultDuration);
      // Always start the timer when the modal becomes visible
      setTimeout(() => {
        startTimer(defaultDuration);
      }, 100);
    }
  }, [visible, defaultDuration, duration, adjustDuration, startTimer]);

  React.useEffect(() => {
    if (timeLeft === 0 && isActive) {
      onComplete?.();
    }
  }, [timeLeft, isActive, onComplete]);

  const handleDurationAdjust = (adjustment: number) => {
    const newDuration = Math.max(10, duration + adjustment);
    adjustDuration(newDuration);
    if (isActive) {
      resetTimer();
      startTimer(newDuration);
    }
  };

  return (
    <>
      {compact ? (
        <View style={[styles.compactContainer, { display: visible ? 'flex' : 'none' }]}>
          <View style={styles.compactTimer}>
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle}>Rest Timer</Text>
              <TouchableOpacity onPress={onClose} style={styles.compactCloseButton}>
                <X size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.compactTimeDisplay}>
              {formatTime(timeLeft)}
            </Text>
            
            <View style={styles.compactControls}>
              <TouchableOpacity
                style={[styles.compactButton, styles.compactSkipButton]}
                onPress={onClose}
              >
                <Text style={[styles.compactButtonText, styles.compactSkipButtonText]}>
                  Skip Rest
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={onClose}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Rest Timer</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={styles.timerContainer}>
                <Text style={styles.timeDisplay}>
                  {formatTime(timeLeft)}
                </Text>
                <Text style={styles.timeSubtitle}>
                  {isActive ? 'Rest in progress' : 'Rest complete'}
                </Text>
              </View>

              <View style={styles.controls}>
                <Text style={styles.controlLabel}>Duration</Text>
                <View style={styles.durationControls}>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => handleDurationAdjust(-15)}
                  >
                    <Minus size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.durationText}>{formatTime(duration)}</Text>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => handleDurationAdjust(15)}
                  >
                    <Plus size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.resetButton]}
                  onPress={() => {
                    resetTimer();
                    startTimer();
                  }}
                >
                  <Text style={styles.actionButtonText}>Restart</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.skipButton]}
                  onPress={onClose}
                >
                  <Text style={styles.actionButtonText}>
                    Skip Rest
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  timeDisplay: {
    fontSize: 96,
    fontWeight: FontWeights.bold,
    color: Colors.accent,
    fontFamily: 'Inter-Bold',
  },
  timeSubtitle: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginTop: 8,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 64,
  },
  controlLabel: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 16,
  },
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  adjustButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationText: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    minWidth: 80,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: Colors.cardBackground,
  },
  toggleButton: {
    backgroundColor: Colors.accent,
  },
  actionButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  
  // Compact timer styles
  compactContainer: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  compactTimer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  compactCloseButton: {
    padding: 4,
  },
  compactTimeDisplay: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: 16,
  },
  compactControls: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  compactButton: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  compactSkipButton: {
    backgroundColor: Colors.accent,
  },
  compactButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.secondary,
  },
  compactSkipButtonText: {
    color: Colors.primary,
  },
  skipButton: {
    backgroundColor: Colors.accent,
  },
});