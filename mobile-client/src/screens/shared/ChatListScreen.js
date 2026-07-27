import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getContacts } from '../../redux/slices/chatSlice';

import api from '../../services/api';

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

export default function ChatListScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { contacts, isLoadingContacts } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const isTeacher = user?.role === 'teacher';

  useFocusEffect(
    useCallback(() => {
      dispatch(getContacts());
    }, [dispatch])
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatRoom', { user: item })}
    >
      <View style={styles.avatarContainer}>
        {item.profileImage ? (
          <Image source={{ uri: getImageUrl(item.profileImage) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {item.isOnline && <View style={styles.onlineBadge} />}
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.chatRole}>{item.role.charAt(0).toUpperCase() + item.role.slice(1)}</Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={20} color="#64748b" style={{ marginLeft: 10 }} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
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
              <Feather name="message-square" size={48} color="#475569" />
              <Text style={styles.emptyText}>No contacts found</Text>
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
