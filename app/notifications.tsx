import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useNotificationStore } from '@/store/notificationStore';
import { router } from 'expo-router';
import { ArrowLeft, Bell, Check, MessageCircle, Heart, UserPlus, TrendingUp } from 'lucide-react-native';

export default function NotificationsScreen() {
    const {
        notifications,
        loading,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        getUnreadCount,
    } = useNotificationStore();

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };

    const handleMarkAsRead = async (notificationId: string) => {
        await markAsRead([notificationId]);
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const handleNotificationPress = (notification: any) => {
        // Mark as read
        handleMarkAsRead(notification.id);

        // Navigate based on notification type
        switch (notification.type) {
            case 'comment':
            case 'like':
            case 'new_post':
                if (notification.data?.post_id) {
                    router.push(`/post/${notification.data.post_id}/comments`);
                }
                break;
            case 'follow':
                // Navigate to user profile
                if (notification.data?.follower_id) {
                    router.push(`/profile/${notification.data.follower_id}`);
                }
                break;
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'comment':
                return <MessageCircle size={20} color={Colors.accent} />;
            case 'like':
                return <Heart size={20} color={Colors.error} />;
            case 'new_post':
                return <TrendingUp size={20} color={Colors.accent} />;
            case 'follow':
                return <UserPlus size={20} color={Colors.accent} />;
            default:
                return <Bell size={20} color={Colors.secondary} />;
        }
    };

    const formatTimeAgo = (createdAt: string) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}d ago`;
        }
    };

    const unreadCount = getUnreadCount();

    if (loading && notifications.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <View style={styles.placeholder} />
                </View>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.secondary} />
                        <Text style={styles.loadingText}>Loading notifications...</Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.content}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[Colors.secondary]}
                                tintColor={Colors.secondary}
                            />
                        }
                        showsVerticalScrollIndicator={false}
                    >
                        {notifications.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Bell size={48} color={Colors.secondary} />
                                <Text style={styles.emptyStateTitle}>No notifications yet</Text>
                                <Text style={styles.emptyStateText}>
                                    When you get comments, likes, or new posts from people you follow, they'll appear here.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.notificationsList}>
                                {notifications.map((notification) => (
                                    <TouchableOpacity
                                        key={notification.id}
                                        style={[
                                            styles.notificationItem,
                                            !notification.is_read && styles.unreadNotification
                                        ]}
                                        onPress={() => handleNotificationPress(notification)}
                                    >
                                        <View style={styles.notificationIcon}>
                                            {getNotificationIcon(notification.type)}
                                        </View>
                                        <View style={styles.notificationContent}>
                                            <Text style={styles.notificationTitle}>{notification.title}</Text>
                                            <Text style={styles.notificationBody}>{notification.body}</Text>
                                            <Text style={styles.notificationTime}>
                                                {formatTimeAgo(notification.created_at)}
                                            </Text>
                                        </View>
                                        {!notification.is_read && (
                                            <View style={styles.unreadDot} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.secondary]}
                        tintColor={Colors.secondary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Bell size={48} color={Colors.secondary} />
                        <Text style={styles.emptyStateTitle}>No notifications yet</Text>
                        <Text style={styles.emptyStateText}>
                            When you get comments, likes, or new posts from people you follow, they'll appear here.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.notificationsList}>
                        {notifications.map((notification) => (
                            <TouchableOpacity
                                key={notification.id}
                                style={[
                                    styles.notificationItem,
                                    !notification.is_read && styles.unreadNotification
                                ]}
                                onPress={() => handleNotificationPress(notification)}
                            >
                                <View style={styles.notificationIcon}>
                                    {getNotificationIcon(notification.type)}
                                </View>
                                <View style={styles.notificationContent}>
                                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                                    <Text style={styles.notificationBody}>{notification.body}</Text>
                                    <Text style={styles.notificationTime}>
                                        {formatTimeAgo(notification.created_at)}
                                    </Text>
                                </View>
                                {!notification.is_read && (
                                    <View style={styles.unreadDot} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
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
    markAllButton: {
        padding: 8,
    },
    markAllText: {
        fontSize: FontSizes.caption,
        color: Colors.accent,
        fontWeight: FontWeights.medium,
    },
    content: {
        flex: 1,
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
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 48,
        paddingTop: 100,
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
    },
    notificationsList: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        marginBottom: 8,
    },
    unreadNotification: {
        backgroundColor: Colors.cardBackground,
        borderLeftWidth: 3,
        borderLeftColor: Colors.accent,
    },
    notificationIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: FontSizes.body,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
        marginBottom: 4,
    },
    notificationBody: {
        fontSize: FontSizes.body,
        color: Colors.secondary,
        lineHeight: 20,
        marginBottom: 8,
    },
    notificationTime: {
        fontSize: FontSizes.caption,
        color: Colors.secondary,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.accent,
        marginLeft: 8,
        marginTop: 2,
    },
}); 