import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl, TextInput, PanResponder } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProgressStore } from '@/store/progressStore';
import { BarChart3, Camera, Images as ImagesIcon, ChevronRight, Search, Activity, TrendingUp, Calendar, ChevronDown } from 'lucide-react-native';
import { router } from 'expo-router';
import BodyHeatmap from '@/components/BodyHeatmap';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;
const PHOTO_SIZE = (width - 72) / 3;

// Fix linter errors by adding types
function getHeaviestSet(workout: any) {
    if (!workout.exercises) return 0;
    let max = 0;
    for (const ex of workout.exercises) {
        if (ex.sets) {
            for (const set of ex.sets) {
                if (set.weight && set.weight > max) max = set.weight;
            }
        }
    }
    return max;
}

function getWorkoutFrequency(workoutHistory: any[]) {
    // Count workouts per week for last 4 weeks
    const now = new Date();
    const weeks = [0, 0, 0, 0]; // 0 = this week, 1 = last week, etc.
    for (const w of workoutHistory) {
        const d = new Date(w.start_time);
        const diffWeeks = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks < 4 && diffWeeks >= 0) weeks[3 - diffWeeks]++;
    }
    return weeks;
}

function getExerciseProgressData(workoutHistory: any[], exerciseId: string, repCount: number, timePeriod: '1week' | '1month' | '3months' | '6months' | '1year' = '1month') {
    if (!exerciseId || workoutHistory.length === 0) {
        return { data: [], labels: [], dates: [] };
    }

    // Calculate the cutoff date based on the selected time period
    const now = new Date();
    let cutoffDate = new Date();

    switch (timePeriod) {
        case '1week':
            cutoffDate.setDate(now.getDate() - 7);
            break;
        case '1month':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
        case '3months':
            cutoffDate.setMonth(now.getMonth() - 3);
            break;
        case '6months':
            cutoffDate.setMonth(now.getMonth() - 6);
            break;
        case '1year':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
    }

    // Find workouts that contain the selected exercise within the time period
    const workoutsWithExercise = workoutHistory
        .filter(workout => {
            const workoutDate = new Date(workout.start_time);
            return workoutDate >= cutoffDate &&
                workout.exercises?.some((ex: any) => ex.exercise_id === exerciseId);
        })
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()); // Chronological order

    const data: number[] = [];
    const labels: string[] = [];
    const dates: Date[] = [];

    for (const workout of workoutsWithExercise) {
        const exercise = workout.exercises?.find((ex: any) => ex.exercise_id === exerciseId);
        if (exercise?.sets) {
            // Find the heaviest weight for sets that have >= selected rep count
            let maxWeight = 0;
            for (const set of exercise.sets) {
                if (set.reps >= repCount && set.weight > maxWeight) {
                    maxWeight = set.weight;
                }
            }

            // Only add to chart if we found a valid set
            if (maxWeight > 0) {
                const workoutDate = new Date(workout.start_time);
                data.push(maxWeight);
                dates.push(workoutDate);

                // Format label based on time period
                if (timePeriod === '1week') {
                    labels.push(workoutDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
                } else if (timePeriod === '1month') {
                    labels.push(workoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                } else {
                    labels.push(workoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                }
            }
        }
    }

    return { data, labels, dates };
}

export default function StatsScreen() {
    const { workoutHistory, loadWorkoutHistory, exercises, loadExercises } = useWorkoutStore();
    const { progressPhotos, loadProgressPhotos } = useProgressStore();
    const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
    const [selectedRepCount, setSelectedRepCount] = useState<number>(5);
    const [selectedTimePeriod, setSelectedTimePeriod] = useState<'1week' | '1month' | '3months' | '6months' | '1year'>('1month');
    const [exerciseProgressData, setExerciseProgressData] = useState<number[]>([]);
    const [exerciseProgressLabels, setExerciseProgressLabels] = useState<string[]>([]);
    const [exerciseProgressDates, setExerciseProgressDates] = useState<Date[]>([]);
    const [freqData, setFreqData] = useState<number[]>([]);
    const [freqLabels, setFreqLabels] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'frequent' | 'attention'>('frequent');
    const [muscleAnalysisTimePeriod, setMuscleAnalysisTimePeriod] = useState<'week' | 'month' | '3months' | 'year'>('month');
    const [showMuscleTimeDropdown, setShowMuscleTimeDropdown] = useState(false);
    const [workoutInsightsTimePeriod, setWorkoutInsightsTimePeriod] = useState<'week' | 'month' | '3months' | 'year'>('month');
    const [showWorkoutTimeDropdown, setShowWorkoutTimeDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
    const [showRepDropdown, setShowRepDropdown] = useState(false);
    const [showTimePeriodDropdown, setShowTimePeriodDropdown] = useState(false);
    const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
    const [layoutReady, setLayoutReady] = useState(false);

    // Load workout history and progress photos when component mounts
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Only load if we don't have data yet
                if (workoutHistory.length === 0) {
                    await loadWorkoutHistory();
                }
                if (progressPhotos.length === 0) {
                    await loadProgressPhotos();
                }
                if (exercises.length === 0) {
                    await loadExercises();
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Set layout ready after a brief delay to prevent janky transitions
        const timer = setTimeout(() => {
            setLayoutReady(true);
        }, 25); // Reduced from 50ms to 25ms

        return () => clearTimeout(timer);
    }, []);

    // Handle pull-to-refresh
    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                loadWorkoutHistory(),
                loadProgressPhotos()
            ]);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    };

    // --- BodyMap aggregation logic ---
    const muscleSetCounts = useMemo(() => {
        // Calculate days based on selected time period
        const getDaysForPeriod = (period: typeof muscleAnalysisTimePeriod) => {
            switch (period) {
                case 'week': return 7;
                case 'month': return 30;
                case '3months': return 90;
                case 'year': return 365;
                default: return 30;
            }
        };

        const days = getDaysForPeriod(muscleAnalysisTimePeriod);
        const now = new Date();
        const timeThreshold = 1000 * 60 * 60 * 24 * days;
        const recentWorkouts = workoutHistory.filter(w => now.getTime() - new Date(w.start_time).getTime() < timeThreshold);
        const counts: Record<string, number> = {};

        // Helper function to validate muscle name
        const isValidMuscle = (muscle: any): muscle is string => {
            return typeof muscle === 'string' &&
                muscle.trim().length > 0 &&
                muscle !== '{}' &&
                muscle !== 'null' &&
                muscle !== 'undefined' &&
                !muscle.includes('{') &&
                !muscle.includes('}');
        };

        for (const workout of recentWorkouts) {
            for (const ex of workout.exercises) {
                const completedSets = ex.sets?.filter(set => set.completed).length || 0;
                const primary = Array.isArray(ex.exercise.primaryMuscles) ? ex.exercise.primaryMuscles : [];
                const secondary = Array.isArray(ex.exercise.secondaryMuscles) ? ex.exercise.secondaryMuscles : [];

                for (const muscle of primary) {
                    if (isValidMuscle(muscle)) {
                        counts[muscle] = (counts[muscle] || 0) + completedSets;
                    }
                }
                for (const muscle of secondary) {
                    if (isValidMuscle(muscle)) {
                        counts[muscle] = (counts[muscle] || 0) + Math.round(completedSets / 2); // secondary: half credit
                    }
                }
            }
        }


        return counts;
    }, [workoutHistory, muscleAnalysisTimePeriod]);

    // --- Muscle name normalization for analysis tabs (keep detailed breakdown) ---
    const normalizedMuscleSetCounts = useMemo(() => {
        const muscleNormalization: Record<string, string> = {
            // Keep detailed chest breakdown
            'pectoralis major': 'chest',
            'pectorals': 'chest',
            // 'upper chest' and 'lower chest' stay as-is

            // Keep detailed shoulder breakdown  
            'anterior deltoid': 'front delt',
            'lateral deltoid': 'side delt',
            'posterior deltoid': 'rear delt',
            'front deltoids': 'front delt',
            'rear deltoids': 'rear delt',
            'deltoids': 'shoulders', // generic deltoids → shoulders

            // Back normalization
            'trapezius': 'traps',
            'latissimus dorsi': 'lats',
            'rhomboids': 'upper back',
            'middle trapezius': 'upper back',
            'lower trapezius': 'upper back',
            'erector spinae': 'lower back',

            // Core normalization
            'rectus abdominis': 'abs',
            'abdominals': 'abs',
            'external obliques': 'obliques',
            'internal obliques': 'obliques',

            // Arms normalization
            'biceps brachii': 'biceps',
            'triceps brachii': 'triceps',
            'forearm': 'forearms',

            // Legs normalization
            'quadriceps': 'quads',
            'rectus femoris': 'quads',
            'vastus lateralis': 'quads',
            'vastus medialis': 'quads',
            'biceps femoris': 'hamstrings',
            'semitendinosus': 'hamstrings',
            'semimembranosus': 'hamstrings',
            'gluteus maximus': 'glutes',
            'gluteus medius': 'glutes',
            'gastrocnemius': 'calves',
            'soleus': 'calves',
        };

        const normalized: Record<string, number> = {};

        for (const [muscle, count] of Object.entries(muscleSetCounts)) {
            const normalizedName = muscleNormalization[muscle.toLowerCase()] || muscle.toLowerCase();
            normalized[normalizedName] = (normalized[normalizedName] || 0) + count;
        }



        return normalized;
    }, [muscleSetCounts]);

    // --- Statistical analysis for Needs Attention ---
    const { frequentlyWorked, needsAttention } = useMemo(() => {
        const counts = Object.values(normalizedMuscleSetCounts);

        if (counts.length === 0) {
            return { frequentlyWorked: [], needsAttention: [] };
        }

        // Calculate mean
        const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;

        // Threshold: 2 sets below the mean
        const threshold = Math.max(0, mean - 2);

        // Frequently Worked: muscles at or above (mean - 2 sets)
        const frequent = Object.entries(normalizedMuscleSetCounts)
            .filter(([, count]) => count >= threshold)
            .sort(([, a], [, b]) => b - a)
            .map(([muscle, count]) => ({ muscle, count }));

        // Needs Attention: muscles below (mean - 2 sets)
        const attention = Object.entries(normalizedMuscleSetCounts)
            .filter(([, count]) => count < threshold)
            .sort(([, a], [, b]) => a - b) // Sort by lowest count first
            .map(([muscle]) => muscle);

        return { frequentlyWorked: frequent, needsAttention: attention };
    }, [normalizedMuscleSetCounts]);

    // --- Body Heatmap muscle mapping ---
    const bodyHeatmapData = useMemo(() => {
        // Map exercise muscle names to body heatmap muscle groups
        const muscleMapping: Record<string, string> = {
            // Head & Neck
            'head': 'head',
            'neck': 'neck',

            // Chest - detailed breakdown
            'upper chest': 'chest',
            'lower chest': 'chest',
            'chest': 'chest',
            'pectoralis major': 'chest',
            'pectorals': 'chest',

            // Shoulders - detailed breakdown
            'front delt': 'shoulders',
            'side delt': 'shoulders',
            'rear delt': 'shoulders',
            'anterior deltoid': 'shoulders',
            'lateral deltoid': 'shoulders',
            'posterior deltoid': 'shoulders',
            'front deltoids': 'shoulders',
            'rear deltoids': 'shoulders',
            'deltoids': 'shoulders',
            'shoulders': 'shoulders',

            // Arms
            'biceps': 'biceps',
            'biceps brachii': 'biceps',
            'triceps': 'triceps',
            'triceps brachii': 'triceps',
            'forearms': 'forearms',
            'forearm': 'forearms',

            // Back
            'latissimus dorsi': 'lats',
            'lats': 'lats',
            'trapezius': 'traps',
            'traps': 'traps',
            'rhomboids': 'upperBack',
            'middle trapezius': 'upperBack',
            'lower trapezius': 'upperBack',
            'erector spinae': 'lowerBack',
            'lower back': 'lowerBack',

            // Core
            'abdominals': 'abs',
            'rectus abdominis': 'abs',
            'abs': 'abs',
            'obliques': 'obliques',
            'external obliques': 'obliques',
            'internal obliques': 'obliques',

            // Legs
            'quadriceps': 'quads',
            'quads': 'quads',
            'rectus femoris': 'quads',
            'vastus lateralis': 'quads',
            'vastus medialis': 'quads',
            'hamstrings': 'hamstrings',
            'biceps femoris': 'hamstrings',
            'semitendinosus': 'hamstrings',
            'semimembranosus': 'hamstrings',
            'glutes': 'glutes',
            'gluteus maximus': 'glutes',
            'gluteus medius': 'glutes',
            'calves': 'calves',
            'gastrocnemius': 'calves',
            'soleus': 'calves',

            // Additional mappings
            'adductors': 'abductors',
            'abductors': 'abductors',
            'hip abductors': 'abductors',
            'hip adductors': 'abductors',
            'knees': 'knees',
        };

        const mappedData: Record<string, number> = {};

        // Map muscle set counts to body heatmap muscle groups
        for (const [muscleName, setCount] of Object.entries(normalizedMuscleSetCounts)) {
            const mappedMuscle = muscleMapping[muscleName.toLowerCase()];
            if (mappedMuscle) {
                mappedData[mappedMuscle] = (mappedData[mappedMuscle] || 0) + setCount;
            }
        }

        return mappedData;
    }, [normalizedMuscleSetCounts]);

    // Map set counts to color intensity (light blue to dark blue)
    const muscleColors = useMemo(() => {
        const max = Math.max(...Object.values(muscleSetCounts), 1);
        const min = Math.min(...Object.values(muscleSetCounts), 0);
        const colorScale = (val: number) => {
            if (val === 0) return 'rgba(0,120,255,0.15)';
            // interpolate light blue (few) to dark blue (many)
            const pct = (val - min) / (max - min || 1);
            // Light blue: rgb(180,210,255), Dark blue: rgb(0,80,200)
            const r = Math.round(180 - pct * 180);
            const g = Math.round(210 - pct * 130);
            const b = Math.round(255 - pct * 55);
            return `rgb(${r},${g},${b})`;
        };
        // Map muscle group names to BodyMap keys
        const map: Record<string, string> = {
            chest: 'chest',
            'pectoralis major': 'chest',
            back: 'back',
            'latissimus dorsi': 'lats',
            lats: 'lats',
            biceps: 'biceps',
            triceps: 'triceps',
            shoulders: 'shoulders',
            deltoids: 'shoulders',
            abdominals: 'abs',
            'rectus abdominis': 'abs',
            abs: 'abs',
            quadriceps: 'quads',
            quads: 'quads',
            hamstrings: 'hamstrings',
            glutes: 'glutes',
            calves: 'calves',
            forearms: 'forearms',
            traps: 'traps',
            trapezius: 'traps',
            adductors: 'quads',
            abductors: 'quads',
            // ...add more as needed
        };
        const result: Record<string, string> = {};
        for (const [muscle, count] of Object.entries(muscleSetCounts)) {
            const key = map[muscle.toLowerCase()];
            if (key) result[key] = colorScale(count);
        }
        return result;
    }, [muscleSetCounts]);

    useEffect(() => {
        // Workout frequency (last 4 weeks)
        setFreqData(getWorkoutFrequency(workoutHistory));
        const now = new Date();
        setFreqLabels([
            ...Array(4).keys()
        ].map(i => {
            const d = new Date(now.getTime() - (3 - i) * 7 * 24 * 60 * 60 * 1000);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        }));

        // Set default exercise if none selected and exercises are available
        if (!selectedExerciseId && exercises.length > 0) {
            // Find a common exercise like bench press, squat, or deadlift
            const commonExercises = ['bench press', 'squat', 'deadlift', 'pull-up', 'overhead press'];
            const foundExercise = exercises.find(ex =>
                commonExercises.some(common => ex.name.toLowerCase().includes(common))
            );
            if (foundExercise) {
                setSelectedExerciseId(foundExercise.id);
            } else if (exercises.length > 0) {
                setSelectedExerciseId(exercises[0].id);
            }
        }
    }, [workoutHistory, exercises, selectedExerciseId]);

    // Update exercise progress data when exercise, rep count, or time period changes
    useEffect(() => {
        if (selectedExerciseId && workoutHistory.length > 0) {
            const { data, labels, dates } = getExerciseProgressData(workoutHistory, selectedExerciseId, selectedRepCount, selectedTimePeriod);
            setExerciseProgressData(data);
            setExerciseProgressLabels(labels);
            setExerciseProgressDates(dates);
        } else {
            setExerciseProgressData([]);
            setExerciseProgressLabels([]);
            setExerciseProgressDates([]);
        }
    }, [selectedExerciseId, selectedRepCount, selectedTimePeriod, workoutHistory]);



    // Filtered exercises for search
    const filteredExercises = useMemo(() => {
        if (!exerciseSearchQuery.trim()) {
            return exercises;
        }
        return exercises.filter(exercise =>
            exercise.name &&
            exercise.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
        );
    }, [exercises, exerciseSearchQuery]);

    return (
        <SafeAreaView style={styles.container}>
            {layoutReady && (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.secondary]}
                            tintColor={Colors.secondary}
                        />
                    }
                >
                    <Text style={styles.headerTitle}>Your Statistics</Text>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading your workout statistics...</Text>
                        </View>
                    ) : (
                        <>
                            {/* Muscle Groups Analysis */}
                            <View style={styles.enhancedSection}>
                                <View style={styles.sectionHeaderWithIcon}>
                                    <View style={styles.sectionIconContainer}>
                                        <Activity size={22} color={Colors.accent} />
                                    </View>
                                    <Text style={styles.enhancedSectionTitle}>Muscle Groups Analysis</Text>

                                    {/* Time Period Filter in top right corner */}
                                    <TouchableOpacity
                                        style={{
                                            marginLeft: 'auto',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: Colors.cardBackground,
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 6,
                                            borderWidth: 1,
                                            borderColor: Colors.divider,
                                            minWidth: 50
                                        }}
                                        onPress={() => setShowMuscleTimeDropdown(!showMuscleTimeDropdown)}
                                    >
                                        <Text style={{ fontSize: 12, color: '#FFFFFF', marginRight: 4 }}>
                                            {muscleAnalysisTimePeriod === 'week' ? '1W' :
                                                muscleAnalysisTimePeriod === 'month' ? '1M' :
                                                    muscleAnalysisTimePeriod === '3months' ? '3M' : '1Y'}
                                        </Text>
                                        <ChevronDown size={12} color={Colors.secondary} />
                                    </TouchableOpacity>
                                </View>

                                {showMuscleTimeDropdown && (
                                    <View style={{
                                        position: 'absolute',
                                        top: 35,
                                        right: 0,
                                        backgroundColor: Colors.cardBackground,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: Colors.divider,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 4,
                                        elevation: 3,
                                        zIndex: 1000,
                                        width: 120
                                    }}>
                                        {[
                                            { value: 'week' as const, label: 'Past Week' },
                                            { value: 'month' as const, label: 'Past Month' },
                                            { value: '3months' as const, label: 'Past 3 Months' },
                                            { value: 'year' as const, label: 'Past Year' }
                                        ].map(option => (
                                            <TouchableOpacity
                                                key={option.value}
                                                style={{
                                                    padding: 10,
                                                    borderBottomWidth: option.value !== 'year' ? 1 : 0,
                                                    borderBottomColor: Colors.divider
                                                }}
                                                onPress={() => {
                                                    setMuscleAnalysisTimePeriod(option.value);
                                                    setShowMuscleTimeDropdown(false);
                                                }}
                                            >
                                                <Text style={[
                                                    { fontSize: 14, color: '#FFFFFF' },
                                                    muscleAnalysisTimePeriod === option.value && { color: Colors.accent, fontWeight: '600' }
                                                ]}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', marginBottom: 12, backgroundColor: Colors.cardBackground }}>
                                    <TouchableOpacity
                                        style={{ flex: 1, paddingVertical: 10, backgroundColor: activeTab === 'frequent' ? Colors.accent : 'transparent', alignItems: 'center' }}
                                        onPress={() => setActiveTab('frequent')}
                                    >
                                        <Text style={{ color: activeTab === 'frequent' ? Colors.primary : Colors.secondary, fontWeight: '600' }}>Frequently Worked</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{ flex: 1, paddingVertical: 10, backgroundColor: activeTab === 'attention' ? Colors.warning || '#ff9800' : 'transparent', alignItems: 'center' }}
                                        onPress={() => setActiveTab('attention')}
                                    >
                                        <Text style={{ color: activeTab === 'attention' ? Colors.primary : Colors.secondary, fontWeight: '600' }}>Needs Attention</Text>
                                    </TouchableOpacity>

                                </View>
                                {activeTab === 'frequent' ? (
                                    <ScrollView style={{ maxHeight: 220 }}>
                                        {frequentlyWorked.length > 0 ? frequentlyWorked.map(({ muscle, count }) => (
                                            <View key={muscle} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider }}>
                                                <Text style={{ fontSize: 16, color: '#fff', fontWeight: '500' }}>{muscle.charAt(0).toUpperCase() + muscle.slice(1)}</Text>
                                                <Text style={{ fontSize: 16, color: Colors.accent || '#2196f3', fontWeight: '700' }}>{count} sets</Text>
                                            </View>
                                        )) : (
                                            <Text style={{ color: Colors.secondary, textAlign: 'center', marginTop: 16 }}>No sets logged in the last 30 days.</Text>
                                        )}
                                    </ScrollView>
                                ) : (
                                    <ScrollView style={{ maxHeight: 220 }}>
                                        {needsAttention.length > 0 ? needsAttention.map(muscle => (
                                            <View key={muscle} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider }}>
                                                <Text style={{ fontSize: 16, color: '#fff', fontWeight: '600' }}>{muscle}</Text>
                                                <Text style={{ fontSize: 16, color: Colors.warning || '#ff9800', fontWeight: '600' }}>{normalizedMuscleSetCounts[muscle] || 0} sets</Text>
                                            </View>
                                        )) : (
                                            <Text style={{ color: Colors.secondary, textAlign: 'center', marginTop: 16 }}>All muscle groups are being worked well!</Text>
                                        )}
                                    </ScrollView>
                                )}

                                {/* Body Heatmap - Below the tabs within Muscle Groups Analysis */}
                                <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: Colors.divider }}>
                                    <BodyHeatmap
                                        muscleData={bodyHeatmapData}
                                        showLabels={false}
                                    />
                                </View>
                            </View>
                            {/* Exercise Progress Analysis */}
                            <View style={styles.enhancedSection}>
                                <View style={styles.sectionHeaderWithIcon}>
                                    <View style={styles.sectionIconContainer}>
                                        <TrendingUp size={22} color={Colors.accent} />
                                    </View>
                                    <Text style={styles.enhancedSectionTitle}>Exercise Progress Analysis</Text>
                                </View>

                                {/* Exercise Selector */}
                                <View style={styles.dropdownContainer}>
                                    <Text style={styles.dropdownLabel}>Exercise:</Text>
                                    <TouchableOpacity
                                        style={styles.dropdown}
                                        onPress={() => setShowExerciseDropdown(!showExerciseDropdown)}
                                    >
                                        <Text style={styles.dropdownText}>
                                            {selectedExerciseId
                                                ? exercises.find(ex => ex.id === selectedExerciseId)?.name || 'Select Exercise'
                                                : 'Select Exercise'
                                            }
                                        </Text>
                                        <ChevronRight size={20} color={Colors.secondary} />
                                    </TouchableOpacity>

                                    {showExerciseDropdown && (
                                        <View style={styles.dropdownMenu}>
                                            {/* Search Input */}
                                            <View style={styles.searchContainer}>
                                                <Search size={16} color={Colors.secondary} />
                                                <TextInput
                                                    style={styles.searchInput}
                                                    value={exerciseSearchQuery}
                                                    onChangeText={setExerciseSearchQuery}
                                                    placeholder="Search exercises..."
                                                    placeholderTextColor={Colors.secondary}
                                                    autoFocus
                                                />
                                            </View>

                                            <ScrollView style={styles.dropdownScroll}>
                                                {filteredExercises
                                                    .filter(ex => ex.name) // Only show exercises with names
                                                    .slice(0, 200) // Show more exercises with search
                                                    .map((exercise) => (
                                                        <TouchableOpacity
                                                            key={exercise.id}
                                                            style={[
                                                                styles.dropdownItem,
                                                                selectedExerciseId === exercise.id && { backgroundColor: Colors.accent + '20' }
                                                            ]}
                                                            onPress={() => {
                                                                setSelectedExerciseId(exercise.id);
                                                                setShowExerciseDropdown(false);
                                                                setExerciseSearchQuery(''); // Clear search when selected
                                                            }}
                                                        >
                                                            <Text style={[
                                                                styles.dropdownItemText,
                                                                selectedExerciseId === exercise.id && { color: Colors.accent }
                                                            ]}>
                                                                {exercise.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                {filteredExercises.length === 0 && exerciseSearchQuery.trim() && (
                                                    <View style={styles.noResultsContainer}>
                                                        <Text style={styles.noResultsText}>
                                                            No exercises found for "{exerciseSearchQuery}"
                                                        </Text>
                                                    </View>
                                                )}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                {/* Rep Count Selector */}
                                <View style={styles.dropdownContainer}>
                                    <Text style={styles.dropdownLabel}>Rep Count:</Text>
                                    <TouchableOpacity
                                        style={styles.dropdown}
                                        onPress={() => setShowRepDropdown(!showRepDropdown)}
                                    >
                                        <Text style={styles.dropdownText}>{selectedRepCount}+ reps</Text>
                                        <ChevronRight size={20} color={Colors.secondary} />
                                    </TouchableOpacity>

                                    {showRepDropdown && (
                                        <View style={styles.dropdownMenu}>
                                            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 25, 30].map((repCount) => (
                                                    <TouchableOpacity
                                                        key={repCount}
                                                        style={[
                                                            styles.dropdownItem,
                                                            selectedRepCount === repCount && { backgroundColor: Colors.accent + '20' }
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedRepCount(repCount);
                                                            setShowRepDropdown(false);
                                                        }}
                                                    >
                                                        <Text style={[
                                                            styles.dropdownItemText,
                                                            selectedRepCount === repCount && { color: Colors.accent }
                                                        ]}>
                                                            {repCount}+ reps
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                {/* Time Period Selector */}
                                <View style={styles.dropdownContainer}>
                                    <Text style={styles.dropdownLabel}>Time Period:</Text>
                                    <TouchableOpacity
                                        style={styles.dropdown}
                                        onPress={() => setShowTimePeriodDropdown(!showTimePeriodDropdown)}
                                    >
                                        <Text style={styles.dropdownText}>
                                            {selectedTimePeriod === '1week' ? '1 Week' :
                                                selectedTimePeriod === '1month' ? '1 Month' :
                                                    selectedTimePeriod === '3months' ? '3 Months' :
                                                        selectedTimePeriod === '6months' ? '6 Months' : '1 Year'}
                                        </Text>
                                        <ChevronRight size={20} color={Colors.secondary} />
                                    </TouchableOpacity>

                                    {showTimePeriodDropdown && (
                                        <View style={styles.dropdownMenu}>
                                            {[
                                                { value: '1week', label: '1 Week' },
                                                { value: '1month', label: '1 Month' },
                                                { value: '3months', label: '3 Months' },
                                                { value: '6months', label: '6 Months' },
                                                { value: '1year', label: '1 Year' }
                                            ].map((period) => (
                                                <TouchableOpacity
                                                    key={period.value}
                                                    style={[
                                                        styles.dropdownItem,
                                                        selectedTimePeriod === period.value && { backgroundColor: Colors.accent + '20' }
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedTimePeriod(period.value as '1week' | '1month' | '3months' | '6months' | '1year');
                                                        setShowTimePeriodDropdown(false);
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.dropdownItemText,
                                                        selectedTimePeriod === period.value && { color: Colors.accent }
                                                    ]}>
                                                        {period.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Progress Chart */}
                                {exerciseProgressData.length > 0 ? (
                                    <LineChart
                                        data={exerciseProgressData}
                                        labels={exerciseProgressLabels}
                                        dates={exerciseProgressDates}
                                        color={Colors.accent}
                                        label={`Weight (lbs) for ${selectedRepCount}+ reps - Last ${selectedTimePeriod === '1week' ? 'Week' :
                                            selectedTimePeriod === '1month' ? 'Month' :
                                                selectedTimePeriod === '3months' ? '3 Months' :
                                                    selectedTimePeriod === '6months' ? '6 Months' : 'Year'
                                            }`}
                                    />
                                ) : (
                                    <View style={styles.emptyChart}>
                                        <Text style={styles.emptyChartText}>
                                            {selectedExerciseId
                                                ? `No data found for ${exercises.find(ex => ex.id === selectedExerciseId)?.name || 'this exercise'} with ${selectedRepCount}+ reps`
                                                : 'Select an exercise to view progress'
                                            }
                                        </Text>
                                    </View>
                                )}
                            </View>
                            {/* Workout Insights */}
                            <View style={styles.enhancedSection}>
                                <View style={styles.sectionHeaderWithIcon}>
                                    <View style={styles.sectionIconContainer}>
                                        <TrendingUp size={22} color={Colors.accent} />
                                    </View>
                                    <Text style={styles.enhancedSectionTitle}>Workout Insights</Text>

                                    {/* Time Period Filter in top right corner */}
                                    <TouchableOpacity
                                        style={{
                                            marginLeft: 'auto',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: Colors.cardBackground,
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 6,
                                            borderWidth: 1,
                                            borderColor: Colors.divider,
                                            minWidth: 50
                                        }}
                                        onPress={() => setShowWorkoutTimeDropdown(!showWorkoutTimeDropdown)}
                                    >
                                        <Text style={{ fontSize: 12, color: '#FFFFFF', marginRight: 4 }}>
                                            {workoutInsightsTimePeriod === 'week' ? '1W' :
                                                workoutInsightsTimePeriod === 'month' ? '1M' :
                                                    workoutInsightsTimePeriod === '3months' ? '3M' : '1Y'}
                                        </Text>
                                        <ChevronDown size={12} color={Colors.secondary} />
                                    </TouchableOpacity>
                                </View>

                                {showWorkoutTimeDropdown && (
                                    <View style={{
                                        position: 'absolute', top: 35, right: 0,
                                        backgroundColor: Colors.cardBackground, borderRadius: 8, borderWidth: 1,
                                        borderColor: Colors.divider, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 1000, width: 120
                                    }}>
                                        {[
                                            { value: 'week' as const, label: 'Past Week' },
                                            { value: 'month' as const, label: 'Past Month' },
                                            { value: '3months' as const, label: 'Past 3 Months' },
                                            { value: 'year' as const, label: 'Past Year' }
                                        ].map(option => (
                                            <TouchableOpacity
                                                key={option.value}
                                                style={{ padding: 10, borderBottomWidth: option.value !== 'year' ? 1 : 0, borderBottomColor: Colors.divider }}
                                                onPress={() => {
                                                    setWorkoutInsightsTimePeriod(option.value);
                                                    setShowWorkoutTimeDropdown(false);
                                                }}
                                            >
                                                <Text style={[
                                                    { fontSize: 14, color: '#FFFFFF' },
                                                    workoutInsightsTimePeriod === option.value && { color: Colors.accent, fontWeight: '600' }
                                                ]}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <View style={styles.insightsGrid}>
                                    {/* Total Workouts */}
                                    <View style={styles.insightCard}>
                                        <Text style={styles.insightLabel}>Total Workouts</Text>
                                        <Text style={styles.insightValue}>
                                            {(() => {
                                                const getDaysForPeriod = (period: typeof workoutInsightsTimePeriod) => {
                                                    switch (period) {
                                                        case 'week': return 7;
                                                        case 'month': return 30;
                                                        case '3months': return 90;
                                                        case 'year': return 365;
                                                        default: return 30;
                                                    }
                                                };
                                                const days = getDaysForPeriod(workoutInsightsTimePeriod);
                                                const now = new Date();
                                                const timeThreshold = 1000 * 60 * 60 * 24 * days;

                                                return workoutHistory.filter(w =>
                                                    now.getTime() - new Date(w.start_time).getTime() < timeThreshold
                                                ).length;
                                            })()}
                                        </Text>
                                        <Text style={styles.insightSubtext}>
                                            {workoutInsightsTimePeriod === 'week' ? 'this week' :
                                                workoutInsightsTimePeriod === 'month' ? 'this month' :
                                                    workoutInsightsTimePeriod === '3months' ? 'past 3 months' : 'this year'}
                                        </Text>
                                    </View>

                                    {/* Average Duration */}
                                    <View style={styles.insightCard}>
                                        <Text style={styles.insightLabel}>Avg Duration</Text>
                                        <Text style={styles.insightValue}>
                                            {(() => {
                                                const getDaysForPeriod = (period: typeof workoutInsightsTimePeriod) => {
                                                    switch (period) {
                                                        case 'week': return 7;
                                                        case 'month': return 30;
                                                        case '3months': return 90;
                                                        case 'year': return 365;
                                                        default: return 30;
                                                    }
                                                };
                                                const days = getDaysForPeriod(workoutInsightsTimePeriod);
                                                const now = new Date();
                                                const timeThreshold = 1000 * 60 * 60 * 24 * days;

                                                const filteredWorkouts = workoutHistory.filter(w => {
                                                    const withinTime = now.getTime() - new Date(w.start_time).getTime() < timeThreshold;
                                                    return withinTime && w.end_time;
                                                });

                                                if (filteredWorkouts.length === 0) return '0';

                                                const totalMinutes = filteredWorkouts.reduce((sum, w) => {
                                                    const duration = (new Date(w.end_time!).getTime() - new Date(w.start_time).getTime()) / (1000 * 60);
                                                    return sum + duration;
                                                }, 0);

                                                return Math.round(totalMinutes / filteredWorkouts.length);
                                            })()}
                                        </Text>
                                        <Text style={styles.insightSubtext}>minutes</Text>
                                    </View>
                                </View>
                            </View>
                            {/* Progress Photos */}
                            <View style={styles.enhancedSection}>
                                <View style={styles.sectionHeaderWithIcon}>
                                    <View style={styles.sectionIconContainer}>
                                        <ImagesIcon size={22} color={Colors.accent} />
                                    </View>
                                    <Text style={styles.enhancedSectionTitle}>Body Progress Photos</Text>
                                    <TouchableOpacity onPress={() => router.push('/profile/photos')}>
                                        <Text style={styles.seeAllText}>See All</Text>
                                    </TouchableOpacity>
                                </View>
                                {progressPhotos.length > 0 ? (
                                    <View style={styles.photoGrid}>
                                        {progressPhotos.slice(0, 6).map((photo) => (
                                            <TouchableOpacity
                                                key={photo.id}
                                                style={styles.photoContainer}
                                                onPress={() => router.push(`/profile/photos/${photo.id}`)}
                                            >
                                                <Image source={{ uri: photo.photo_url }} style={styles.photo} />
                                                <Text style={styles.photoDate}>
                                                    {new Date(photo.created_at).toLocaleDateString()}
                                                    {photo.weight ? `  |  ${photo.weight} lbs` : ''}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <ImagesIcon size={48} color={Colors.secondary} />
                                        <Text style={styles.emptyStateTitle}>No Progress Photos</Text>
                                        <Text style={styles.emptyStateText}>
                                            Start documenting your transformation by taking your first progress photo.
                                        </Text>
                                        <TouchableOpacity style={styles.emptyStateButton} onPress={() => router.push('/profile/photos')}>
                                            <Camera size={20} color={Colors.primary} />
                                            <Text style={styles.emptyStateButtonText}>Add Photo</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// Simple Bar Chart component (for demonstration, not animated)
function BarChart({ data, labels, color, label }: { data: number[]; labels: string[]; color: string; label: string }) {
    const max = Math.max(...data, 1);
    return (
        <View style={styles.chartContainer}>
            <View style={styles.chartBars}>
                {data.map((value, i) => (
                    <View key={i} style={styles.chartBarWrapper}>
                        <View style={[styles.chartBar, { height: `${(value / max) * 100}%`, backgroundColor: color }]} />
                        <Text style={styles.chartBarLabel}>{labels[i]}</Text>
                    </View>
                ))}
            </View>
            <Text style={styles.chartLabel}>{label}</Text>
        </View>
    );
}

// Interactive Line Chart component for exercise progress tracking
function LineChart({ data, labels, color, label, dates }: {
    data: number[];
    labels: string[];
    color: string;
    label: string;
    dates: Date[];
}) {
    const [selectedPoint, setSelectedPoint] = useState<{ index: number; weight: number; date: Date } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLocked, setIsLocked] = useState(false); // Lock tooltip when tapped on a dot

    // Validate input data
    if (data.length === 0 || dates.length === 0 || data.length !== dates.length) return null;

    // Filter out invalid data points
    const validData = data.filter(value => typeof value === 'number' && !isNaN(value) && isFinite(value));
    if (validData.length === 0) return null;

    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const range = max - min;
    const padding = range * 0.1; // 10% padding above and below
    const chartMin = Math.max(0, min - padding);
    const chartMax = max + padding;
    const chartRange = chartMax - chartMin;

    // Generate y-axis scale values
    const scaleSteps = 5;
    const stepSize = chartRange / scaleSteps;
    const scaleValues = Array.from({ length: scaleSteps + 1 }, (_, i) =>
        Math.round(chartMin + (i * stepSize))
    );

    // Calculate line points
    const chartWidth = CHART_WIDTH - 60; // Leave space for y-axis labels
    const chartHeight = 150;
    const pointSpacing = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

    const points = data.map((value, index) => {
        const x = index * pointSpacing;
        const y = chartRange > 0 ? chartHeight - ((value - chartMin) / chartRange) * chartHeight : chartHeight / 2;
        return {
            x: isNaN(x) ? 0 : x,
            y: isNaN(y) ? chartHeight / 2 : y,
            value,
            date: dates[index]
        };
    });

    // Create smooth SVG path string with validation
    const validPoints = points.filter(point =>
        !isNaN(point.x) && !isNaN(point.y) &&
        isFinite(point.x) && isFinite(point.y)
    );

    const pathData = validPoints.length > 0 ? validPoints.map((point, index) => {
        if (index === 0) {
            return `M ${point.x} ${point.y}`;
        } else {
            return `L ${point.x} ${point.y}`;
        }
    }).join(' ') : `M 0 ${chartHeight / 2}`; // Fallback path

    // Find closest point to touch position with halfway-point snapping
    const findClosestPoint = (touchX: number, touchY?: number) => {
        if (points.length === 0) {
            return { index: 0, weight: 0, date: new Date(), isDirectHit: false };
        }

        if (points.length === 1) {
            return {
                index: 0,
                weight: data[0] || 0,
                date: dates[0] || new Date(),
                isDirectHit: touchY !== undefined ?
                    Math.sqrt(Math.pow(points[0].x - touchX, 2) + Math.pow(points[0].y - touchY, 2)) <= 15 : false
            };
        }

        // First, check for direct hits on dots (within 15px radius for locking)
        if (touchY !== undefined) {
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                const distance = Math.sqrt(
                    Math.pow(point.x - touchX, 2) + Math.pow(point.y - touchY, 2)
                );
                if (distance <= 15) { // 15px hit radius around dots
                    return {
                        index: i,
                        weight: data[i] || 0,
                        date: dates[i] || new Date(),
                        isDirectHit: true
                    };
                }
            }
        }

        // Enhanced halfway-point detection for smooth dragging
        let closestIndex = 0;

        // Handle touch before first point
        if (touchX <= points[0].x) {
            closestIndex = 0;
        }
        // Handle touch after last point
        else if (touchX >= points[points.length - 1].x) {
            closestIndex = points.length - 1;
        }
        // Handle touch between points - use halfway thresholds
        else {
            for (let i = 0; i < points.length - 1; i++) {
                const currentPoint = points[i];
                const nextPoint = points[i + 1];

                // Calculate halfway point between current and next
                const halfwayX = (currentPoint.x + nextPoint.x) / 2;

                // If touch is between current point and halfway to next, use current
                if (touchX >= currentPoint.x && touchX < halfwayX) {
                    closestIndex = i;
                    break;
                }
                // If touch is between halfway and next point, use next
                else if (touchX >= halfwayX && touchX <= nextPoint.x) {
                    closestIndex = i + 1;
                    break;
                }
            }
        }

        return {
            index: closestIndex,
            weight: data[closestIndex] || 0,
            date: dates[closestIndex] || new Date(),
            isDirectHit: false
        };
    };

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: (event) => {
            try {
                const touchX = event.nativeEvent.locationX || 0;
                const touchY = event.nativeEvent.locationY || 0;
                const constrainedX = Math.max(0, Math.min(chartWidth, touchX));

                const closestPoint = findClosestPoint(constrainedX, touchY);
                setSelectedPoint(closestPoint);
                setIsDragging(true);

                // If it's a direct hit on a dot, lock the tooltip
                if (closestPoint.isDirectHit) {
                    setIsLocked(true);
                } else {
                    setIsLocked(false);
                }
            } catch (error) {
                console.log('Error in pan grant:', error);
            }
        },

        onPanResponderMove: (event) => {
            try {
                // Only update if not locked to a specific dot
                if (!isLocked) {
                    const touchX = event.nativeEvent.locationX || 0;
                    const touchY = event.nativeEvent.locationY || 0;
                    const constrainedX = Math.max(0, Math.min(chartWidth, touchX));

                    const closestPoint = findClosestPoint(constrainedX, touchY);
                    setSelectedPoint(closestPoint);
                }
            } catch (error) {
                console.log('Error in pan move:', error);
            }
        },

        onPanResponderRelease: () => {
            try {
                setIsDragging(false);

                // Only auto-dismiss if not locked to a specific dot
                if (!isLocked) {
                    setTimeout(() => {
                        setSelectedPoint(null);
                    }, 2000);
                }
            } catch (error) {
                console.log('Error in pan release:', error);
            }
        },

        onPanResponderTerminationRequest: () => false, // Don't allow termination
        onPanResponderTerminate: () => {
            try {
                setIsDragging(false);
                if (!isLocked) {
                    setSelectedPoint(null);
                }
            } catch (error) {
                console.log('Error in pan terminate:', error);
            }
        },
    });

    // Add a function to clear the locked tooltip when tapping elsewhere
    const clearTooltip = () => {
        if (isLocked) {
            setIsLocked(false);
            setSelectedPoint(null);
        }
    };

    return (
        <TouchableOpacity
            style={styles.lineChartContainer}
            activeOpacity={1}
            onPress={clearTooltip}
        >
            <View style={styles.lineChartContent}>
                {/* Y-axis scale */}
                <View style={styles.yAxisContainer}>
                    {scaleValues.reverse().map((value, index) => (
                        <View key={index} style={styles.yAxisLabel}>
                            <Text style={styles.yAxisText}>{value}</Text>
                        </View>
                    ))}
                </View>

                {/* Chart area */}
                <View
                    style={styles.lineChartArea}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                >
                    {/* Grid lines */}
                    <View style={styles.gridContainer}>
                        {scaleValues.map((_, index) => (
                            <View key={index} style={styles.gridLine} />
                        ))}
                    </View>

                    {/* SVG Line and points */}
                    <Svg
                        width={chartWidth}
                        height={chartHeight}
                        style={styles.svgContainer}
                    >
                        {/* Draw connected line */}
                        <Path
                            d={pathData}
                            stroke={color}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Draw data points */}
                        {points.map((point, index) => (
                            <Circle
                                key={index}
                                cx={point.x}
                                cy={point.y}
                                r="3"
                                fill={color}
                                stroke={Colors.background}
                                strokeWidth="1"
                            />
                        ))}

                        {/* Vertical indicator line when dragging */}
                        {selectedPoint && selectedPoint.index < points.length && points[selectedPoint.index] && isDragging && (
                            <Line
                                x1={points[selectedPoint.index]?.x || 0}
                                y1={0}
                                x2={points[selectedPoint.index]?.x || 0}
                                y2={chartHeight}
                                stroke={Colors.accent}
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                opacity="0.7"
                            />
                        )}
                    </Svg>

                    {/* Interactive overlay for touch handling */}
                    <View
                        style={[styles.touchArea, { width: chartWidth, height: chartHeight }]}
                        {...panResponder.panHandlers}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                    />

                    {/* Weight indicator tooltip */}
                    {selectedPoint && selectedPoint.index < points.length && points[selectedPoint.index] && (
                        <View
                            style={[
                                styles.weightTooltip,
                                isLocked && styles.weightTooltipLocked, // Different style when locked
                                {
                                    left: Math.max(10, Math.min(chartWidth - 80, (points[selectedPoint.index]?.x || 0) - 40)),
                                    top: Math.max(10, (points[selectedPoint.index]?.y || 0) - 60),
                                }
                            ]}
                        >
                            <Text style={styles.tooltipWeight}>{selectedPoint.weight} lbs</Text>
                            <Text style={styles.tooltipDate}>
                                {selectedPoint.date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: selectedPoint.date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                })}
                            </Text>
                        </View>
                    )}

                    {/* X-axis labels */}
                    <View style={styles.xAxisContainer}>
                        {labels.map((labelText, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.xAxisLabel,
                                    { left: (index * pointSpacing) - 20 }
                                ]}
                            >
                                <Text style={styles.xAxisText}>{labelText}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
            <Text style={styles.chartLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        minHeight: '100%', // Ensure full height to prevent shifts
    },
    scroll: {
        flex: 1,
        paddingHorizontal: 24,
        backgroundColor: Colors.background, // Ensure background is set
    },
    headerTitle: {
        fontSize: FontSizes.screenTitle,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
        marginTop: 16,
        marginBottom: 24,
        fontFamily: 'Inter-Bold',
    },
    section: {
        marginBottom: 32,
    },
    enhancedSection: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 8,
        marginHorizontal: 2,
        marginBottom: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionHeaderWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    sectionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.accent + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    enhancedSectionTitle: {
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
        flex: 1,
    },
    sectionTitle: {
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
        marginBottom: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAllText: {
        color: Colors.accent,
        fontWeight: FontWeights.medium,
        fontSize: FontSizes.body,
    },
    chartContainer: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        alignItems: 'center',
    },
    chartBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 120,
        width: CHART_WIDTH,
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    chartBarWrapper: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 2,
    },
    chartBar: {
        width: 18,
        borderRadius: 8,
        marginBottom: 4,
    },
    chartBarLabel: {
        fontSize: 10,
        color: Colors.secondary,
        textAlign: 'center',
        maxWidth: 40,
    },
    chartLabel: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        marginTop: 4,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    photoContainer: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE + 24,
        marginBottom: 12,
        alignItems: 'center',
    },
    photo: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        borderRadius: 12,
        marginBottom: 4,
    },
    photoDate: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 16,
        backgroundColor: Colors.cardBackground,
        borderRadius: 16,
        padding: 24,
    },
    emptyStateTitle: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
        marginTop: 12,
        marginBottom: 4,
    },
    emptyStateText: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        textAlign: 'center',
        marginBottom: 12,
    },
    emptyStateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.accent,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginTop: 8,
    },
    emptyStateButtonText: {
        color: Colors.primary,
        fontWeight: FontWeights.medium,
        fontSize: FontSizes.body,
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        fontWeight: FontWeights.medium,
    },
    dropdownContainer: {
        marginBottom: 16,
    },
    dropdownLabel: {
        fontSize: FontSizes.body,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
        marginBottom: 8,
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Colors.divider,
    },
    dropdownText: {
        fontSize: FontSizes.body,
        color: Colors.primary,
        flex: 1,
    },
    dropdownMenu: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.divider,
        maxHeight: 300,
        overflow: 'hidden',
    },
    dropdownScroll: {
        maxHeight: 240,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.background,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSizes.body,
        color: Colors.primary,
        marginLeft: 8,
        paddingVertical: 4,
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    dropdownItemText: {
        fontSize: FontSizes.body,
        color: Colors.primary,
    },
    emptyChart: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    emptyChartText: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    noResultsContainer: {
        padding: 20,
        alignItems: 'center',
    },
    noResultsText: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    // Line Chart Styles
    lineChartContainer: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        alignItems: 'center',
    },
    lineChartContent: {
        flexDirection: 'row',
        width: CHART_WIDTH,
        height: 180,
    },
    yAxisContainer: {
        width: 50,
        height: 150,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingRight: 10,
    },
    yAxisLabel: {
        height: 25,
        justifyContent: 'center',
    },
    yAxisText: {
        fontSize: 10,
        color: Colors.secondary,
        textAlign: 'right',
    },
    lineChartArea: {
        flex: 1,
        height: 150,
        position: 'relative',
    },
    gridContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 150,
        justifyContent: 'space-between',
    },
    gridLine: {
        height: 1,
        backgroundColor: Colors.divider,
        opacity: 0.3,
    },
    svgContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    touchArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    weightTooltip: {
        position: 'absolute',
        backgroundColor: Colors.accent,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        zIndex: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    weightTooltipLocked: {
        backgroundColor: Colors.primary,
        borderWidth: 2,
        borderColor: Colors.accent,
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 8,
    },
    tooltipWeight: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.background,
        marginBottom: 2,
    },
    tooltipDate: {
        fontSize: 12,
        color: Colors.background,
        opacity: 0.9,
    },
    xAxisContainer: {
        position: 'absolute',
        bottom: -25,
        left: 0,
        right: 0,
        height: 20,
    },
    xAxisLabel: {
        position: 'absolute',
        width: 40,
        alignItems: 'center',
    },
    xAxisText: {
        fontSize: 9,
        color: Colors.secondary,
        textAlign: 'center',
    },
    // New Insights Grid Styles
    insightsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    insightCard: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: 20,
        width: '48%',
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.divider,
    },
    insightLabel: {
        fontSize: 12,
        color: Colors.secondary,
        marginBottom: 4,
        textAlign: 'center',
    },
    insightValue: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.accent,
        marginBottom: 2,
    },
    insightSubtext: {
        fontSize: 11,
        color: Colors.secondary,
        textAlign: 'center',
    },
}); 