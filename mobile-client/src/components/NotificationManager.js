import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import * as Sharing from 'expo-sharing';
import { getNotifications } from '../redux/slices/notificationSlice';
import api from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function triggerMobileNotification(title, message, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'ExamHub Notification',
        body: message || 'You have a new notification',
        data: data,
        sound: true,
      },
      trigger: null,
    });
  } catch (err) {
    console.log('Error triggering mobile notification:', err);
  }
}

export default function NotificationManager() {
  const dispatch = useDispatch();
  const { unreadCount, notifications } = useSelector(state => state.notifications);
  const { isAuthenticated, user } = useSelector(state => state.auth);
  
  const unreadCountRef = useRef(unreadCount);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
    notificationsRef.current = notifications;
  }, [unreadCount, notifications]);

  // Handle local notification clicks (e.g. file downloads)
  useEffect(() => {
    const responseListener = Notifications.addNotificationResponseReceivedListener(async response => {
      const data = response.notification.request.content.data;
      if (data && data.fileUri) {
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(data.fileUri, { UTI: 'public.html', mimeType: 'text/html' });
          }
        } catch (err) {
          console.log('Error opening file from notification:', err);
        }
      }
    });
    return () => Notifications.removeNotificationSubscription(responseListener);
  }, []);

  // Register for Expo Push Notifications to receive notifications when app is closed / not open
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const registerPushToken = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#8b5cf6',
          }).catch(() => {});
        }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || 'f15cfad8-a264-460c-a9df-1dd3ef343a23';
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId }).catch((e) => {
          console.log('Failed to get Expo push token:', e);
          return null;
        });
        if (tokenData && tokenData.data) {
          await api.post('/api/users/push-token', { pushToken: tokenData.data }).catch(() => {});
        }
      } catch (err) {
        console.log('Push token registration error:', err.message);
      }
    };
    registerPushToken();
  }, [isAuthenticated, user]);

  // Socket listener for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';
    const socket = io(baseUrl);
    const userId = String(user._id || user.id);

    const onConnect = () => {
      if (userId && userId !== 'undefined') {
        socket.emit('join_room', userId);
      }
    };

    if (socket.connected) {
      onConnect();
    }
    socket.on('connect', onConnect);

    socket.on('new_notification', (notif) => {
      if (notif) {
        // 1. Show real phone notification in mobile drawer
        triggerMobileNotification(
          notif.title || 'ExamHub Notification',
          notif.message || 'You have a new notification.',
          notif.data || {}
        );

        // If it's a chat message, don't show the in-app notification toast
        const isChatMessage = notif.data && notif.data.messageId;
        
        if (!isChatMessage) {
          // 2. Show in-app banner toast
          Toast.show({
            type: 'info',
            text1: notif.title || 'ExamHub Notification',
            text2: notif.message || 'You have a new notification.',
            visibilityTime: 4000,
            position: 'top',
            topOffset: 50
          });

          // 3. Refresh notifications list in redux
          dispatch(getNotifications());
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user, dispatch]);

  // Polling for new notifications backup
  useEffect(() => {
    let interval;
    if (isAuthenticated && user) {
      interval = setInterval(async () => {
        try {
          const prevCount = unreadCountRef.current;
          const prevNotifications = notificationsRef.current || [];
          
          const result = await dispatch(getNotifications()).unwrap();
          const newCount = result.unreadCount;
          
          if (newCount > prevCount) {
            const countDiff = Math.max(1, newCount - prevCount);
            const newNotifs = (result.notifications || []).slice(0, countDiff);
            newNotifs.forEach((newNotif, index) => {
              if (newNotif && (!prevNotifications.length || newNotif._id !== prevNotifications[0]?._id)) {
                triggerMobileNotification(
                  newNotif.title || 'New Notification',
                  newNotif.message || 'You have a new notification.',
                  newNotif.data || {}
                );

                if (index === 0) {
                  Toast.show({
                    type: 'info',
                    text1: newNotif.title || 'New Notification',
                    text2: newNotif.message || 'You have a new notification.',
                    visibilityTime: 4000,
                    position: 'top',
                    topOffset: 50
                  });
                }
              }
            });
          }
        } catch (error) {
          console.log('Error polling notifications:', error);
        }
      }, 60000); // 60 seconds (1 minute backup poll; Socket.IO handles real-time instant notifications)
    }
    return () => clearInterval(interval);
  }, [isAuthenticated, user, dispatch]);

  return null;
}
