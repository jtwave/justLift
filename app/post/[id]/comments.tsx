import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useSocialStore } from '@/store/socialStore';
import { useAuth } from '@/hooks/useAuth';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Send, Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { likePost, unlikePost, feedPosts } = useSocialStore();
  const scrollViewRef = useRef<ScrollView>(null);

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadPostAndComments();
    }
  }, [id]);

  const loadPostAndComments = async () => {
    try {
      setLoading(true);

      // First check if post exists in the feed (for consistent state)
      const feedPost = feedPosts.find(p => p.id === id);

      if (feedPost) {
        // Use the feed post data which already has correct like state
        setPost(feedPost);
      } else {
        // Load from database if not in feed
        const { data: postData, error: postError } = await supabase
          .from('workout_posts')
          .select(`
            *,
            user:profiles(*),
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
          .eq('id', id)
          .single();

        if (postError) throw postError;

        // Check if current user liked this post
        const { data: likeData } = await supabase
          .from('workout_likes')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user?.id || '')
          .limit(1);

        const formattedPost = {
          ...postData,
          workout: {
            ...postData.workout,
            exercises: postData.workout.workout_exercises.map((we: any) => ({
              exercise_id: we.exercise_id,
              exercise: we.exercise,
              sets: we.workout_sets
            }))
          },
          is_liked: likeData && likeData.length > 0
        };

        setPost(formattedPost);
      }

      // Load comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('workout_comments')
        .select(`
          *,
          user:profiles(username, full_name, avatar_url)
        `)
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      setComments(commentsData || []);

    } catch (error) {
      console.error('Error loading post and comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.id || submitting) return;

    try {
      setSubmitting(true);

      const { data: commentData, error } = await supabase
        .from('workout_comments')
        .insert({
          post_id: id,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          user:profiles(username, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      setComments(prev => [...prev, commentData]);
      setNewComment('');

      // Update post comment count locally
      if (post) {
        setPost((prev: any) => ({
          ...prev,
          comments_count: prev.comments_count + 1
        }));
      }
      // Update comment count in feedPosts (global store)
      useSocialStore.setState((state) => ({
        feedPosts: state.feedPosts.map((p) =>
          p.id === id ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      }));

      // Auto-scroll to bottom after adding comment
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;

    try {
      if (post.is_liked) {
        await unlikePost(post.id);
        setPost((prev: any) => ({
          ...prev,
          is_liked: false,
          likes_count: prev.likes_count - 1
        }));

        // Also update the feed state to keep it in sync
        useSocialStore.setState((state: any) => ({
          feedPosts: state.feedPosts.map((p: any) =>
            p.id === post.id ? { ...p, is_liked: false, likes_count: p.likes_count - 1 } : p
          )
        }));
      } else {
        await likePost(post.id);
        setPost((prev: any) => ({
          ...prev,
          is_liked: true,
          likes_count: prev.likes_count + 1
        }));

        // Also update the feed state to keep it in sync
        useSocialStore.setState((state: any) => ({
          feedPosts: state.feedPosts.map((p: any) =>
            p.id === post.id ? { ...p, is_liked: true, likes_count: p.likes_count + 1 } : p
          )
        }));
      }
    } catch (error) {
      console.error('Error handling like in comments:', error);
      // Reload the post to get the correct state
      loadPostAndComments();
    }
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

  const renderComment = ({ item }: { item: any }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentUsername}>@{item.user.username || 'user'}</Text>
        <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
    </View>
  );

  // Auto-scroll to bottom when comments load
  useEffect(() => {
    if (comments.length > 0 && !loading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [comments.length, loading]);

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

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post not found</Text>
          <View style={styles.placeholder} />
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
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.commentsList}
          contentContainerStyle={styles.commentsContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.postHeader}>
            <View style={styles.postInfo}>
              <Text style={styles.postUser}>@{post.user.username}</Text>
              <Text style={styles.postWorkout}>{post.workout.name}</Text>
              {post.caption && (
                <Text style={styles.postCaption}>{post.caption}</Text>
              )}
            </View>
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLike}
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
            </View>
          </View>
          {comments.map((item, idx) => (
            <View key={item.id || idx} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentUsername}>@{item.user.username || 'user'}</Text>
                <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
              </View>
              <Text style={styles.commentContent}>{item.content}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.commentInput}>
          <TextInput
            style={styles.textInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.secondary}
            multiline
            maxLength={500}
            onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newComment.trim() || submitting) && styles.sendButtonDisabled
            ]}
            onPress={handleAddComment}
            disabled={!newComment.trim() || submitting}
          >
            <Send size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
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
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingHorizontal: 24,
  },
  postHeader: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: 16,
  },
  postInfo: {
    marginBottom: 16,
  },
  postUser: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.accent,
    marginBottom: 4,
  },
  postWorkout: {
    fontSize: FontSizes.sectionHeader,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 8,
  },
  postCaption: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    lineHeight: 22,
  },
  postActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    fontWeight: FontWeights.medium,
  },
  commentItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUsername: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.accent,
  },
  commentTime: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  commentContent: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    lineHeight: 22,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: FontSizes.body,
    color: Colors.primary,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});