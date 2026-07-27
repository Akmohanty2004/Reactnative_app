import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { getNotifications } from '../redux/slices/notificationSlice';
import { logoutUser } from '../redux/slices/authSlice';

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

  // Polling for new notifications
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
            const newNotif = result.notifications[0];
            if (newNotif && (!prevNotifications.length || newNotif._id !== prevNotifications[0]._id)) {
              // Show in-app push notification
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
        } catch (error) {
          const errStr = typeof error === 'string' ? error : (error?.message || '');
          if (errStr.toLowerCase().includes('auth') || errStr.toLowerCase().includes('token') || errStr.toLowerCase().includes('expired')) {
            dispatch(logoutUser());
            return;
          }
        }
      }, 30000); // 30 seconds
    }
    return () => clearInterval(interval);
  }, [isAuthenticated, user, dispatch]);

  return null;
}
