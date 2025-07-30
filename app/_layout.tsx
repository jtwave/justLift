import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/hooks/useAuth';
import { AuthScreen } from '@/components/AuthScreen';
import { ThemeProvider } from '../components/ThemeProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NotificationService } from '@/services/notificationService';
import { useNotificationStore } from '@/store/notificationStore';
import { useSocialStore } from '@/store/socialStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useRoutineStore } from '@/store/routineStore';
import { useProgressStore } from '@/store/progressStore';
import { AppState } from 'react-native';

SplashScreen.preventAutoHideAsync();

// Configure notifications for background timer
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const { user, loading } = useAuth();
  const { loadPreferences } = useNotificationStore();
  const [layoutReady, setLayoutReady] = useState(false);

  // Preload all data for tabs when user is authenticated
  useEffect(() => {
    if (user) {
      const preloadData = async () => {
        try {
          // Preload data for all tabs in parallel
          await Promise.all([
            // Home tab data
            useSocialStore.getState().loadFeed(),
            useSocialStore.getState().loadFollowing(user.id),
            useSocialStore.getState().loadFollowers(user.id),

            // Workout tab data
            useWorkoutStore.getState().loadExercises(),
            useWorkoutStore.getState().loadCurrentWorkout(),

            // Routines data
            useRoutineStore.getState().loadRoutines(),

            // Stats data
            useWorkoutStore.getState().loadWorkoutHistory(),
            useProgressStore.getState().loadProgressPhotos(),

            // Notifications data
            useNotificationStore.getState().loadNotifications(),
          ]);

          // Add a small delay to ensure layout calculations are complete
          setTimeout(() => {
            setLayoutReady(true);
          }, 50); // Reduced from 100ms to 50ms
        } catch (error) {
          console.error('Error preloading data:', error);
          setLayoutReady(true); // Still set ready even if there's an error
        }
      };

      preloadData();
    } else {
      setLayoutReady(true); // Set ready immediately if no user
    }
  }, [user]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Request notification permissions and initialize listeners
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Request permissions
        const granted = await NotificationService.requestPermissions();
        if (!granted) {
          // Notification permissions not granted - silent fail
        }

        // Initialize notification listeners
        const cleanup = NotificationService.initializeListeners();

        // Load notification preferences if user is authenticated
        if (user) {
          await loadPreferences();
        }

        return cleanup;
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    const cleanup = initializeNotifications();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [user]);

  // Set up periodic notification checking
  useEffect(() => {
    if (!user) return;

    const { checkForNewNotifications } = useNotificationStore.getState();

    // Check for new notifications immediately
    checkForNewNotifications();

    // Set up interval to check for new notifications every 30 seconds
    const interval = setInterval(() => {
      checkForNewNotifications();
    }, 30000);

    // Set up AppState listener to check notifications when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkForNewNotifications();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [user]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (loading || !layoutReady) {
    return null;
  }

  if (!user) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthScreen />
        </ThemeProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="workout/routines/exercise-config" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workout/routines/save-routine-modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workout/routines/edit" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}