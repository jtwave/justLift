import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWeightStore } from '@/store/weightStore';
import { router } from 'expo-router';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Minus, Scale, Target } from 'lucide-react-native';
import { WeightEntryModal } from '@/components/WeightEntryModal';

const { width } = Dimensions.get('window');

export default function WeightTrackingScreen() {
  const { 
    weightEntries, 
    stats, 
    loadWeightEntries, 
    deleteWeightEntry, 
    loading 
  } = useWeightStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  useEffect(() => {
    loadWeightEntries();
  }, [loadWeightEntries]);

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert(
      'Delete Weight Entry',
      'Are you sure you want to delete this weight entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteWeightEntry(entryId)
        }
      ]
    );
  };

  const formatWeight = (weight: number | null) => {
    if (weight === null) return '--';
    return `${weight.toFixed(1)} lbs`;
  };

  const formatWeightChange = (change: number | null) => {
    if (change === null) return null;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)} lbs`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getWeightChangeIcon = () => {
    if (stats.weightChange === null) return null;
    if (stats.weightChange > 0) return <TrendingUp size={16} color={Colors.warning} />;
    if (stats.weightChange < 0) return <TrendingDown size={16} color={Colors.success} />;
    return <Minus size={16} color={Colors.secondary} />;
  };

  const getWeightChangeColor = () => {
    if (stats.weightChange === null) return Colors.secondary;
    if (stats.weightChange > 0) return Colors.warning;
    if (stats.weightChange < 0) return Colors.success;
    return Colors.secondary;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Weight</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Plus size={24} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Weight Card */}
        <View style={styles.currentWeightCard}>
          <View style={styles.currentWeightHeader}>
            <Scale size={24} color={Colors.accent} />
            <Text style={styles.currentWeightLabel}>Current Weight</Text>
          </View>
          <Text style={styles.currentWeightValue}>
            {formatWeight(stats.currentWeight)}
          </Text>
          {stats.weightChange !== null && (
            <View style={styles.weightChangeContainer}>
              {getWeightChangeIcon()}
              <Text style={[styles.weightChangeText, { color: getWeightChangeColor() }]}>
                {formatWeightChange(stats.weightChange)} from last entry
              </Text>
            </View>
          )}
        </View>

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Target size={20} color={Colors.accent} />
              <Text style={styles.statValue}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={20} color={Colors.warning} />
              <Text style={styles.statValue}>{formatWeight(stats.highestWeight)}</Text>
              <Text style={styles.statLabel}>Highest</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingDown size={20} color={Colors.success} />
              <Text style={styles.statValue}>{formatWeight(stats.lowestWeight)}</Text>
              <Text style={styles.statLabel}>Lowest</Text>
            </View>
          </View>
        </View>

        {/* Weight History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Weight History</Text>
          {weightEntries.length > 0 ? (
            weightEntries.map((entry, index) => {
              const previousEntry = weightEntries[index + 1];
              const change = previousEntry 
                ? Number(entry.weight) - Number(previousEntry.weight)
                : null;

              return (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.entryCard}
                  onPress={() => setEditingEntry(entry)}
                  onLongPress={() => handleDeleteEntry(entry.id)}
                >
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryWeight}>
                      {formatWeight(Number(entry.weight))}
                    </Text>
                    <Text style={styles.entryDate}>
                      {formatDate(entry.recorded_at)}
                    </Text>
                  </View>
                  
                  {change !== null && (
                    <View style={styles.entryChangeContainer}>
                      {change > 0 ? (
                        <TrendingUp size={14} color={Colors.warning} />
                      ) : change < 0 ? (
                        <TrendingDown size={14} color={Colors.success} />
                      ) : (
                        <Minus size={14} color={Colors.secondary} />
                      )}
                      <Text style={[
                        styles.entryChangeText,
                        { 
                          color: change > 0 ? Colors.warning : 
                                 change < 0 ? Colors.success : Colors.secondary 
                        }
                      ]}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)} lbs
                      </Text>
                    </View>
                  )}
                  
                  {entry.notes && (
                    <Text style={styles.entryNotes}>{entry.notes}</Text>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Scale size={48} color={Colors.secondary} />
              <Text style={styles.emptyStateTitle}>No Weight Entries</Text>
              <Text style={styles.emptyStateText}>
                Start tracking your weight to monitor your progress over time.
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton} 
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={20} color={Colors.primary} />
                <Text style={styles.emptyStateButtonText}>Add First Entry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Weight Modal */}
      <WeightEntryModal
        visible={showAddModal || !!editingEntry}
        onClose={() => {
          setShowAddModal(false);
          setEditingEntry(null);
        }}
        entry={editingEntry}
      />
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
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  currentWeightCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    alignItems: 'center',
  },
  currentWeightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  currentWeightLabel: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
  currentWeightValue: {
    fontSize: 48,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: 8,
  },
  weightChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightChangeText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
  statsSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    textAlign: 'center',
  },
  historySection: {
    marginTop: 32,
    marginBottom: 32,
  },
  entryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryWeight: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  entryDate: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
  entryChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  entryChangeText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
  },
  entryNotes: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  emptyStateButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
});