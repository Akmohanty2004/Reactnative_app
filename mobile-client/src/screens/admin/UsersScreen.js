import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { getUsers, deleteUser } from '../../redux/slices/adminSlice';
import Toast from 'react-native-toast-message';

const UserSkeletonLoader = ({ isDarkMode }) => (
  <View style={{ paddingVertical: 10 }}>
    {[1, 2, 3, 4, 5, 6].map((k) => (
      <View
        key={k}
        style={{
          height: 76,
          backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
          borderRadius: 14,
          marginBottom: 12,
        }}
      />
    ))}
  </View>
);

export default function UsersScreen({ navigation }) {
  const dispatch = useDispatch();
  const { users, isLoading } = useSelector(state => state.admin);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const currentUser = useSelector(state => state.auth.user);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(getUsers());
    }, [dispatch])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(getUsers());
    setRefreshing(false);
  }, [dispatch]);

  const handleDelete = (userId, userName, userRole) => {
    if (userRole === 'admin' || userId === currentUser?._id) {
      Alert.alert("Protected Account", "Admin accounts and your own account cannot be deleted.");
      return;
    }
    Alert.alert(
      "Delete User",
      `Are you sure you want to permanently delete "${userName}"? This will also delete their exams and results.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
          dispatch(deleteUser(userId)).then((res) => {
            if (!res.error) Toast.show({ type: 'success', text1: 'Success', text2: 'User deleted' });
          });
        }}
      ]
    );
  };

  const filteredUsers = (users || []).filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' };
      case 'teacher': return { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' };
      case 'student': return { bg: 'rgba(16,185,129,0.1)', text: '#10b981' };
      default: return { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8' };
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (typeof path !== 'string') return null;
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('file://')) return path;
    const cleanPath = path.replace(/\\/g, '/').replace(/^.*(uploads\/)/, 'uploads/');
    return `https://exam-app-backend-vqos.vercel.app/${cleanPath.replace(/^\//, '')}`;
  };

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    cardBg: isDarkMode ? '#1e293b' : 'white',
    cardBorder: isDarkMode ? '#334155' : '#e2e8f0',
    inputBg: isDarkMode ? '#1e293b' : 'white',
    inputBorder: isDarkMode ? '#334155' : '#cbd5e1',
    headerTitle: isDarkMode ? 'white' : '#1e293b',
    deleteBtnBg: isDarkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2',
    deleteBtnColor: '#ef4444'
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginRight: 15 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: colors.headerTitle }]}>User Management</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>Manage all users of the platform</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={{ padding: 8, borderRadius: 12, backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }}
          onPress={handleRefresh}
          disabled={refreshing || isLoading}
        >
          {refreshing || isLoading ? (
            <ActivityIndicator size="small" color="#8b5cf6" />
          ) : (
            <Feather name="refresh-cw" size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
        <Feather name="search" size={20} color={colors.subText} style={styles.searchIcon} />
        <TextInput 
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search users by name or email..."
          placeholderTextColor={colors.subText}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Feather name="x-circle" size={18} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.listContainer} 
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor="#8b5cf6" 
            colors={['#8b5cf6', '#3b82f6']} 
          />
        }
      >
        {(isLoading && (!users || users.length === 0)) ? (
          <UserSkeletonLoader isDarkMode={isDarkMode} />
        ) : (
          <>
            {filteredUsers.map(user => {
              const roleStyle = getRoleColor(user.role);
              const isOnline = user.lastLogin && new Date(user.lastLogin) >= new Date(Date.now() - 2 * 60 * 1000);
              
              return (
                <View key={user._id} style={[styles.userCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.userInfo}>
                    <View style={styles.avatarWrapper}>
                      {user.profileImage ? (
                        <Image source={{ uri: getImageUrl(user.profileImage) }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || 'U'}</Text>
                        </View>
                      )}
                      {isOnline && <View style={styles.onlineDot} />}
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
                      <Text style={[styles.userEmail, { color: colors.subText }]} numberOfLines={1}>{user.email}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.metaContainer}>
                    <View style={styles.badgesRow}>
                      <View style={[styles.badge, { backgroundColor: roleStyle.bg }]}>
                        <Text style={[styles.badgeText, { color: roleStyle.text }]}>{user.role}</Text>
                      </View>
                      {!isOnline && (
                        <View style={[styles.badge, { backgroundColor: isDarkMode ? 'rgba(148,163,184,0.1)' : '#f1f5f9' }]}>
                          <Text style={[styles.badgeText, { color: colors.subText }]}>Offline</Text>
                        </View>
                      )}
                    </View>
                    
                    {user.role !== 'admin' && user._id !== currentUser?._id ? (
                      <TouchableOpacity 
                        style={[styles.deleteBtn, { backgroundColor: colors.deleteBtnBg }]}
                        onPress={() => handleDelete(user._id, user.name, user.role)}
                      >
                        <Feather name="trash-2" size={18} color={colors.deleteBtnColor} />
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.deleteBtn, { backgroundColor: isDarkMode ? 'rgba(148,163,184,0.1)' : '#f1f5f9' }]}>
                        <Feather name="shield" size={16} color={colors.subText} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
            
            {filteredUsers.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="users" size={48} color={colors.subText} style={{ opacity: 0.5, marginBottom: 15 }} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No users found</Text>
                <Text style={[styles.emptySubText, { color: colors.subText }]}>Try adjusting your search criteria</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50, paddingBottom: 15 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 20, borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, height: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  
  listContainer: { paddingHorizontal: 20 },
  userCard: { borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarWrapper: { position: 'relative', marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', borderWidth: 2, borderColor: 'white' },
  
  userDetails: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  userEmail: { fontSize: 13 },
  
  metaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.1)', paddingTop: 12 },
  badgesRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  
  deleteBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { fontSize: 14 }
});
