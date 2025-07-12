import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useSocialStore } from '@/store/socialStore';
import { useAuth } from '@/hooks/useAuth';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  ArrowLeft, 
  User, 
  UserPlus, 
  UserCheck, 
  Users,
  Dumbbell,
  Calendar,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

interface PostMediaItem {
  type: 'media' | 'workout';
  data?: any;
}

const WorkoutPostCard = ({ post }: { post: any }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const formatWorkoutDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatWorkoutDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'In progress';
    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));
    return `${duration} min`;
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

  // Create swipeable items array
  const swipeableItems: PostMediaItem[] = [];
  
  // Add media if present
  if (post.media_url) {
    swipeableItems.push({
      type: 'media',
      data: {
        url: post.media_url,
        type: post.media_type
      }
    });
  }
  
  // Always add workout details as the last item
  swipeableItems.push({
    type: 'workout',
    data: post.workout
  });

  const renderSwipeableItem = ({ item, index }: { item: PostMediaItem; index: number }) => {
    if (item.type === 'media') {
      return (
        <View style={styles.mediaContainer}>
          {item.data.type === 'photo' ? (
            <Image 
              source={{ uri: item.data.url }} 
              style={styles.workoutMedia}
              resizeMode="cover"
              cache="force-cache"
            />
          ) : (
            <Image 
              source={{ uri: item.data.url }} 
              style={styles.workoutMedia}
              resizeMode="cover"
              cache="force-cache"
            />
          )}
        </View>
      );
    }

    // Workout details
    return (
      <View style={styles.workoutDetailsContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.workoutStats}>
            <View style={styles.statItem}>
              <Calendar size={16} color={Colors.accent} />
              <Text style={styles.statText}>
                {formatWorkoutDuration(post.workout.start_time, post.workout.end_time)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Dumbbell size={16} color={Colors.accent} />
              <Text style={styles.statText}>
                {post.workout.exercises.length} exercises
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statText}>
                {getTotalSets(post.workout.exercises)} sets
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statText}>
                {Math.round(getTotalVolume(post.workout.exercises) / 1000)}K lbs
              </Text>
            </View>
          </View>

          {/* Exercise Preview */}
          <View style={styles.exercisePreview}>
            {post.workout.exercises.map((exercise: any, index: number) => (
              <View key={index} style={styles.exerciseDetailItem}>
                <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
                <View style={styles.exerciseSets}>
                  {exercise.sets.filter((set: any) => set.completed).map((set: any, setIndex: number) => (
                    <Text key={setIndex} style={styles.setInfo}>
                      {set.weight} lbs × {set.reps}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.workoutCard}>
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutName}>{post.workout.name}</Text>
        <Text style={styles.workoutDate}>
          {formatWorkoutDate(post.created_at)}
        </Text>
      </View>

      {/* Swipeable Content */}
      <View style={styles.swipeableContainer}>
        <FlatList
          data={swipeableItems}
          renderItem={renderSwipeableItem}
          keyExtractor={(item, index) => `${post.id}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / (width - 48));
            setCurrentIndex(newIndex);
          }}
          style={styles.swipeableList}
        />
        
        {/* Page Indicators */}
        {swipeableItems.length > 1 && (
          <View style={styles.pageIndicators}>
            {swipeableItems.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  currentIndex === index && styles.activePageIndicator
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {post.caption && (
        <View style={styles.captionSection}>
          <Text style={styles.workoutCaption}>{post.caption}</Text>
        </View>
      )}
    </View>
  );
};

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { 
    following, 
    followers, 
    loadFollowing, 
    loadFollowers, 
    followUser, 
    unfollowUser 
  } = useSocialStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (username) {
      loadUserProfile();
    }
  }, [username]);

  useEffect(() => {
    if (profile?.id && currentUser?.id) {
      loadFollowing(currentUser.id);
      loadFollowers(profile.id);
      checkFollowStatus();
    }
  }, [profile?.id, currentUser?.id]);

  useEffect(() => {
    // Update follow status when following list changes
    if (profile?.id) {
      const isUserFollowing = following.some(follow => follow.following_id === profile.id);
      setIsFollowing(isUserFollowing);
    }
  }, [following, profile?.id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get user profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        Alert.alert('Error', 'User not found');
        router.back();
        return;
      }

      setProfile(profileData);
      setFollowersCount(profileData.followers_count || 0);
      setFollowingCount(profileData.following_count || 0);

      // Load user's workout posts
      const { data: posts, error: postsError } = await supabase
        .from('workout_posts')
        .select(`
          *,
          workout:workouts(
            id,
            name,
            start_time,
            end_time,
            workout_exercises(
              exercise:exercises(name, category),
              workout_sets(weight, reps, completed)
            )
          )
        `)
        .eq('user_id', profileData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (postsError) {
        console.error('Error loading posts:', postsError);
      } else {
        const formattedPosts = posts?.map(post => ({
          ...post,
          workout: {
            ...post.workout,
            exercises: post.workout.workout_exercises.map((we: any) => ({
              exercise: we.exercise,
              sets: we.workout_sets
            }))
          }
        })) || [];
        setUserPosts(formattedPosts);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser?.id || !profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)
        .limit(1);

      if (error) {
        console.error('Error checking follow status:', error);
        return;
      }

      setIsFollowing(data.length > 0);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile?.id) return;

    try {
      if (isFollowing) {
        await unfollowUser(profile.id);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await followUser(profile.id);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
      
      // Reload the profile to get updated counts from database
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const formatWorkoutDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
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

  const formatWorkoutDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'In progress';
    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));
    return `${duration} min`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Not Found</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={40} color={Colors.secondary} />
            </View>
          )}
          
          <Text style={styles.profileName}>
            {profile.full_name || profile.username}
          </Text>
          <Text style={styles.profileUsername}>@{profile.username}</Text>
          
          {profile.bio && (
            <Text style={styles.profileBio}>{profile.bio}</Text>
          )}

          {/* Social Stats */}
          <View style={styles.socialStats}>
            <View style={styles.socialStat}>
              <Text style={styles.socialStatNumber}>{followersCount}</Text>
              <Text style={styles.socialStatLabel}>Followers</Text>
            </View>
            <View style={styles.socialStat}>
              <Text style={styles.socialStatNumber}>{followingCount}</Text>
              <Text style={styles.socialStatLabel}>Following</Text>
            </View>
            <View style={styles.socialStat}>
              <Text style={styles.socialStatNumber}>{userPosts.length}</Text>
              <Text style={styles.socialStatLabel}>Workouts</Text>
            </View>
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton
                ]}
                onPress={handleFollowToggle}
              >
                {isFollowing ? (
                  <UserCheck size={20} color={Colors.primary} />
                ) : (
                  <UserPlus size={20} color={Colors.accent} />
                )}
                <Text style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText
                ]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Workouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {userPosts.length > 0 ? (
            userPosts.map((post) => (
              <WorkoutPostCard key={post.id} post={post} />
            ))
          ) : (
            <View style={styles.emptyWorkouts}>
              <Dumbbell size={48} color={Colors.secondary} />
              <Text style={styles.emptyWorkoutsTitle}>No workouts shared</Text>
              <Text style={styles.emptyWorkoutsText}>
                {isOwnProfile 
                  ? "Start sharing your workouts to build your fitness profile"
                  : `${profile.username} hasn't shared any workouts yet`
                }
              </Text>
            </View>
          )}
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
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: FontSizes.screenTitle,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: FontSizes.body,
    color: Colors.accent,
    marginBottom: 16,
  },
  profileBio: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  socialStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 24,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  followingButton: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  followButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.accent,
  },
  followingButtonText: {
    color: Colors.primary,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  messageButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.accent,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 16,
  },
  workoutCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  workoutName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    flex: 1,
  },
  workoutDate: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  swipeableContainer: {
    position: 'relative',
  },
  swipeableList: {
    height: 200,
  },
  mediaContainer: {
    width: width - 48, // Account for card margins and padding
    height: 200,
    position: 'relative',
  },
  workoutMedia: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  workoutDetailsContainer: {
    width: width - 48,
    height: 200,
    padding: 16,
    backgroundColor: Colors.background,
  },
  workoutStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
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
  exercisePreview: {
    flex: 1,
  },
  exerciseDetailItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  exerciseName: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
    marginBottom: 4,
  },
  exerciseSets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  setInfo: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pageIndicators: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  pageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activePageIndicator: {
    backgroundColor: Colors.accent,
  },
  moreExercises: {
    fontSize: FontSizes.caption,
    color: Colors.accent,
    fontStyle: 'italic',
  },
  workoutCaption: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    lineHeight: 22,
  },
  captionSection: {
    padding: 16,
    paddingTop: 8,
  },
  emptyWorkouts: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyWorkoutsTitle: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyWorkoutsText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 24,
  },
});