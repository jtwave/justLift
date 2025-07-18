import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useSocialStore } from '@/store/socialStore';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationStore } from '@/store/notificationStore';
import { router, useFocusEffect } from 'expo-router';
import {
  Settings,
  User,
  ChevronRight,
  Users,
  UserPlus,
  Dumbbell,
  BarChart3,
  Bell
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { following, followers, loadFollowing, loadFollowers } = useSocialStore();
  const { getUnreadCount, loadNotifications } = useNotificationStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load profile when screen comes into focus, but only if we don't have data
  useFocusEffect(
    React.useCallback(() => {
      if (!profile || !initialLoad) {
        loadProfile();
      }
      // Always refresh notifications when screen comes into focus
      loadNotifications();
    }, [profile, initialLoad])
  );

  // Initial load when component mounts
  useEffect(() => {
    loadProfile();
    loadNotifications();
  }, []);

  // Update unread count when notifications change
  useEffect(() => {
    setUnreadCount(getUnreadCount());
  }, [getUnreadCount]);

  // Load social data when profile loads, but don't block UI
  useEffect(() => {
    if (profile?.id) {
      // Load social data in background without blocking UI
      Promise.all([
        loadFollowing(profile.id),
        loadFollowers(profile.id)
      ]).catch(console.error);
    }
  }, [profile?.id]);

  const loadProfile = async () => {
    // Only show loading spinner on initial load
    if (initialLoad) {
      setLoading(true);
    }

    try {

      // Get the current user from Supabase auth directly
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        console.log('No user found:', userError);
        return;
      }

      //console.log('Current user ID:', currentUser.id);

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      //console.log('Profile data loaded:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleSignOut = async () => {
    console.log('Sign out button pressed');
    try {
      console.log('Confirming sign out...');
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
        Alert.alert('Error', error.message);
      } else {
        console.log('Sign out successful');
        // The auth state change will automatically redirect to login
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Show loading spinner only on initial load
  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get display values with fallbacks - show immediately even if some data is missing
  const displayName = profile?.username || profile?.full_name || user?.user_metadata?.username || 'Lifter';
  const displayEmail = user?.email || '';
  const displayBio = profile?.bio || null;
  const displayAvatar = profile?.avatar_url || null;
  const displayUsername = profile?.username || null;
  const followersCount = profile?.followers_count || 0;
  const followingCount = profile?.following_count || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => router.push('/profile/edit')}
          >
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={32} color={Colors.accent} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>
            {displayName}
          </Text>
          {displayUsername && (
            <Text style={styles.profileUsername}>
              @{displayUsername}
            </Text>
          )}
          <Text style={styles.profileSubtitle}>
            {displayEmail}
          </Text>
          {displayBio && (
            <Text style={styles.profileBio}>
              {displayBio}
            </Text>
          )}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push('/profile/edit')}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Social Stats - Show immediately with current values */}
          <View style={styles.socialStats}>
            <TouchableOpacity
              style={styles.socialStat}
              onPress={() => router.push('/profile/followers')}
            >
              <Text style={styles.socialStatNumber}>{followersCount}</Text>
              <Text style={styles.socialStatLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialStat}
              onPress={() => router.push('/profile/following')}
            >
              <Text style={styles.socialStatNumber}>{followingCount}</Text>
              <Text style={styles.socialStatLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>

          {/* Find Friends */}
          <TouchableOpacity
            style={styles.dashboardCard}
            onPress={() => router.push('/search')}
          >
            <View style={styles.dashboardCardLeft}>
              <UserPlus size={24} color={Colors.accent} />
              <View style={styles.dashboardCardInfo}>
                <Text style={styles.dashboardCardTitle}>Find Friends</Text>
                <Text style={styles.dashboardCardSubtitle}>
                  Search for people to follow
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.secondary} />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            style={styles.dashboardCard}
            onPress={() => router.push('/notifications')}
          >
            <View style={styles.dashboardCardLeft}>
              <View style={styles.notificationIconContainer}>
                <Bell size={24} color={Colors.accent} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.dashboardCardInfo}>
                <Text style={styles.dashboardCardTitle}>Notifications</Text>
                <Text style={styles.dashboardCardSubtitle}>
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                    : 'No new notifications'
                  }
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.secondary} />
          </TouchableOpacity>

          {/* My Workouts */}
          <TouchableOpacity
            style={styles.dashboardCard}
            onPress={() => router.push('/profile/workouts')}
          >
            <View style={styles.dashboardCardLeft}>
              <Dumbbell size={24} color={Colors.accent} />
              <View style={styles.dashboardCardInfo}>
                <Text style={styles.dashboardCardTitle}>My Workouts</Text>
                <Text style={styles.dashboardCardSubtitle}>
                  View your workout history and progress
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.secondary} />
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity
            style={styles.dashboardCard}
            onPress={() => router.push('/profile/settings')}
          >
            <View style={styles.dashboardCardLeft}>
              <Settings size={24} color={Colors.accent} />
              <View style={styles.dashboardCardInfo}>
                <Text style={styles.dashboardCardTitle}>Settings</Text>
                <Text style={styles.dashboardCardSubtitle}>
                  App preferences and account settings
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.signOutCard]}
            onPress={handleSignOut}
          >
            <View style={styles.dashboardCardLeft}>
              <User size={24} color={Colors.error} />
              <View style={styles.dashboardCardInfo}>
                <Text style={[styles.dashboardCardTitle, { color: Colors.error }]}>Sign Out</Text>
                <Text style={styles.dashboardCardSubtitle}>
                  Sign out of your account
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>
        {/* Add bottom padding so Sign Out is not blocked by tab bar */}
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: FontSizes.body,
    color: Colors.accent,
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 16,
  },
  profileBio: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  editProfileButton: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editProfileText: {
    fontSize: FontSizes.body,
    color: Colors.accent,
    fontWeight: FontWeights.medium,
  },
  socialStats: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 16,
  },
  socialStat: {
    alignItems: 'center',
  },
  socialStatNumber: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  socialStatLabel: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 16,
  },
  dashboardCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  dashboardCardInfo: {
    flex: 1,
  },
  dashboardCardTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 4,
  },
  dashboardCardSubtitle: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  signOutCard: {
    borderColor: Colors.error + '20',
    borderWidth: 1,
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.background,
  },
  notificationBadgeText: {
    color: Colors.background,
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.bold,
  },
});