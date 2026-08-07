import React, { useEffect, useRef, useCallback } from 'react';
import { View, PanResponder, AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { getSocket } from '../services/socketService';

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes (180,000 ms)

export default function UserActivityTracker({ children }) {
  const { user, isAuthenticated } = useSelector((state) => state.auth || {});
  const userId = user?._id || user?.id;
  const isOnlineRef = useRef(false);
  const timerRef = useRef(null);

  const setStatusOnServer = useCallback((isOnline) => {
    if (!userId || !isAuthenticated) return;
    const socket = getSocket(userId);
    if (socket) {
      if (socket.connected) {
        socket.emit('set_status', { userId, isOnline });
      } else {
        socket.connect();
        socket.emit('set_status', { userId, isOnline });
      }
    }
    isOnlineRef.current = isOnline;
  }, [userId, isAuthenticated]);

  const startInactivityTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      // 3 minutes with no touch, click, or scroll -> set OFFLINE for everyone
      if (isOnlineRef.current) {
        setStatusOnServer(false);
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [setStatusOnServer]);

  const handleUserActivity = useCallback(() => {
    if (!userId || !isAuthenticated) return;

    // Reset 3-minute countdown timer
    startInactivityTimer();

    // If user was marked offline due to 3-min inactivity, set them ONLINE again immediately
    if (!isOnlineRef.current) {
      setStatusOnServer(true);
    }
  }, [userId, isAuthenticated, startInactivityTimer, setStatusOnServer]);

  // PanResponder to capture touches, clicks, and scroll gestures across the app
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        handleUserActivity();
        return false; // Return false so touch events pass through to buttons/inputs
      },
      onMoveShouldSetPanResponderCapture: () => {
        handleUserActivity();
        return false; // Return false so drag/scroll gestures pass through to lists
      },
    })
  ).current;

  useEffect(() => {
    if (isAuthenticated && userId) {
      setStatusOnServer(true);
      startInactivityTimer();

      const socket = getSocket(userId);
      const onConnect = () => {
        // On network reconnect, emit the TRUE current idle status, not blindly 'online'
        socket.emit('set_status', { userId, isOnline: isOnlineRef.current });
      };
      
      // Ensure socket is connected and listening
      if (!socket.connected) {
        socket.connect();
      }
      socket.on('connect', onConnect);

      const handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'active') {
          setStatusOnServer(true);
          startInactivityTimer();
        } else {
          if (timerRef.current) clearTimeout(timerRef.current);
          setStatusOnServer(false);
        }
      };

      const appStateSub = AppState.addEventListener('change', handleAppStateChange);

      return () => {
        appStateSub?.remove();
        socket.off('connect', onConnect);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      isOnlineRef.current = false;
    }
  }, [isAuthenticated, userId, setStatusOnServer, startInactivityTimer]);

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
