import { useEffect } from 'react';
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
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Notification permissions not granted');
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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (loading) {
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
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}