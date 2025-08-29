import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useAuth } from '@/hooks/useAuth';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, User, UserPlus, UserCheck, Dumbbell, Heart, MessageCircle, Clock } from 'lucide-react-native';
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
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
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
                setTotal + (set.completed ? set.weight * set.reps : 0), 0), 0);
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
        if (!item) return null;
        if (item.type === 'media') {
            return (
                <View style={styles.mediaContainer}>
                    <Image
                        source={{ uri: item.data.url }}
                        style={styles.postMedia}
                        resizeMode="cover"
                    />
                </View>
            );
        }

        // Workout details
        if (item.type === 'workout') {
            return (
                <View style={styles.workoutDetailsContainer}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.workoutInfo}>
                            <Text style={styles.workoutName}>{item.data.name}</Text>
                            <View style={styles.workoutStats}>
                                <View style={styles.statItem}>
                                    <Clock size={16} color={Colors.accent} />
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
                        </View>

                        {/* Exercise List */}
                        <View style={styles.exerciseList}>
                            {post.workout.exercises.map((exercise: any, exerciseIndex: number) => (
                                <View key={exerciseIndex} style={styles.exerciseItem}>
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
        }
        return null;
    };

    return (
        <View style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
                <View style={styles.userInfo}>
                    {post.user.avatar_url ? (
                        <Image source={{ uri: post.user.avatar_url }} style={styles.postAvatar} />
                    ) : (
                        <View style={styles.postAvatarPlaceholder}>
                            <User size={20} color={Colors.secondary} />
                        </View>
                    )}
                    <View style={styles.userDetails}>
                        <Text style={styles.username}>@{post.user.username}</Text>
                        <Text style={styles.fullName}>{post.user.full_name}</Text>
                    </View>
                </View>
                <Text style={styles.timeAgo}>{formatWorkoutDate(post.created_at)}</Text>
            </View>

            {/* Swipeable Content */}
            <View style={styles.swipeableContainer}>
                <FlatList
                    data={swipeableItems}
                    renderItem={renderSwipeableItem}
                    keyExtractor={(item, index) => {
                        if (item.type === 'media' && item.data?.url) return `media-${item.data.url}`;
                        if (item.type === 'workout' && item.data?.id) return `workout-${item.data.id}`;
                        return `${post.id}-${index}`;
                    }}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(event) => {
                        const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
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

            {/* Actions */}
            <View style={styles.actions}>
                <View style={styles.actionButton}>
                    <Heart size={20} color={Colors.secondary} />
                    <Text style={styles.actionText}>{post.likes_count}</Text>
                </View>

                <View style={styles.actionButton}>
                    <MessageCircle size={20} color={Colors.secondary} />
                    <Text style={styles.actionText}>{post.comments_count}</Text>
                </View>

                <View style={styles.actionButton} />
            </View>
        </View>
    );
};

export default function UserProfileScreen() {
    const { username } = useLocalSearchParams<{ username: string }>();
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const isOwnProfile = user?.user_metadata?.username === username;

    useEffect(() => {
        if (username) {
            // Reset follow state when navigating to different profile
            setIsFollowing(false);
            loadUserProfile();
        }
    }, [username]);

    // Check follow status after profile is loaded
    useEffect(() => {
        if (profile && !isOwnProfile) {
            checkFollowStatus();
        }
    }, [profile, isOwnProfile]);

    const loadUserProfile = async () => {
        try {
            setLoading(true);

            // Get user profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();

            if (profileError) {
                console.error('Error loading profile:', profileError);
                return;
            }

            setProfile(profileData);

            // Get user's workout posts
            const { data: postsData, error: postsError } = await supabase
                .from('workout_posts')
                .select(`
          id,
          caption,
          created_at,
          media_url,
          media_type,
          likes_count,
          comments_count,
          user:profiles!workout_posts_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          ),
          workout:workouts(
            id,
            name,
            start_time,
            end_time,
            workout_exercises(
              exercise_id,
              exercise:exercises(name, category),
              workout_sets(weight, reps, completed)
            )
          )
        `)
                .eq('user_id', profileData.id)
                .order('created_at', { ascending: false });

            if (postsError) {
                console.error('Error loading posts:', postsError);
                return;
            }

            // Transform the data to match the expected format
            const transformedPosts = postsData.map((post: any) => ({
                ...post,
                workout: {
                    ...post.workout,
                    exercises: post.workout.workout_exercises.map((we: any) => ({
                        id: we.exercise_id,
                        exercise: we.exercise,
                        sets: we.workout_sets
                    }))
                }
            }));

            setUserPosts(transformedPosts);

            // Get follower counts
            const { count: followersCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', profileData.id);

            const { count: followingCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', profileData.id);

            setFollowersCount(followersCount || 0);
            setFollowingCount(followingCount || 0);

        } catch (error) {
            console.error('Error loading user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkFollowStatus = async () => {
        if (!user || !profile || isOwnProfile) return;

        try {
            const { data, error } = await supabase
                .from('follows')
                .select('*')
                .eq('follower_id', user.id)
                .eq('following_id', profile.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error checking follow status:', error);
                return;
            }

            setIsFollowing(!!data);
        } catch (error) {
            console.error('Error checking follow status:', error);
        }
    };

    const handleFollowToggle = async () => {
        if (!user || isOwnProfile) return;

        try {
            if (isFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', user.id)
                    .eq('following_id', profile.id);

                if (error) throw error;

                setIsFollowing(false);
                // Reload profile to get updated counts from database
                await loadUserProfile();
            } else {
                // Follow
                const { error } = await supabase
                    .from('follows')
                    .insert({
                        follower_id: user.id,
                        following_id: profile.id
                    });

                if (error) throw error;

                setIsFollowing(true);
                // Reload profile to get updated counts from database
                await loadUserProfile();
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
            Alert.alert('Error', `Failed to update follow status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const formatWorkoutDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getTotalSets = (exercises: any[]) => {
        return exercises.reduce((total, exercise) =>
            total + exercise.sets.filter((set: any) => set.completed).length, 0);
    };

    const getTotalVolume = (exercises: any[]) => {
        return exercises.reduce((total, exercise) =>
            total + exercise.sets.reduce((setTotal: number, set: any) =>
                setTotal + (set.completed ? set.weight * set.reps : 0), 0), 0);
    };

    const formatWorkoutDuration = (startTime: string, endTime: string | null) => {
        if (!endTime) return 'In progress';
        const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));
        return `${duration} min`;
    };

    if (!profile && !loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>User Not Found</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>User not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>@{profile?.username || 'Loading...'}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.secondary} />
                        <Text style={styles.loadingText}>Loading profile...</Text>
                    </View>
                ) : (
                    <>
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
                    </>
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
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
    },
    loadingText: {
        marginTop: 16,
        fontSize: FontSizes.body,
        color: Colors.secondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    errorText: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        textAlign: 'center',
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
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.accent,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    followingButton: {
        backgroundColor: Colors.cardBackground,
    },
    followButtonText: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
    },
    followingButtonText: {
        color: Colors.primary,
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
    emptyWorkouts: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyWorkoutsTitle: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyWorkoutsText: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    postCard: {
        backgroundColor: Colors.cardBackground,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    postAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    postAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userDetails: {
        flex: 1,
    },
    username: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
    },
    fullName: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
    },
    timeAgo: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
    },
    swipeableContainer: {
        position: 'relative',
    },
    swipeableList: {
        height: width * 0.75,
    },
    mediaContainer: {
        width: width - 32,
        height: width * 0.75,
        backgroundColor: Colors.background,
    },
    postMedia: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.cardBackground,
    },
    workoutDetailsContainer: {
        width: width - 32,
        height: width * 0.75,
        padding: 16,
        backgroundColor: Colors.background,
    },
    workoutInfo: {
        marginBottom: 16,
    },
    workoutName: {
        fontSize: FontSizes.sectionHeader,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
        marginBottom: 8,
    },
    workoutStats: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
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
    exerciseList: {
        flex: 1,
    },
    exerciseItem: {
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    exerciseName: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
        marginBottom: 4,
    },
    exerciseSets: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    setInfo: {
        fontSize: FontSizes.caption,
        color: Colors.accent,
        backgroundColor: Colors.cardBackground,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    pageIndicators: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    pageIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    activePageIndicator: {
        backgroundColor: Colors.accent,
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginRight: 24,
        paddingVertical: 8,
    },
    actionText: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        fontWeight: FontWeights.medium,
    },
}); 