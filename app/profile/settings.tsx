import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationStore } from '@/store/notificationStore';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Timer,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  Volume2,
  MessageCircle,
  Heart,
  TrendingUp,
  UserPlus
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REST_TIME_OPTIONS = [30, 45, 60, 90, 120, 180, 300];
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { preferences, loadPreferences, updatePreferences } = useNotificationStore();

  // Notification Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);


  useEffect(() => {
    loadSettings();
    loadPreferences();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.multiGet([
        'soundEnabled',
        'vibrationEnabled',
        'pushNotifications'
      ]);

      settings.forEach(([key, value]) => {
        if (value !== null) {
          switch (key) {
            case 'soundEnabled':
              setSoundEnabled(JSON.parse(value));
              break;
            case 'vibrationEnabled':
              setVibrationEnabled(JSON.parse(value));
              break;
            case 'pushNotifications':
              setPushNotifications(JSON.parse(value));
              break;
          }
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving setting:', error);
      Alert.alert('Error', 'Failed to save setting');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const handleNotificationPreferenceChange = async (key: string, value: boolean) => {
    if (!preferences) return;

    const updatedPreferences = { [key]: value };
    await updatePreferences(updatedPreferences);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Social Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Social Notifications</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIcon}>
                <MessageCircle size={16} color={Colors.accent} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Comments</Text>
                <Text style={styles.settingDescription}>
                  When someone comments on your posts
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.comments_enabled ?? true}
              onValueChange={(value) => handleNotificationPreferenceChange('comments_enabled', value)}
              trackColor={{ false: Colors.divider, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIcon}>
                <Heart size={16} color={Colors.error} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Likes</Text>
                <Text style={styles.settingDescription}>
                  When someone likes your posts
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.likes_enabled ?? true}
              onValueChange={(value) => handleNotificationPreferenceChange('likes_enabled', value)}
              trackColor={{ false: Colors.divider, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIcon}>
                <TrendingUp size={16} color={Colors.accent} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>New Posts</Text>
                <Text style={styles.settingDescription}>
                  When people you follow post workouts
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.new_posts_enabled ?? true}
              onValueChange={(value) => handleNotificationPreferenceChange('new_posts_enabled', value)}
              trackColor={{ false: Colors.divider, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIcon}>
                <UserPlus size={16} color={Colors.accent} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>New Followers</Text>
                <Text style={styles.settingDescription}>
                  When someone starts following you
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.follows_enabled ?? true}
              onValueChange={(value) => handleNotificationPreferenceChange('follows_enabled', value)}
              trackColor={{ false: Colors.divider, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>
        </View>

        {/* App Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>App Notifications</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications on your device
              </Text>
            </View>
            <Switch
              value={preferences?.push_enabled ?? true}
              onValueChange={(value) => handleNotificationPreferenceChange('push_enabled', value)}
              trackColor={{ false: Colors.divider, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Volume2 size={20} color={Colors.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Sound Alerts</Text>
                <Text style={styles.settingDescription}>
                  Play sound when rest timer completes
                </Text>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={(value) => {
                setSoundEnabled(value);
                saveSetting('soundEnabled', value);
              }}
              trackColor={{ false: Colors.divider, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Text style={styles.settingDescription}>
                Vibrate when rest timer completes
              </Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={(value) => {
                setVibrationEnabled(value);
                saveSetting('vibrationEnabled', value);
              }}
              trackColor={{ false: Colors.divider, true: Colors.accent }}
              thumbColor={Colors.primary}
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
            <View style={styles.settingLeft}>
              <LogOut size={20} color={Colors.error} />
              <Text style={[styles.settingText, { color: Colors.error }]}>Sign Out</Text>
            </View>
            <ChevronRight size={20} color={Colors.secondary} />
          </TouchableOpacity>
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
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    lineHeight: 18,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});