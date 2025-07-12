import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useProgressStore } from '@/store/progressStore';
import { router } from 'expo-router';
import { ArrowLeft, Camera, Plus, Images as ImagesIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 72) / 3; // 3 photos per row with padding

export default function ProgressPhotosScreen() {
  const { progressPhotos, loadProgressPhotos, addProgressPhoto, deleteProgressPhoto } = useProgressStore();
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    loadProgressPhotos();
  }, [loadProgressPhotos]);

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take progress photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await addProgressPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSelectFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await addProgressPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handlePhotoPress = (photoId: string) => {
    if (compareMode) {
      if (selectedPhotos.includes(photoId)) {
        setSelectedPhotos(selectedPhotos.filter(id => id !== photoId));
      } else if (selectedPhotos.length < 2) {
        setSelectedPhotos([...selectedPhotos, photoId]);
      }
    } else {
      // Open full screen view
      router.push(`/profile/photos/${photoId}`);
    }
  };

  const handleCompareToggle = () => {
    setCompareMode(!compareMode);
    setSelectedPhotos([]);
  };

  const handleCompareView = () => {
    if (selectedPhotos.length === 2) {
      router.push(`/profile/photos/compare?photos=${selectedPhotos.join(',')}`);
    }
  };

  const showAddPhotoOptions = () => {
    Alert.alert(
      'Add Progress Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handleSelectFromLibrary },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Photos</Text>
        <TouchableOpacity onPress={showAddPhotoOptions} style={styles.addButton}>
          <Plus size={24} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {progressPhotos.length > 0 ? (
          <>
            {/* Compare Mode Toggle */}
            <View style={styles.section}>
              <View style={styles.compareHeader}>
                <TouchableOpacity
                  style={[styles.compareButton, compareMode && styles.compareButtonActive]}
                  onPress={handleCompareToggle}
                >
                  <Text style={[styles.compareButtonText, compareMode && styles.compareButtonTextActive]}>
                    {compareMode ? 'Exit Compare' : 'Compare Mode'}
                  </Text>
                </TouchableOpacity>
                
                {compareMode && selectedPhotos.length === 2 && (
                  <TouchableOpacity
                    style={styles.viewCompareButton}
                    onPress={handleCompareView}
                  >
                    <Text style={styles.viewCompareButtonText}>View Comparison</Text>
                  </TouchableOpacity>
                )}
              </View>

              {compareMode && (
                <Text style={styles.compareInstructions}>
                  Select 2 photos to compare side by side
                </Text>
              )}
            </View>

            {/* Photo Grid */}
            <View style={styles.photoGrid}>
              {progressPhotos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={[
                    styles.photoContainer,
                    compareMode && selectedPhotos.includes(photo.id) && styles.selectedPhoto
                  ]}
                  onPress={() => handlePhotoPress(photo.id)}
                >
                  <Image source={{ uri: photo.photo_url }} style={styles.photo} />
                  <Text style={styles.photoDate}>
                    {new Date(photo.created_at).toLocaleDateString()}
                  </Text>
                  {compareMode && selectedPhotos.includes(photo.id) && (
                    <View style={styles.selectionIndicator}>
                      <Text style={styles.selectionNumber}>
                        {selectedPhotos.indexOf(photo.id) + 1}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <ImagesIcon size={64} color={Colors.secondary} />
            <Text style={styles.emptyStateTitle}>No Progress Photos</Text>
            <Text style={styles.emptyStateText}>
              Start documenting your transformation by taking your first progress photo.
            </Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={showAddPhotoOptions}>
              <Camera size={20} color={Colors.primary} />
              <Text style={styles.emptyStateButtonText}>Take First Photo</Text>
            </TouchableOpacity>
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
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    paddingVertical: 24,
  },
  compareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compareButton: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  compareButtonActive: {
    backgroundColor: Colors.accent,
  },
  compareButtonText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
  compareButtonTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  viewCompareButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewCompareButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  compareInstructions: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    textAlign: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    position: 'relative',
  },
  selectedPhoto: {
    borderWidth: 3,
    borderColor: Colors.accent,
    borderRadius: 8,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.33, // 3:4 aspect ratio
    borderRadius: 8,
  },
  photoDate: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionNumber: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
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