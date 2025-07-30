import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { NotificationService } from '@/services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];

interface NotificationStore {
    notifications: Notification[];
    preferences: NotificationPreferences | null;
    loading: boolean;
    error: string | null;

    // Actions
    loadNotifications: () => Promise<void>;
    loadPreferences: () => Promise<void>;
    markAsRead: (notificationIds: string[]) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
    getUnreadCount: () => number;
    clearNotifications: () => void;
    checkForNewNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    preferences: null,
    loading: false,
    error: null,

    loadNotifications: async () => {
        try {
            set({ loading: true, error: null });
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            set({ notifications: data || [] });
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    loadPreferences: async () => {
        try {
            set({ loading: true, error: null });
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            const { data, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', user.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // If no preferences exist, create default ones
            if (!data) {
                const { data: newPreferences, error: insertError } = await supabase
                    .from('notification_preferences')
                    .insert({
                        user_id: user.user.id,
                        comments_enabled: true,
                        likes_enabled: true,
                        new_posts_enabled: true,
                        follows_enabled: true,
                        push_enabled: true,
                        email_enabled: false,
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                set({ preferences: newPreferences });
            } else {
                set({ preferences: data });
            }
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    markAsRead: async (notificationIds: string[]) => {
        try {
            set({ loading: true, error: null });
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.user.id)
                .in('id', notificationIds);

            if (error) throw error;

            // Update local state
            set({
                notifications: get().notifications.map(notification =>
                    notificationIds.includes(notification.id)
                        ? { ...notification, is_read: true }
                        : notification
                )
            });
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    markAllAsRead: async () => {
        try {
            set({ loading: true, error: null });
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.user.id)
                .eq('is_read', false);

            if (error) throw error;

            // Update local state
            set({
                notifications: get().notifications.map(notification => ({
                    ...notification,
                    is_read: true
                }))
            });
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    updatePreferences: async (preferences: Partial<NotificationPreferences>) => {
        try {
            set({ loading: true, error: null });
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            const { data, error } = await supabase
                .from('notification_preferences')
                .update(preferences)
                .eq('user_id', user.user.id)
                .select()
                .single();

            if (error) throw error;
            set({ preferences: data });
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    getUnreadCount: () => {
        return get().notifications.filter(notification => !notification.is_read).length;
    },

    clearNotifications: () => {
        set({ notifications: [] });
    },

    checkForNewNotifications: async () => {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            // Get the last notification timestamp we've processed
            const lastProcessedTime = await AsyncStorage.getItem('lastNotificationCheck');
            const currentTime = new Date().toISOString();

            // Get new notifications since last check
            const { data: newNotifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.user.id)
                .gt('created_at', lastProcessedTime || '1970-01-01T00:00:00Z')
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Send push notifications for new notifications
            if (newNotifications && newNotifications.length > 0) {
                for (const notification of newNotifications) {
                    // Only send push notification if it's unread and user has push enabled
                    if (!notification.is_read) {
                        const preferences = get().preferences;
                        if (preferences?.push_enabled) {
                            // Check if this type of notification is enabled
                            let shouldSend = false;
                            switch (notification.type) {
                                case 'comment':
                                    shouldSend = preferences.comments_enabled;
                                    break;
                                case 'like':
                                    shouldSend = preferences.likes_enabled;
                                    break;
                                case 'new_post':
                                    shouldSend = preferences.new_posts_enabled;
                                    break;
                                case 'follow':
                                    shouldSend = preferences.follows_enabled;
                                    break;
                            }

                            if (shouldSend) {
                                await NotificationService.scheduleLocalNotification(
                                    notification.title,
                                    notification.body,
                                    notification.data
                                );
                            }
                        }
                    }
                }
            }

            // Update last processed time
            await AsyncStorage.setItem('lastNotificationCheck', currentTime);

            // Reload notifications to get fresh data
            await get().loadNotifications();
        } catch (error) {
            console.error('Error checking for new notifications:', error);
        }
    },
})); 