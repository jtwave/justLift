import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, RefreshControl, Dimensions, FlatList, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useSocialStore } from '@/store/socialStore';
import { useAuth } from '@/hooks/useAuth';
import { VideoPlayer } from '@/components/VideoPlayer';
import { router } from 'expo-router';
import { Heart, MessageCircle, User, Clock, Dumbbell, Search, Play, Volume2, VolumeX, MoveHorizontal as MoreHorizontal, Trash2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

interface PostMediaItem {
  type: 'media' | 'workout';
  data?: any;
}

const PostCard = ({ post, onLike, onDelete, currentUserId }: {
  post: any;
  onLike: (postId: string, isLiked: boolean) => void;
  onDelete: (postId: string) => void;
  currentUserId: string;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const formatWorkoutDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'In progress';
    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));
    return `${duration} min`;
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
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
    if (item.type === 'media') {
      return (
        <View style={styles.mediaContainer}>
          {imageLoading && (
            <View style={styles.imageLoadingContainer}>
              <View style={styles.loadingSpinner}>
                <Text style={styles.loadingDots}>●●●</Text>
              </View>
              <Text style={styles.imageLoadingText}>Loading image...</Text>
            </View>
          )}
          {imageError && (
            <View style={styles.imageErrorContainer}>
              <Text style={styles.imageErrorText}>Image unavailable</Text>
            </View>
          )}
          {item.data.type === 'photo' ? (
            <Image
              source={{ uri: item.data.url }}
              style={styles.postMedia}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => {
                setImageLoading(false);
                setImageError(false);
              }}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          ) : (
            <Image
              source={{ uri: item.data.url }}
              style={styles.postMedia}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => {
                setImageLoading(false);
                setImageError(false);
              }}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}
        </View>
      );
    }

    // Workout details
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
  };

  return (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push(`/profile/${post.user.username}`)}
        >
          {post.user.avatar_url ? (
            <Image source={{ uri: post.user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={20} color={Colors.secondary} />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.username}>@{post.user.username}</Text>
            <Text style={styles.fullName}>{post.user.full_name}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.postHeaderRight}>
          <Text style={styles.timeAgo}>{formatTimeAgo(post.created_at)}</Text>
          {post.user_id === currentUserId && (
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => setShowOptions(!showOptions)}
            >
              <MoreHorizontal size={20} color={Colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Options Menu */}
      {showOptions && post.user_id === currentUserId && (
        <View style={styles.optionsMenu}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              setShowOptions(false);
              Alert.alert(
                'Delete Post',
                'Are you sure you want to delete this workout post?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete(post.id)
                  }
                ]
              );
            }}
          >
            <Trash2 size={16} color={Colors.error} />
            <Text style={styles.optionText}>Delete Post</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Caption */}
      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onLike(post.id, post.is_liked)}
        >
          <Heart
            size={20}
            color={post.is_liked ? Colors.error : Colors.secondary}
            fill={post.is_liked ? Colors.error : 'none'}
          />
          <Text style={[
            styles.actionText,
            post.is_liked && { color: Colors.error }
          ]}>
            {post.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/post/${post.id}/comments`)}
        >
          <MessageCircle size={20} color={Colors.secondary} />
          <Text style={styles.actionText}>{post.comments_count}</Text>
        </TouchableOpacity>

        <View style={styles.actionButton} />
      </View>

      {/* Caption */}
      {post.caption && (
        <Text style={styles.caption}>{post.caption}</Text>
      )}

      {/* Recent Comments */}
      {post.recent_comments.length > 0 && (
        <View style={styles.commentsSection}>
          {post.recent_comments.map((comment: any) => (
            <View key={comment.id} style={styles.commentItem}>
              <Text style={styles.commentText}>
                <Text style={styles.commentUsername}>@{comment.user.username}</Text>
                {' '}{comment.content}
              </Text>
            </View>
          ))}
          {post.comments_count > 2 && (
            <TouchableOpacity onPress={() => router.push(`/post/${post.id}/comments`)}>
              <Text style={styles.viewAllComments}>
                View all {post.comments_count} comments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default function HomeScreen() {
  const {
    feedPosts,
    feedLoading,
    loadFeed,
    likePost,
    unlikePost,
    deleteWorkoutPost
  } = useSocialStore();

  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (isLiked) {
      await unlikePost(postId);
    } else {
      await likePost(postId);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteWorkoutPost(postId);
      // Reload feed to reflect the deletion
      await loadFeed();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: Colors.accent }]}>Lift</Text>
          <Text style={[styles.headerTitle, { color: Colors.primary, marginLeft: 4 }]}>Buddies</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/search')}
          >
            <Search size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {feedPosts.length === 0 && !feedLoading ? (
          <View style={styles.emptyState}>
            <Dumbbell size={64} color={Colors.secondary} />
            <Text style={styles.emptyStateTitle}>Welcome to Lift</Text>
            <Text style={styles.emptyStateText}>
              Follow other lifters to see their workouts in your feed, or start your first workout to share your progress!
            </Text>
            <TouchableOpacity
              style={styles.startWorkoutButton}
              onPress={() => router.push('/workout/active')}
            >
              <Text style={styles.startWorkoutButtonText}>Start Your First Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          feedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onDelete={handleDeletePost}
              currentUserId={user?.id || ''}
            />
          ))
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
  headerTitle: {
    fontSize: FontSizes.screenTitle,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 64,
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
  startWorkoutButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startWorkoutButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  postCard: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginVertical: 8,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
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
  postHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  optionsButton: {
    padding: 4,
  },
  optionsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  optionText: {
    fontSize: FontSizes.body,
    color: Colors.error,
  },
  swipeableContainer: {
    position: 'relative',
  },
  swipeableList: {
    height: width * 0.75, // 4:3 aspect ratio
  },
  mediaContainer: {
    width: width - 32, // Account for card margins
    height: width * 0.75,
    position: 'relative',
    backgroundColor: Colors.background,
  },
  postMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.cardBackground,
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    zIndex: 1,
  },
  loadingSpinner: {
    marginBottom: 8,
  },
  loadingDots: {
    fontSize: 24,
    color: Colors.accent,
    letterSpacing: 4,
  },
  imageLoadingText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
  imageErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    zIndex: 1,
  },
  imageErrorText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
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
  caption: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  commentItem: {
    marginBottom: 4,
  },
  commentText: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    lineHeight: 20,
  },
  commentUsername: {
    fontWeight: FontWeights.semibold,
    color: Colors.accent,
  },
  viewAllComments: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    marginTop: 4,
  },
});