import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useSocialStore } from '@/store/socialStore';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { ArrowLeft, User } from 'lucide-react-native';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

export default function FollowersScreen() {
  const { user } = useAuth();
  const { followers, followingLoading, loadFollowers } = useSocialStore();

  useEffect(() => {
    if (user?.id) {
      loadFollowers(user.id);
    }
  }, [user?.id, loadFollowers]);

  const renderFollowerItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => router.push(`/profile/${item.follower.username}`)}
    >
      <View style={styles.userInfo}>
        {item.follower.avatar_url ? (
          <Image source={{ uri: item.follower.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User size={24} color={Colors.secondary} />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.username}>@{item.follower.username}</Text>
          <Text style={styles.fullName}>{item.follower.full_name}</Text>
          {item.follower.bio && (
            <Text style={styles.bio} numberOfLines={1}>{item.follower.bio}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={followers}
        renderItem={renderFollowerItem}
        keyExtractor={(item) => item.id}
        style={styles.userList}
        contentContainerStyle={[styles.userListContent, { paddingBottom: TAB_BAR_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        refreshing={followingLoading}
        onRefresh={() => user?.id && loadFollowers(user.id)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <User size={48} color={Colors.secondary} />
            <Text style={styles.emptyStateTitle}>No followers yet</Text>
            <Text style={styles.emptyStateText}>
              When people follow you, they'll appear here
            </Text>
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
  },
});