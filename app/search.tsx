import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useSocialStore } from '@/store/socialStore';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { ArrowLeft, Search, User, UserPlus, UserCheck } from 'lucide-react-native';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 60;

export default function SearchScreen() {
  const { user } = useAuth();
  const {
    searchResults,
    searchLoading,
    searchUsers,
    followUser,
    unfollowUser,
    following,
    loadFollowing
  } = useSocialStore();

  const [query, setQuery] = useState('');
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      loadFollowing(user.id);
    }
  }, [user?.id, loadFollowing]);

  useEffect(() => {
    // Update local following state when following list changes
    const followingIds = new Set(following.map(follow => follow.following_id));
    setFollowingUsers(followingIds);
  }, [following]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim().length >= 2) {
      searchUsers(text.trim());
    } else {
      // Clear results if query is too short
      const { searchResults } = useSocialStore.getState();
      if (searchResults.length > 0) {
        useSocialStore.setState({ searchResults: [] });
      }
    }
  };

  const isFollowing = (userId: string) => {
    return followingUsers.has(userId);
  };

  const handleFollowToggle = async (userId: string) => {
    try {
      if (isFollowing(userId)) {
        await unfollowUser(userId);
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        await followUser(userId);
        setFollowingUsers(prev => new Set(prev).add(userId));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => {
        if (item.username) {
          router.push(`/profile/${item.username}`);
        } else {
          Alert.alert('Profile Unavailable', 'This user has not set up their profile yet.');
        }
      }}
    >
      <View style={styles.userInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User size={24} color={Colors.secondary} />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.username}>
            {item.username ? `@${item.username}` : item.full_name || 'User'}
          </Text>
          {item.username && item.full_name && (
            <Text style={styles.fullName}>{item.full_name}</Text>
          )}
          {!item.username && (
            <Text style={styles.noUsername}>No username set</Text>
          )}
          {item.bio && (
            <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
          )}
        </View>
      </View>

      {/* Only show follow button if user has username and is not current user */}
      {item.username && item.id !== user?.id && (
        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing(item.id) && styles.followingButton
          ]}
          onPress={() => handleFollowToggle(item.id)}
        >
          {isFollowing(item.id) ? (
            <UserCheck size={16} color={Colors.primary} />
          ) : (
            <UserPlus size={16} color={Colors.accent} />
          )}
          <Text style={[
            styles.followButtonText,
            isFollowing(item.id) && styles.followingButtonText
          ]}>
            {isFollowing(item.id) ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or name..."
            placeholderTextColor={Colors.secondary}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {searchLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          style={styles.userList}
          contentContainerStyle={[styles.userListContent, { paddingBottom: TAB_BAR_HEIGHT }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            query.length > 0 ? (
              <View style={styles.emptyState}>
                <User size={48} color={Colors.secondary} />
                <Text style={styles.emptyStateTitle}>No users found</Text>
                <Text style={styles.emptyStateText}>
                  Try searching with a different username or name
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Search size={48} color={Colors.secondary} />
                <Text style={styles.emptyStateTitle}>Search for friends</Text>
                <Text style={styles.emptyStateText}>
                  Enter at least 2 characters to search for people by username, name, or email
                </Text>
              </View>
            )
          }
        />
      )}
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
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.body,
    color: Colors.primary,
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
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
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
  noUsername: {
    fontSize: FontSizes.caption,
    color: Colors.secondary,
    fontStyle: 'italic',
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: FontSizes.body,
    color: Colors.secondary,
  },
});