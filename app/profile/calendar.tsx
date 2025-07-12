import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { router } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CALENDAR_WIDTH = width - 48;
const DAY_SIZE = CALENDAR_WIDTH / 7;

export default function WorkoutCalendarScreen() {
  const { workoutHistory } = useWorkoutStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);

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
    const dateString = date.toDateString();
    setSelectedDate(date);
    const workoutsOnDate = workoutHistory.filter(workout => 
      new Date(workout.start_time).toDateString() === dateString
    );
    
    setSelectedWorkout(workoutsOnDate.length > 0 ? workoutsOnDate[0] : null);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Calendar</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            {selectedWorkout ? (
              <View style={styles.workoutCard}>
                <Text style={styles.workoutName}>{selectedWorkout.name}</Text>
                <View style={styles.workoutStats}>
                  <Text style={styles.workoutStat}>
                    {selectedWorkout.exercises.length} exercises
                  </Text>
                  <Text style={styles.workoutStat}>
                    {selectedWorkout.exercises.reduce((total: number, exercise: any) => 
                      total + exercise.sets.filter((set: any) => set.completed).length, 0)} sets
                  </Text>
                  {selectedWorkout.end_time && (
                    <Text style={styles.workoutStat}>
                      {Math.round((new Date(selectedWorkout.end_time).getTime() - new Date(selectedWorkout.start_time).getTime()) / (1000 * 60))} min
                    </Text>
                  )}
                </View>
              </View>
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
  placeholder: {
    width: 40,
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
  selectedDayText: {
    color: Colors.accent,
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
  workoutName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginBottom: 8,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 16,
  },
  workoutStat: {
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
  todayLegendDot: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  legendText: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
});