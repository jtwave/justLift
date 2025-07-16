import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProgressStore } from '@/store/progressStore';
import { BarChart3, Camera, Images as ImagesIcon, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;
const PHOTO_SIZE = (width - 72) / 3;

export default function StatsScreen() {
    const { workoutHistory } = useWorkoutStore();
    const { progressPhotos } = useProgressStore();
    const [volumeData, setVolumeData] = useState<number[]>([]);
    const [setsData, setSetsData] = useState<number[]>([]);
    const [labels, setLabels] = useState<string[]>([]);

    useEffect(() => {
        // Prepare data for the last 7 workouts
        const last7 = workoutHistory.slice(0, 7).reverse();
        setLabels(last7.map(w => new Date(w.start_time).toLocaleDateString()));
        setVolumeData(last7.map(w => {
            if (!w.exercises) return 0;
            return w.exercises.reduce((total: number, ex: any) =>
                total + (ex.sets ? ex.sets.reduce((s: number, set: any) => s + ((set.weight || 0) * (set.reps || 0)), 0) : 0), 0);
        }));
        setSetsData(last7.map(w => {
            if (!w.exercises) return 0;
            return w.exercises.reduce((total: number, ex: any) =>
                total + (ex.sets ? ex.sets.length : 0), 0);
        }));
    }, [workoutHistory]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.headerTitle}>Your Statistics</Text>
                {/* Workout Volume Chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Workout Volume (Last 7 Workouts)</Text>
                    <BarChart
                        data={volumeData}
                        labels={labels}
                        color={Colors.accent}
                        label="Volume (lbs)"
                    />
                </View>
                {/* Sets Chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Total Sets (Last 7 Workouts)</Text>
                    <BarChart
                        data={setsData}
                        labels={labels}
                        color={Colors.primary}
                        label="Sets"
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
}); 