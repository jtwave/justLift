import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { router } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock, Target, TrendingUp, Dumbbell } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CALENDAR_WIDTH = width - 48;
const DAY_SIZE = CALENDAR_WIDTH / 7;
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

export default function MyWorkoutsScreen() {
  const { workoutHistory, loadWorkoutHistory } = useWorkoutStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    loadWorkoutHistory();
  }, [loadWorkoutHistory]);

  useEffect(() => {
    // Auto-select today's date and check for workout on initial load
    const today = new Date();
    setSelectedDate(today);
    handleDayPress(today);
  }, [workoutHistory]);

  const workoutDates = new Set(
    workoutHistory.map(workout => 
      new Date(workout.start_time).toDateString()
    )
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    const dateString = date.toDateString();
    const workoutsOnDate = workoutHistory.filter(workout => 
      new Date(workout.start_time).toDateString() === dateString
    );
    
    // Always set the selected workout (null if no workout on this date)
    setSelectedWorkout(workoutsOnDate.length > 0 ? workoutsOnDate[0] : null);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatWorkoutDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatWorkoutTime = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    const startTimeStr = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (!endTime) return `Started at ${startTimeStr}`;

    const duration = Math.round((new Date(endTime).getTime() - start.getTime()) / (1000 * 60));
    return `${startTimeStr} • ${duration} min`;
  };

  const getTotalSets = (exercises: any[]) => {
    return exercises.reduce((total, exercise) => 
      total + exercise.sets.filter((set: any) => set.completed).length, 0);
  };

  const getTotalVolume = (exercises: any[]) => {
    return exercises.reduce((total, exercise) => 
      total + exercise.sets.reduce((setTotal: number, set: any) => 
        setTotal + (set.completed ? Number(set.weight) * set.reps : 0), 0), 0);
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group workouts by month for list view
  const workoutsByMonth = workoutHistory.reduce((acc, workout) => {
    const date = new Date(workout.start_time);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        workouts: []
      };
    }
    acc[monthKey].workouts.push(workout);
    return acc;
  }, {} as Record<string, { month: string; workouts: any[] }>);

  const monthGroups = Object.values(workoutsByMonth);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Workouts</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
            onPress={() => setViewMode('calendar')}
          >
            <Calendar size={20} color={viewMode === 'calendar' ? Colors.primary : Colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Dumbbell size={20} color={viewMode === 'list' ? Colors.primary : Colors.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT }}>
        {viewMode === 'calendar' ? (
          <>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
                <ChevronLeft size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.monthYear}>{formatMonthYear(currentDate)}</Text>
              <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
                <ChevronRight size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Week Days Header */}
            <View style={styles.weekDaysContainer}>
              {weekDays.map((day) => (
                <View key={day} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {days.map((date, index) => {
                if (!date) {
                  return <View key={index} style={styles.emptyDay} />;
                }

                const hasWorkout = workoutDates.has(date.toDateString());
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedDate?.toDateString() === date.toDateString();

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      hasWorkout && styles.workoutDay,
                      isSelected && styles.selectedDay
                    ]}
                    onPress={() => handleDayPress(date)}
                  >
                    <Text style={[
                      styles.dayText,
                      hasWorkout && styles.workoutDayText,
                      isSelected && styles.selectedDayText
                    ]}>
                      {date.getDate()}
                    </Text>
                    {hasWorkout && <View style={styles.workoutDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Workout Details */}
            {selectedDate && (
              <View style={styles.workoutDetails}>
                <Text style={styles.workoutDetailsTitle}>
                  {formatWorkoutDate(selectedDate.toISOString())}
                </Text>
                {selectedWorkout ? (
                  <TouchableOpacity 
                    style={styles.workoutCard}
                    onPress={() => router.push(`/workout/${selectedWorkout.id}`)}
                  >
                    <View style={styles.workoutCardHeader}>
                      <Text style={styles.workoutName}>{selectedWorkout.name}</Text>
                      <Text style={styles.workoutTime}>
                        {formatWorkoutTime(selectedWorkout.start_time, selectedWorkout.end_time)}
                      </Text>
                    </View>
                    <View style={styles.workoutStats}>
                      <View style={styles.statItem}>
                        <Dumbbell size={16} color={Colors.accent} />
                        <Text style={styles.statText}>{selectedWorkout.exercises.length} exercises</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Target size={16} color={Colors.accent} />
                        <Text style={styles.statText}>{getTotalSets(selectedWorkout.exercises)} sets</Text>
                      </View>
                      <View style={styles.statItem}>
                        <TrendingUp size={16} color={Colors.accent} />
                        <Text style={styles.statText}>{Math.round(getTotalVolume(selectedWorkout.exercises) / 1000)}K lbs</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noWorkoutCard}>
                    <Text style={styles.noWorkoutText}>No workout on this date</Text>
                  </View>
                )}
              </View>
            )}

            {/* Legend */}
            <View style={styles.legend}>
              <Text style={styles.legendTitle}>Legend</Text>
              <View style={styles.legendItem}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Workout completed</Text>
              </View>
            </View>
          </>
        ) : (
          /* List View */
          <View style={styles.listView}>
            {monthGroups.length > 0 ? (
              monthGroups.map((group, groupIndex) => (
                <View key={groupIndex} style={styles.monthGroup}>
                  <Text style={styles.monthGroupTitle}>{group.month}</Text>
                  {group.workouts.map((workout) => (
                    <TouchableOpacity
                      key={workout.id}
                      style={styles.workoutListItem}
                      onPress={() => router.push(`/workout/${workout.id}`)}
                    >
                      <View style={styles.workoutListHeader}>
                        <Text style={styles.workoutListName}>{workout.name}</Text>
                        <Text style={styles.workoutListDate}>
                          {new Date(workout.start_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                      <Text style={styles.workoutListTime}>
                        {formatWorkoutTime(workout.start_time, workout.end_time)}
                      </Text>
                      <View style={styles.workoutListStats}>
                        <Text style={styles.workoutListStat}>
                          {workout.exercises.length} exercises
                        </Text>
                        <Text style={styles.workoutListStat}>
                          {getTotalSets(workout.exercises)} sets
                        </Text>
                        <Text style={styles.workoutListStat}>
                          {Math.round(getTotalVolume(workout.exercises) / 1000)}K lbs
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Dumbbell size={64} color={Colors.secondary} />
                <Text style={styles.emptyStateTitle}>No workouts yet</Text>
                <Text style={styles.emptyStateText}>
                  Start your first workout to see it appear here
                </Text>
                <TouchableOpacity 
                  style={styles.startWorkoutButton}
                  onPress={() => router.push('/workout/active')}
                >
                  <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: Colors.accent,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    width: DAY_SIZE,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
    color: Colors.secondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  emptyDay: {
    width: DAY_SIZE,
    height: DAY_SIZE,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  workoutDay: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: Colors.accent + '20', // 20% opacity
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 8,
  },
  dayText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
  workoutDayText: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  todayText: {
    color: Colors.success,
    fontWeight: FontWeights.semibold,
  },
  workoutDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  selectedDayText: {
    color: Colors.accent,
    fontWeight: FontWeights.semibold,
  },
  workoutDetails: {
    marginBottom: 32,
  },
  workoutDetailsTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 12,
  },
  workoutCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  workoutCardHeader: {
    marginBottom: 12,
  },
  workoutName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginBottom: 4,
  },
  workoutTime: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  noWorkoutCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  noWorkoutText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 16,
  },
  legend: {
    marginBottom: 32,
  },
  legendTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
    marginRight: 12,
  },
  legendText: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  listView: {
    paddingVertical: 24,
  },
  monthGroup: {
    marginBottom: 32,
  },
  monthGroupTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 16,
  },
  workoutListItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  workoutListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workoutListName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    flex: 1,
  },
  workoutListDate: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  workoutListTime: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginBottom: 8,
  },
  workoutListStats: {
    flexDirection: 'row',
    gap: 16,
  },
  workoutListStat: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
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
  startWorkoutButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startWorkoutButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
});