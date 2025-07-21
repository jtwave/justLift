import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

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

export function useRestTimer() {
  const [duration, setDuration] = useState(90); // default 90 seconds
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);

  // Load timer state from storage on mount and when app resumes
  useEffect(() => {
    loadTimerState();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadTimerState();
      }
    });
    return () => subscription.remove();
  }, []);

  // Save timer state to storage whenever it changes
  useEffect(() => {
    saveTimerState();
  }, [timeLeft, isActive, timerStartTime]);

  const loadTimerState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('restTimerState');
      if (savedState) {
        const { timeLeft: savedTimeLeft, isActive: savedIsActive, timerStartTime: savedStartTime, duration: savedDuration } = JSON.parse(savedState);

        if (savedIsActive && savedStartTime) {
          // Calculate remaining time based on elapsed time since start
          const elapsed = Math.floor((Date.now() - savedStartTime) / 1000);
          const remaining = Math.max(0, savedDuration - elapsed);

          if (remaining > 0) {
            setTimeLeft(remaining);
            setIsActive(true);
            setTimerStartTime(savedStartTime);
            setDuration(savedDuration);
          } else {
            // Timer has finished, clear state
            await clearTimerState();
            setTimeLeft(0);
            setIsActive(false);
            setTimerStartTime(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  };

  const saveTimerState = async () => {
    try {
      const state = {
        timeLeft,
        isActive,
        timerStartTime,
        duration,
      };
      await AsyncStorage.setItem('restTimerState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  };

  const clearTimerState = async () => {
    try {
      await AsyncStorage.removeItem('restTimerState');
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            setTimerStartTime(null);
            clearTimerState();
            // Schedule notification for timer completion
            scheduleTimerNotification();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const scheduleTimerNotification = async (seconds?: number) => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Rest Timer Complete!',
          body: 'Your rest period is over. Time to get back to your workout!',
          sound: true,
        },
        trigger: { seconds: seconds ?? timeLeft },
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const startTimer = useCallback((customDuration?: number) => {
    const time = customDuration || duration;
    const startTime = Date.now();
    setTimeLeft(time);
    setIsActive(true);
    setTimerStartTime(startTime);
    setDuration(time);
    scheduleTimerNotification(time);
  }, [duration]);

  const pauseTimer = useCallback(async () => {
    setIsActive(false);
    setTimerStartTime(null);
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  const resetTimer = useCallback(async () => {
    setTimeLeft(0);
    setIsActive(false);
    setTimerStartTime(null);
    await clearTimerState();
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  const adjustDuration = useCallback((newDuration: number) => {
    console.log('useRestTimer: Adjusting duration from', duration, 'to', newDuration);
    setDuration(newDuration);
    setTimeLeft(newDuration);
    setIsActive(false); // Stop any active timer
    setTimerStartTime(null);
  }, [duration]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeLeft,
    duration,
    isActive,
    startTimer,
    pauseTimer,
    resetTimer,
    adjustDuration,
    formatTime,
  };
}