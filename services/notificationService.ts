import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotificationStore } from '@/store/notificationStore';

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export class NotificationService {
    static async requestPermissions() {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            console.error('Error requesting notification permissions:', error);
            return false;
        }
    }

    static async scheduleLocalNotification(
        title: string,
        body: string,
        data?: any,
        trigger?: Notifications.NotificationTriggerInput
    ) {
        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                },
                trigger: trigger || null, // null means send immediately
            });
            return notificationId;
        } catch (error) {
            console.error('Error scheduling notification:', error);
            return null;
        }
    }

    static async cancelAllNotifications() {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            console.error('Error canceling notifications:', error);
        }
    }

    static async getBadgeCount() {
        try {
            return await Notifications.getBadgeCountAsync();
        } catch (error) {
            console.error('Error getting badge count:', error);
            return 0;
        }
    }

    static async setBadgeCount(count: number) {
        try {
            await Notifications.setBadgeCountAsync(count);
        } catch (error) {
            console.error('Error setting badge count:', error);
        }
    }

    // Handle notification when app is in foreground
    static async handleForegroundNotification(notification: Notifications.Notification) {
        console.log('Received foreground notification:', notification);

        // Update badge count
        const unreadCount = useNotificationStore.getState().getUnreadCount();
        await this.setBadgeCount(unreadCount);
    }

    // Handle notification when app is in background and user taps it
    static async handleBackgroundNotification(notification: Notifications.NotificationResponse) {
        console.log('Received background notification:', notification);

        // Reload notifications
        await useNotificationStore.getState().loadNotifications();

        // Update badge count
        const unreadCount = useNotificationStore.getState().getUnreadCount();
        await this.setBadgeCount(unreadCount);
    }

    // Initialize notification listeners
    static initializeListeners() {
        // Foreground notification listener
        const foregroundSubscription = Notifications.addNotificationReceivedListener(
            this.handleForegroundNotification
        );

        // Background notification listener
        const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(
            this.handleBackgroundNotification
        );

        return () => {
            foregroundSubscription.remove();
            backgroundSubscription.remove();
        };
    }

    // Send notification for new comment
    static async sendCommentNotification(
        postId: string,
        commenterName: string,
        commentContent: string
    ) {
        const preferences = useNotificationStore.getState().preferences;

        if (!preferences?.comments_enabled || !preferences?.push_enabled) {
            return;
        }

        await this.scheduleLocalNotification(
            'New comment on your post',
            `${commenterName} commented: "${commentContent.substring(0, 50)}${commentContent.length > 50 ? '...' : ''}"`,
            {
                type: 'comment',
                postId,
                commentContent,
            }
        );
    }

    // Send notification for new like
    static async sendLikeNotification(
        postId: string,
        likerName: string
    ) {
        const preferences = useNotificationStore.getState().preferences;

        if (!preferences?.likes_enabled || !preferences?.push_enabled) {
            return;
        }

        await this.scheduleLocalNotification(
            'New like on your post',
            `${likerName} liked your post`,
            {
                type: 'like',
                postId,
            }
        );
    }

    // Send notification for new post from followed user
    static async sendNewPostNotification(
        postId: string,
        posterName: string
    ) {
        const preferences = useNotificationStore.getState().preferences;

        if (!preferences?.new_posts_enabled || !preferences?.push_enabled) {
            return;
        }

        await this.scheduleLocalNotification(
            'New post from someone you follow',
            `${posterName} posted a new workout`,
            {
                type: 'new_post',
                postId,
            }
        );
    }

    // Send notification for new follower
    static async sendFollowNotification(
        followerName: string
    ) {
        const preferences = useNotificationStore.getState().preferences;

        if (!preferences?.follows_enabled || !preferences?.push_enabled) {
            return;
        }

        await this.scheduleLocalNotification(
            'New follower',
            `${followerName} started following you`,
            {
                type: 'follow',
            }
        );
    }
} 