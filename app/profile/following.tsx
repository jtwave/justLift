import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useSocialStore } from '@/store/socialStore';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { ArrowLeft, User, UserCheck } from 'lucide-react-native';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

export default function FollowingScreen() {
  const { user } = useAuth();
  const { following, followingLoading, loadFollowing, unfollowUser } = useSocialStore();

  useEffect(() => {
    if (user?.id) {
      loadFollowing(user.id);
    }
  }, [user?.id, loadFollowing]);

  const handleUnfollow = async (userId: string) => {
    await unfollowUser(userId);
    if (user?.id) {
      loadFollowing(user.id);
    }
  };

  const renderFollowingItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => router.push(`/profile/${item.following.username}`)}
    >
      <View style={styles.userInfo}>
        {item.following.avatar_url ? (
          <Image source={{ uri: item.following.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User size={24} color={Colors.secondary} />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.username}>@{item.following.username}</Text>
          <Text style={styles.fullName}>{item.following.full_name}</Text>
          {item.following.bio && (
            <Text style={styles.bio} numberOfLines={1}>{item.following.bio}</Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.unfollowButton}
        onPress={() => handleUnfollow(item.following.id)}
      >
        <UserCheck size={16} color={Colors.primary} />
        <Text style={styles.unfollowButtonText}>Following</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Following</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={following}
        renderItem={renderFollowingItem}
        keyExtractor={(item) => item.id}
        style={styles.userList}
        contentContainerStyle={[styles.userListContent, { paddingBottom: TAB_BAR_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        refreshing={followingLoading}
        onRefresh={() => user?.id && loadFollowing(user.id)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <User size={48} color={Colors.secondary} />
            <Text style={styles.emptyStateTitle}>Not following anyone yet</Text>
            <Text style={styles.emptyStateText}>
              Find people to follow and see their workouts in your feed
            </Text>
            <TouchableOpacity 
              style={styles.findFriendsButton}
              onPress={() => router.push('/search')}
            >
              <Text style={styles.findFriendsButtonText}>Find Friends</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  userList: {
    flex: 1,
  },
  userListContent: {
    paddingHorizontal: 24,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 2,
  },
  fullName: {
    fontSize: FontSizes.body,
    color: Colors.secondary,
    marginBottom: 2,
  },
  bio: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
  },
  unfollowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  unfollowButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
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
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  findFriendsButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  findFriendsButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
});