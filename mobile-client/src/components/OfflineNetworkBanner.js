import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import api from '../services/api';
import { getNotifications } from '../redux/slices/notificationSlice';
import { getStudentExams, getTeacherExams } from '../redux/slices/examSlice';
import { getAdminDashboardStats } from '../redux/slices/adminSlice';
import { getContacts } from '../redux/slices/chatSlice';
import { getStudentResults, getLeaderboard, getToppers } from '../redux/slices/resultSlice';

export default function OfflineNetworkBanner() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth || {});
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  const handleAutoReloadData = async () => {
    try {
      setIsSyncing(true);
      dispatch(getNotifications());
      dispatch(getContacts());
      if (user) {
        if (user.role === 'admin') {
          dispatch(getAdminDashboardStats());
        } else if (user.role === 'teacher') {
          dispatch(getTeacherExams());
        } else {
          dispatch(getStudentExams());
          dispatch(getStudentResults());
          dispatch(getLeaderboard());
          dispatch(getToppers());
        }
      }
    } catch (err) {
      console.log('Error auto reloading data on network restore:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 2500);
    }
  };

  useEffect(() => {
    let wasOffline = false;
    let failCount = 0;

    const checkConnection = async () => {
      try {
        const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';
        const targets = [
          'https://clients3.google.com/generate_204',
          'https://exam-app-backend-vqos.vercel.app/api/ping',
          `${baseUrl}/api/ping`
        ];

        let success = false;
        for (const url of targets) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(url, {
              method: 'GET',
              signal: controller.signal,
              cache: 'no-cache'
            });
            clearTimeout(timeoutId);
            if (res && (res.status === 200 || res.status === 204 || res.ok)) {
              success = true;
              break;
            }
          } catch (e) {
            // try next URL
          }
        }

        if (success) {
          failCount = 0;
          if (wasOffline) {
            setIsOffline(false);
            wasOffline = false;
            setShowBackOnline(true);
            handleAutoReloadData();
            setTimeout(() => {
              setShowBackOnline(false);
            }, 4000);
          } else {
            setIsOffline(false);
          }
        } else {
          failCount += 1;
          if (failCount >= 2 && !wasOffline) {
            wasOffline = true;
            setIsOffline(true);
          }
        }
      } catch (err) {
        failCount += 1;
        if (failCount >= 2 && !wasOffline) {
          wasOffline = true;
          setIsOffline(true);
        }
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isOffline || showBackOnline) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [isOffline, showBackOnline, slideAnim]);

  if (!isOffline && !showBackOnline) {
    return null;
  }

  const bgColor = isOffline ? '#ef4444' : '#10b981';
  const title = isOffline ? 'Check Internet Connection' : 'Back Online!';
  const subtitle = isOffline
    ? 'Internet connection is offline or slow. Please check your Wi-Fi or mobile data.'
    : 'Connection restored. Automatically refreshing data...';
  const iconName = isOffline ? 'wifi-off' : 'wifi';

  return (
    <Animated.View style={[styles.bannerContainer, { backgroundColor: bgColor, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        {showBackOnline && isSyncing ? (
          <ActivityIndicator size="small" color="#ffffff" style={styles.icon} />
        ) : (
          <Feather name={iconName} size={20} color="#ffffff" style={styles.icon} />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 45 : 30,
    left: 16,
    right: 16,
    zIndex: 99999,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
});
