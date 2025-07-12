import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { ArrowLeft, Camera, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState({ username: '', bio: '', avatarUrl: null });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Check if there are any changes
    const changes = 
      username !== originalData.username ||
      bio !== originalData.bio ||
      avatarUrl !== originalData.avatarUrl;
    setHasChanges(changes);
  }, [username, bio, avatarUrl, originalData]);

  // Clear error message when username changes
  const handleUsernameChange = (text: string) => {
    const cleanText = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleanText);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const loadProfile = async () => {
    try {
      // Get the current user from Supabase auth
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.error('User authentication error:', userError);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      const userUsername = profile?.username || currentUser.user_metadata?.username || '';
      const avatar = profile?.avatar_url || null;
      const userBio = profile?.bio || '';

      setUsername(userUsername);
      setAvatarUrl(avatar);
      setBio(userBio);
      
      // Store original data for comparison
      setOriginalData({
        username: userUsername,
        bio: userBio,
        avatarUrl: avatar
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleChangePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Camera not available', 'Camera functionality is not available on web. Please use the mobile app.');
      return;
    }

    Alert.alert(
      'Change Profile Picture',
      'Choose how you want to update your profile picture',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handleSelectFromLibrary },
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUrl(result.assets[0].uri);
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
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleSave = async () => {
    setErrorMessage('');
    
    if (!hasChanges) {
      router.back();
      return;
    }

    try {
      setLoading(true);
      
      // Get the current user from Supabase auth
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.error('User authentication error:', userError);
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      console.log('Saving profile with data:', {
        id: currentUser.id,
        email: currentUser.email,
        username: username.trim() || null,
        avatar_url: avatarUrl,
      });

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          email: currentUser.email!,
          username: username.trim() || null,
          full_name: username.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Supabase error:', error);
        
        // Handle specific error for duplicate username
        if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
          setErrorMessage('This username is already taken. Please choose another one.');
          return;
        }
        
        throw error;
      }

      console.log('Profile updated successfully');
      // Navigate back smoothly
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      const message = (error as Error).message;
      if (message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        setErrorMessage('This username is already taken. Please choose another one.');
      } else {
        setErrorMessage(`Failed to update profile: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={[
            styles.saveButton, 
            loading && styles.saveButtonDisabled,
            hasChanges && styles.saveButtonActive
          ]}
        >
          <Text style={[
            styles.saveButtonText, 
            loading && styles.saveButtonTextDisabled,
            hasChanges && styles.saveButtonTextActive
          ]}>
            {loading ? 'Saving...' : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Picture */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleChangePhoto}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={40} color={Colors.secondary} />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Camera size={16} color={Colors.primary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleChangePhoto}>
              <Text style={styles.changePhotoText}>Change Picture</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Data */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Public profile data</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="Your username"
                  placeholderTextColor={Colors.secondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  returnKeyType="next"
                />
              </View>
              <Text style={styles.inputHint}>
                Letters, numbers, and underscores only
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bio</Text>
              <View style={[styles.inputWrapper, styles.bioInputWrapper]}>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Describe yourself"
                  placeholderTextColor={Colors.secondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  saveButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonActive: {
    backgroundColor: Colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.secondary,
  },
  saveButtonTextActive: {
    color: Colors.primary,
  },
  saveButtonTextDisabled: {
    color: Colors.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    fontSize: FontSizes.body,
    color: Colors.accent,
    fontWeight: FontWeights.medium,
  },
  section: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  bioInputWrapper: {
    minHeight: 100,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: FontSizes.body,
    color: Colors.primary,
    minHeight: 44,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomPadding: {
    height: 100,
  },
  inputHint: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: FontSizes.body,
    color: '#EF4444',
  },
});