import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform, Animated, AppState, SafeAreaView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getContacts, setContactOnlineStatus } from '../../redux/slices/chatSlice';
import { io } from 'socket.io-client';

import api from '../../services/api';
import BouncyTouchable from '../../components/BouncyTouchable';

const getImageUrl = (path) => {
  if (!path) return null;
  if (typeof path !== 'string') return null;
  if (path.startsWith('data:') || path.startsWith('file://')) return path;
  const normalized = path.replace(/\\/g, '/');
  if (normalized.includes('uploads/')) {
    const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';
    const cleanPath = normalized.replace(/^.*(uploads\/)/, 'uploads/');
    return `${baseUrl}/${cleanPath.replace(/^\//, '')}`;
  }
  if (path.startsWith('http')) return path;
  const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';
  return `${baseUrl}/${normalized.replace(/^\//, '')}`;
};

const AnimatedChatItem = ({ item, index, navigation, colors, getImageUrl }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100, // Stagger effect
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <BouncyTouchable
        style={[styles.chatItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('ChatRoom', { user: item })}
        activeScale={0.97}
      >
        <View style={styles.avatarContainer}>
          {item.profileImage ? (
            <Image source={{ uri: getImageUrl(item.profileImage) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {item.isOnline && <View style={[styles.onlineBadge, { borderColor: colors.card }]} />}
        </View>
        <View style={styles.chatInfo}>
          <Text style={[styles.chatName, { color: colors.headerText }]}>{item.name}</Text>
          <Text style={[styles.chatRole, { color: colors.subText }]}>{item.role.charAt(0).toUpperCase() + item.role.slice(1)}</Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
          </View>
        )}
        <Feather name="chevron-right" size={20} color={colors.subText} style={{ marginLeft: 10 }} />
      </BouncyTouchable>
    </Animated.View>
  );
};

export default function ChatListScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { contacts, isLoadingContacts } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const isTeacher = user?.role === 'teacher';

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    headerBg: isDarkMode ? '#000000' : '#ffffff',
    headerText: isDarkMode ? '#ffffff' : '#0f172a',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
  };

  useFocusEffect(
    useCallback(() => {
      dispatch(getContacts());
    }, [dispatch])
  );

  useEffect(() => {
    const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';
    const newSocket = io(baseUrl);

    if (user?._id) {
      newSocket.emit('join_room', String(user._id));
    }

    newSocket.on('user_online', (uid) => {
      dispatch(setContactOnlineStatus({ userId: uid, isOnline: true }));
    });
    newSocket.on('user_offline', (uid) => {
      dispatch(setContactOnlineStatus({ userId: uid, isOnline: false }));
    });

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        if (!newSocket.connected) {
          newSocket.connect();
        }
        newSocket.emit('set_status', { isOnline: true });
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (newSocket.connected) {
          newSocket.emit('set_status', { isOnline: false });
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription?.remove();
      // newSocket.disconnect();
    };
  }, [dispatch, user?._id]);

  const renderItem = ({ item, index }) => (
    <AnimatedChatItem item={item} index={index} navigation={navigation} colors={colors} getImageUrl={getImageUrl} />
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent={false} backgroundColor={colors.headerBg} />
      <View style={[styles.header, { paddingTop: 15, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <BouncyTouchable style={styles.backBtn} onPress={() => navigation.goBack()} activeScale={0.8}>
          <Feather name="arrow-left" size={24} color={colors.headerText} />
        </BouncyTouchable>
        <Text style={[styles.headerTitle, { color: '#00f2fe', textShadowColor: 'rgba(0,242,254,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 6 }]}>Messages</Text>
      </View>

      {isLoadingContacts ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={48} color={colors.subText} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>No contacts found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 15,
    backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155'
  },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 15 },
  chatItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', padding: 15,
    borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#334155'
  },
  avatarContainer: { marginRight: 15, position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  onlineBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2, borderColor: '#1e293b'
  },
  chatInfo: { flex: 1 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  chatRole: { color: '#94a3b8', fontSize: 12 },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center'
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 10 }
});
