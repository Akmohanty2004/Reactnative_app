import React, { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getSocket } from '../services/socketService';
import * as Sharing from 'expo-sharing';
import { getNotifications } from '../redux/slices/notificationSlice';
import api from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function triggerMobileNotification(title, message, data = {}) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ExamHub Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }).catch(() => {});
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'ExamHub Notification',
        body: message || 'You have a new notification',
        data: data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
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
  const { currentUserId } = useSelector(state => state.chat);
  const { notificationsEnabled } = useSelector(state => state.ui || { notificationsEnabled: true });
  
  const unreadCountRef = useRef(unreadCount);
  const notificationsRef = useRef(notifications);
  const currentChatRef = useRef(currentUserId);
  const notificationsEnabledRef = useRef(notificationsEnabled);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
    notificationsRef.current = notifications;
    currentChatRef.current = currentUserId;
    notificationsEnabledRef.current = notificationsEnabled;
  }, [unreadCount, notifications, currentUserId, notificationsEnabled]);

  // Immediate channel setup & permission check on mount
  useEffect(() => {
    const initNotifications = async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'ExamHub Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#8b5cf6',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
          }).catch(() => {});
        }
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (err) {
        console.log('Error initializing notifications channel:', err);
      }
    };
    initNotifications();
  }, []);

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
    return () => responseListener.remove();
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

  const scheduledExamIdsRef = useRef(new Set());
  const { exams } = useSelector(state => state.exams || { exams: [] });

  // Socket listener for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const userId = String(user._id || user.id);
    const activeSocket = getSocket(userId);

    const onConnect = () => {
      if (userId && userId !== 'undefined') {
        activeSocket.emit('join_room', userId);
      }
    };

    if (activeSocket.connected) {
      onConnect();
    }
    activeSocket.on('connect', onConnect);

    const handleNewNotification = (notif) => {
      if (notif) {
        if (notificationsEnabledRef.current === false) {
          return;
        }

        const isChatMessage = notif.data && (notif.data.messageId || notif.data.type === 'chat');
        const senderId = notif.data?.senderId || notif.senderId || notif.data?.sender?._id;
        const myUserId = String(user._id || user.id);

        if (senderId && String(senderId) === myUserId) {
          return;
        }

        if (isChatMessage) {
          if (String(senderId) !== String(currentChatRef.current)) {
            // triggerMobileNotification(notif.title || 'New Message', notif.message, notif.data);
            Toast.show({
              type: 'info',
              text1: notif.title || 'New Message',
              text2: notif.message,
              visibilityTime: 4000,
              position: 'top',
              topOffset: 50
            });
          }
        } else {
          // triggerMobileNotification(notif.title || 'ExamHub Notification', notif.message || 'You have a new notification.', notif.data);
          Toast.show({
            type: 'info',
            text1: notif.title || 'ExamHub Notification',
            text2: notif.message || 'You have a new notification.',
            visibilityTime: 4000,
            position: 'top',
            topOffset: 50
          });
          dispatch(getNotifications());
        }
      }
    };

    const handleExamPublished = (data) => {
      if (data && notificationsEnabledRef.current !== false) {
        triggerMobileNotification(
          data.title ? `New Exam Published: ${data.title}` : 'New Exam Published!',
          data.message || 'A new exam is now available on your dashboard.',
          data
        );
      }
    };

    const handleExamUpdated = (data) => {
      if (data && notificationsEnabledRef.current !== false) {
        triggerMobileNotification(
          data.title ? `Exam Updated: ${data.title}` : 'Exam Notification',
          data.message || 'An exam detail or schedule has been updated.',
          data
        );
      }
    };

    activeSocket.on('new_notification', handleNewNotification);
    if (activeSocket.connected) {
      onConnect();
    }
    activeSocket.on('connect', onConnect);

    activeSocket.on('exam_published', handleExamPublished);
    activeSocket.on('exam_updated', handleExamUpdated);

    return () => {
      activeSocket.off('connect', onConnect);
      activeSocket.off('new_notification', handleNewNotification);
      activeSocket.off('exam_published', handleExamPublished);
      activeSocket.off('exam_updated', handleExamUpdated);
    };
  }, [isAuthenticated, user, dispatch]);

  // Schedule local 30-minute prior native device notifications for upcoming exams
  useEffect(() => {
    if (!isAuthenticated || !user || !exams || !Array.isArray(exams)) return;

    const schedule30MinExamReminders = async () => {
      try {
        if (notificationsEnabledRef.current === false) return;
        const now = Date.now();
        for (const exam of exams) {
          if (!exam || !exam._id) continue;
          if (scheduledExamIdsRef.current.has(exam._id)) continue;

          const startTimeRaw = exam.startTime || exam.startDate || exam.createdAt;
          if (!startTimeRaw) continue;

          const examTime = new Date(startTimeRaw).getTime();
          // Calculate 30 minutes before exam start
          const reminderTime = new Date(examTime - 30 * 60 * 1000);

          if (reminderTime.getTime() > now) {
            scheduledExamIdsRef.current.add(exam._id);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: '⏰ Exam Starts in 30 Minutes!',
                body: `Your exam "${exam.title || 'Upcoming Exam'}" starts in 30 minutes. Get ready!`,
                data: { examId: exam._id, type: 'exam_reminder_30m' },
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: reminderTime,
            }).catch(e => console.log('Error scheduling 30m reminder:', e));
          }
        }
      } catch (err) {
        console.log('Error in 30m exam reminder scheduler:', err);
      }
    };

    schedule30MinExamReminders();
  }, [exams, isAuthenticated, user]);

  // Polling backup for new notifications
  useEffect(() => {
    let interval;
    if (isAuthenticated && user) {
      interval = setInterval(async () => {
        try {
          const prevCount = unreadCountRef.current;
          const prevNotifications = notificationsRef.current || [];
          const myUserId = String(user._id || user.id);
          
          const result = await dispatch(getNotifications()).unwrap();
          const newCount = result.unreadCount;
          
          if (newCount > prevCount) {
            const countDiff = Math.max(1, newCount - prevCount);
            const newNotifs = (result.notifications || []).slice(0, countDiff);
            newNotifs.forEach((newNotif, index) => {
              if (newNotif && (!prevNotifications.length || newNotif._id !== prevNotifications[0]?._id)) {
                const senderId = newNotif.data?.senderId || newNotif.senderId || newNotif.data?.sender?._id;
                // DO NOT trigger device notification for sender!
                if (senderId && String(senderId) === myUserId) return;

                // triggerMobileNotification(
                //   newNotif.title || 'New Notification',
                //   newNotif.message || 'You have a new notification.',
                //   newNotif.data || {}
                // );

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
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [isAuthenticated, user, dispatch]);

  return null;
}
