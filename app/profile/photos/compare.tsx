import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProgressStore } from '@/store/progressStore';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';

const { width } = Dimensions.get('window');

export default function ComparePhotosScreen() {
    const router = useRouter();
    const { photos } = useLocalSearchParams();
    const { progressPhotos } = useProgressStore();

    // Parse photo IDs from query param
    const photoIds = useMemo(() => {
        if (!photos) return [];
        if (Array.isArray(photos)) return photos;
        return photos.split(',');
    }, [photos]);

    const selectedPhotos = progressPhotos.filter(p => photoIds.includes(p.id));

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Compare Photos</Text>
                <View style={{ width: 32 }} />
            </View>
            <View style={styles.compareRow}>
                {selectedPhotos.map((photo) => (
                    <View key={photo.id} style={styles.photoCol}>
                        <Image source={{ uri: photo.photo_url }} style={styles.photo} />
                        <Text style={styles.photoDate}>{new Date(photo.created_at).toLocaleDateString()}</Text>
                        {photo.weight && (
                            <Text style={styles.photoWeight}>{photo.weight} lbs</Text>
                        )}
                    </View>
                ))}
            </View>
        </SafeAreaView>
    );
}

const PHOTO_WIDTH = (width - 72) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    compareRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 32,
        paddingHorizontal: 24,
    },
    photoCol: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    photo: {
        width: PHOTO_WIDTH,
        height: PHOTO_WIDTH * 1.33,
        borderRadius: 12,
        marginBottom: 12,
    },
    photoDate: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        marginBottom: 2,
    },
    photoWeight: {
        fontSize: FontSizes.body,
        color: Colors.accent,
        fontWeight: FontWeights.bold,
    },
}); 