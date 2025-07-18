import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProgressStore } from '@/store/progressStore';
import { BarChart3, Camera, Images as ImagesIcon, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import BodyMap from '@/components/BodyMap';

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

export default function StatsScreen() {
    const { workoutHistory, loadWorkoutHistory } = useWorkoutStore();
    const { progressPhotos, loadProgressPhotos } = useProgressStore();
    const [heaviestData, setHeaviestData] = useState<number[]>([]);
    const [heaviestLabels, setHeaviestLabels] = useState<string[]>([]);
    const [freqData, setFreqData] = useState<number[]>([]);
    const [freqLabels, setFreqLabels] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'frequent' | 'attention'>('frequent');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Load workout history and progress photos when component mounts
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    loadWorkoutHistory(),
                    loadProgressPhotos()
                ]);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [loadWorkoutHistory, loadProgressPhotos]);

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
        // Only consider workouts from the last 30 days
        const now = new Date();
        const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
        const recentWorkouts = workoutHistory.filter(w => now.getTime() - new Date(w.start_time).getTime() < THIRTY_DAYS);
        const counts: Record<string, number> = {};
        for (const workout of recentWorkouts) {
            for (const ex of workout.exercises) {
                const sets = ex.sets?.length || 0;
                const primary = ex.exercise.primaryMuscles || [];
                const secondary = ex.exercise.secondaryMuscles || [];
                for (const muscle of primary) {
                    counts[muscle] = (counts[muscle] || 0) + sets;
                }
                for (const muscle of secondary) {
                    counts[muscle] = (counts[muscle] || 0) + Math.round(sets / 2); // secondary: half credit
                }
            }
        }
        return counts;
    }, [workoutHistory]);

    // --- Needs Attention logic ---
    const allPossibleMuscles = useMemo(() => [
        'Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 'Abs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Forearms', 'Traps', 'Lats', 'Adductors', 'Abductors', 'Deltoids', 'Rectus Abdominis', 'Latissimus Dorsi', 'Pectoralis Major', 'Trapezius'
    ], []);
    const avgSets = useMemo(() => {
        const vals = Object.values(muscleSetCounts).filter(v => v > 0);
        if (vals.length === 0) return 0;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    }, [muscleSetCounts]);
    const needsAttention = useMemo(() => {
        return allPossibleMuscles.filter(muscle => {
            const count = muscleSetCounts[muscle] || muscleSetCounts[muscle.toLowerCase()] || 0;
            return count === 0 || (avgSets > 0 && count < avgSets * 0.5);
        });
    }, [muscleSetCounts, avgSets, allPossibleMuscles]);

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
        // Heaviest set per workout (last 7)
        const last7 = workoutHistory.slice(0, 7).reverse();
        setHeaviestLabels(last7.map(w => new Date(w.start_time).toLocaleDateString()));
        setHeaviestData(last7.map(getHeaviestSet));
        // Workout frequency (last 4 weeks)
        setFreqData(getWorkoutFrequency(workoutHistory));
        const now = new Date();
        setFreqLabels([
            ...Array(4).keys()
        ].map(i => {
            const d = new Date(now.getTime() - (3 - i) * 7 * 24 * 60 * 60 * 1000);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        }));
    }, [workoutHistory]);

    // For 'Frequently Worked', show all muscle groups sorted by set count
    const frequentlyWorked = useMemo(() => {
        return Object.entries(muscleSetCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([muscle, count]) => ({ muscle, count }));
    }, [muscleSetCounts]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.accent]}
                        tintColor={Colors.accent}
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
                        {/* Swipeable Tabs for Muscle Groups */}
                        <View style={[styles.section, { marginBottom: 0 }]}>
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
                                            <Text style={{ fontSize: 16, color: Colors.warning || '#ff9800', fontWeight: '600' }}>{muscleSetCounts[muscle] || muscleSetCounts[muscle.toLowerCase()] || 0} sets</Text>
                                        </View>
                                    )) : (
                                        <Text style={{ color: Colors.secondary, textAlign: 'center', marginTop: 16 }}>All muscle groups are being worked well!</Text>
                                    )}
                                </ScrollView>
                            )}
                        </View>
                        {/* Heaviest Set Chart */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Heaviest Set (Last 7 Workouts)</Text>
                            <BarChart
                                data={heaviestData}
                                labels={heaviestLabels}
                                color={Colors.accent}
                                label="Heaviest Set (lbs)"
                            />
                        </View>
                        {/* Workout Frequency Chart */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Workout Frequency (Last 4 Weeks)</Text>
                            <BarChart
                                data={freqData}
                                labels={freqLabels}
                                color={Colors.primary}
                                label="Workouts per Week"
                            />
                        </View>
                        {/* Progress Photos */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Body Progress Photos</Text>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scroll: {
        flex: 1,
        paddingHorizontal: 24,
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
}); 