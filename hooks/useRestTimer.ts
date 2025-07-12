import { useState, useEffect, useCallback } from 'react';

export function useRestTimer() {
  const [duration, setDuration] = useState(90); // default 90 seconds
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const startTimer = useCallback((customDuration?: number) => {
    const time = customDuration || duration;
    setTimeLeft(time);
    setIsActive(true);
  }, [duration]);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
  }, []);

  const resetTimer = useCallback(() => {
    setTimeLeft(0);
    setIsActive(false);
  }, []);

  const adjustDuration = useCallback((newDuration: number) => {
    console.log('useRestTimer: Adjusting duration from', duration, 'to', newDuration);
    setDuration(newDuration);
    setTimeLeft(newDuration);
    setIsActive(false); // Stop any active timer
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