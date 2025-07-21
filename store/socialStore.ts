import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { NotificationService } from '@/services/notificationService';

type Exercise = Database['public']['Tables']['exercises']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Follow = Database['public']['Tables']['follows']['Row'] & {
  following: Profile;
};

type WorkoutPost = Database['public']['Tables']['workout_posts']['Row'] & {
  user: Profile;
  workout: {
    id: string;
    name: string;
    start_time: string;
    end_time: string | null;
    exercises: Array<{
      exercise: { name: string; category: string };
      sets: Array<{ weight: number; reps: number; completed: boolean }>;
    }>;
  };
  is_liked: boolean;
  recent_comments: Array<{
    id: string;
    content: string;
    created_at: string;
    user: { username: string; avatar_url: string | null };
  }>;
};

interface SocialStore {
  // Feed
  feedPosts: WorkoutPost[];
  feedLoading: boolean;

  // Following/Followers
  following: Follow[];
  followers: Follow[];
  followingLoading: boolean;

  // User search
  searchResults: Profile[];
  searchLoading: boolean;

  // Actions
  loadFeed: () => Promise<void>;
  loadFollowing: (userId: string) => Promise<void>;
  loadFollowers: (userId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  createWorkoutPost: (workoutId: string, caption?: string, isPublic?: boolean) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  updateProfile: (updates: { username?: string; full_name?: string; bio?: string; avatar_url?: string }) => Promise<void>;
  createWorkoutPostWithMedia: (workoutId: string, caption?: string, mediaUrl?: string, mediaType?: 'photo' | 'video', isPublic?: boolean) => Promise<void>;
  loadPostComments: (postId: string) => Promise<any[]>;
  loadWorkoutPost: (workoutId: string) => Promise<any>;
  deleteWorkoutPost: (postId: string) => Promise<void>;
}

export const useSocialStore = create<SocialStore>((set, get) => ({
  feedPosts: [],
  feedLoading: false,
  following: [],
  followers: [],
  followingLoading: false,
  searchResults: [],
  searchLoading: false,

  loadFeed: async () => {
    try {
      set({ feedLoading: true });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // First, get the list of users that the current user follows
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.user.id);

      if (followingError) throw followingError;

      // Get the user IDs that the current user follows, plus their own ID
      const followingIds = followingData?.map(f => f.following_id) || [];
      const userIds = [...followingIds, user.user.id]; // Include own posts

      // If user doesn't follow anyone, only show their own posts
      if (userIds.length === 0) {
        userIds.push(user.user.id);
      }

      // Get posts only from users in the userIds array
      const { data: posts, error } = await supabase
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
              exercise_id,
              exercise:exercises(name, category),
              workout_sets(weight, reps, completed)
            )
          )
        `)
        .eq('is_public', true)
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Check which posts are liked by current user
      const postIds = posts?.map(p => p.id) || [];
      const { data: likes } = await supabase
        .from('workout_likes')
        .select('post_id')
        .eq('user_id', user.user.id)
        .in('post_id', postIds);

      const likedPostIds = new Set(likes?.map(l => l.post_id) || []);

      // Get recent comments for each post
      const { data: comments } = await supabase
        .from('workout_comments')
        .select(`
          id,
          post_id,
          content,
          created_at,
          user:profiles(username, avatar_url)
        `)
        .in('post_id', postIds)
        .order('created_at', { ascending: false });

      const commentsByPost = comments?.reduce((acc, comment) => {
        if (!acc[comment.post_id]) acc[comment.post_id] = [];
        acc[comment.post_id].push(comment);
        return acc;
      }, {} as Record<string, any[]>) || {};

      const formattedPosts = posts?.map(post => ({
        ...post,
        workout: {
          ...post.workout,
          exercises: post.workout.workout_exercises.map((we: any) => ({
            exercise_id: we.exercise_id,
            exercise: we.exercise,
            sets: we.workout_sets
          }))
        },
        is_liked: likedPostIds.has(post.id),
        recent_comments: (commentsByPost[post.id] || []).slice(0, 2)
      })) || [];

      set({ feedPosts: formattedPosts });
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      set({ feedLoading: false });
    }
  },

  loadFollowing: async (userId: string) => {
    try {
      // Don't set loading state to avoid UI blocking
      const { data, error } = await supabase
        .from('follows')
        .select(`
          *,
          following:profiles!follows_following_id_fkey(*)
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ following: data || [] });
    } catch (error) {
      console.error('Error loading following:', error);
    }
  },

  loadFollowers: async (userId: string) => {
    try {
      set({ followingLoading: true });
      const { data, error } = await supabase
        .from('follows')
        .select(`
          *,
          follower:profiles!follows_follower_id_fkey(*)
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ followers: data || [] });
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      set({ followingLoading: false });
    }
  },

  searchUsers: async (query: string) => {
    try {
      set({ searchLoading: true });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      if (query.trim().length === 0) {
        set({ searchResults: [] });
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', user.user.id)
        .limit(20);

      if (error) throw error;

      // Check if current user follows each result
      const userIds = data?.map(p => p.id) || [];
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.user.id)
        .in('following_id', userIds);

      const followingIds = new Set(followingData?.map(f => f.following_id) || []);

      const resultsWithFollowStatus = data?.map(profile => ({
        ...profile,
        is_following: followingIds.has(profile.id)
      })) || [];

      set({ searchResults: resultsWithFollowStatus });
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      set({ searchLoading: false });
    }
  },

  followUser: async (userId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.user.id,
          following_id: userId
        });

      if (error) throw error;

      // Update local state to reflect the follow
      const state = get();

      // Update search results if the followed user is in them
      const updatedSearchResults = state.searchResults.map(profile =>
        profile.id === userId
          ? { ...profile, is_following: true }
          : profile
      );

      set({ searchResults: updatedSearchResults });

      // Reload following list if it's for current user
      if (state.following.length > 0) {
        get().loadFollowing(user.user.id);
      }

      // Database trigger will handle notification automatically
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  },

  unfollowUser: async (userId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.user.id)
        .eq('following_id', userId);

      if (error) throw error;

      // Update local state to reflect the unfollow
      const currentUser = user.user.id;
      const state = get();

      // Update search results if the unfollowed user is in them
      const updatedSearchResults = state.searchResults.map(profile =>
        profile.id === userId
          ? { ...profile, is_following: false }
          : profile
      );

      set({ searchResults: updatedSearchResults });

      // Reload following list if it's for current user
      if (state.following.length > 0) {
        get().loadFollowing(currentUser);
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  },

  likePost: async (postId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('workout_likes')
        .insert({
          post_id: postId,
          user_id: user.user.id
        });

      if (error) throw error;

      // Update local state
      set({
        feedPosts: get().feedPosts.map(post =>
          post.id === postId
            ? { ...post, is_liked: true, likes_count: post.likes_count + 1 }
            : post
        )
      });

      // Database trigger will handle notification automatically
    } catch (error) {
      console.error('Error liking post:', error);
    }
  },

  unlikePost: async (postId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('workout_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      // Update local state
      set({
        feedPosts: get().feedPosts.map(post =>
          post.id === postId
            ? { ...post, is_liked: false, likes_count: post.likes_count - 1 }
            : post
        )
      });
    } catch (error) {
      console.error('Error unliking post:', error);
    }
  },

  addComment: async (postId: string, content: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('workout_comments')
        .insert({
          post_id: postId,
          user_id: user.user.id,
          content: content.trim()
        });

      if (error) throw error;

      // Reload feed to get updated comments
      get().loadFeed();

      // Database trigger will handle notification automatically
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  },

  loadPostComments: async (postId: string) => {
    try {
      const { data: comments, error } = await supabase
        .from('workout_comments')
        .select(`
          *,
          user:profiles(username, full_name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return comments || [];
    } catch (error) {
      console.error('Error loading comments:', error);
      return [];
    }
  },

  createWorkoutPost: async (workoutId: string, caption?: string, isPublic = true) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: post, error } = await supabase
        .from('workout_posts')
        .insert({
          workout_id: workoutId,
          user_id: user.user.id,
          caption: caption?.trim() || null,
          is_public: isPublic
        })
        .select()
        .single();

      if (error) throw error;

      // Database trigger will handle notifications automatically
    } catch (error) {
      console.error('Error creating workout post:', error);
      throw error;
    }
  },

  createWorkoutPostWithMedia: async (workoutId: string, caption?: string, mediaUrl?: string, mediaType?: 'photo' | 'video', isPublic = true) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: post, error } = await supabase
        .from('workout_posts')
        .insert({
          workout_id: workoutId,
          user_id: user.user.id,
          caption: caption?.trim() || null,
          media_url: mediaUrl || null,
          media_type: mediaType || null,
          is_public: isPublic
        })
        .select()
        .single();

      if (error) throw error;

      // Database trigger will handle notifications automatically
    } catch (error) {
      console.error('Error creating workout post with media:', error);
      throw error;
    }
  },

  checkUsernameAvailable: async (username: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .limit(1);

      if (error) {
        console.error('Error checking username:', error);
        return false;
      }

      // Username is available if no records found
      return data.length === 0;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  },

  updateProfile: async (updates: { username?: string; full_name?: string; bio?: string; avatar_url?: string }) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  loadWorkoutPost: async (workoutId: string) => {
    try {
      const { data, error } = await supabase
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
        .eq('workout_id', workoutId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading workout post:', error);
      return null;
    }
  },

  deleteWorkoutPost: async (postId: string) => {
    try {
      const { error } = await supabase
        .from('workout_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting workout post:', error);
      throw error;
    }
  },
}));