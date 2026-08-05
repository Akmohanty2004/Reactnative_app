import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, RefreshControl, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getUsers, deleteUser } from '../../redux/slices/adminSlice';
import Toast from 'react-native-toast-message';

import { UserSkeleton } from '../../components/SkeletonLoader';
import { playRefreshSound } from '../../utils/SoundManager';
import api from '../../services/api';

export default function UsersScreen({ navigation }) {
  const dispatch = useDispatch();
  const { users, isLoading } = useSelector(state => state.admin);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const currentUser = useSelector(state => state.auth.user);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedRole, setSelectedRole] = useState('All'); // 'All', 'teacher', 'student'
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [isFetchingClasses, setIsFetchingClasses] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(getUsers());
      fetchClasses();
    }, [dispatch])
  );

  const fetchClasses = async () => {
    setIsFetchingClasses(true);
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data.classes || []);
    } catch (error) {
      console.log('Error fetching classes:', error);
    } finally {
      setIsFetchingClasses(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    playRefreshSound();
    setRefreshing(true);
    await dispatch(getUsers());
    await fetchClasses();
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

  const filteredUsers = (users || []).filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;

    if (selectedRole !== 'All') {
      if (user.role !== selectedRole) return false;
    }

    if (selectedRole === 'student' && selectedClass !== 'All') {
      if (!user.classGroup) return false;
      const groups = user.classGroup.split(',').map(s => s.trim());
      if (!groups.includes(selectedClass)) return false;
    }

    return true;
  });

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

      {/* Role Filter */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'teacher', 'student'].map(role => (
            <TouchableOpacity
              key={role}
              style={[styles.filterPill, selectedRole === role ? styles.filterPillActive : { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              onPress={() => {
                setSelectedRole(role);
                setSelectedClass('All');
              }}
            >
              <Text style={[styles.filterPillText, selectedRole === role ? styles.filterPillTextActive : { color: colors.subText }]}>
                {role === 'All' ? 'All Roles' : role === 'teacher' ? 'Teachers' : 'Students'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Class Filter (Only show if Student is selected) */}
      {selectedRole === 'student' && (
        <View style={[styles.filterWrapper, { marginTop: 0 }]}>
          {isFetchingClasses ? (
            <ActivityIndicator size="small" color="#8b5cf6" style={{ margin: 10 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterPill, selectedClass === 'All' ? styles.filterPillActive : { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                onPress={() => setSelectedClass('All')}
              >
                <Text style={[styles.filterPillText, selectedClass === 'All' ? styles.filterPillTextActive : { color: colors.subText }]}>All Classes</Text>
              </TouchableOpacity>
              {classes.map(c => (
                <TouchableOpacity
                  key={c._id}
                  style={[styles.filterPill, selectedClass === c.name ? styles.filterPillActive : { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => setSelectedClass(c.name)}
                >
                  <Text style={[styles.filterPillText, selectedClass === c.name ? styles.filterPillTextActive : { color: colors.subText }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

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
        {(isLoading || refreshing) ? (
          <UserSkeleton isDarkMode={isDarkMode} count={6} />
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
                        <LinearGradient
                          colors={user.role === 'admin' ? ['#8b5cf6', '#6d28d9'] : user.role === 'teacher' ? ['#3b82f6', '#1d4ed8'] : ['#10b981', '#047857']}
                          style={styles.avatarPlaceholder}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || 'U'}</Text>
                        </LinearGradient>
                      )}
                      {isOnline && <View style={[styles.onlineDot, { borderColor: colors.cardBg }]} />}
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
                        <View style={[styles.badge, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
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
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 15, borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, height: 50, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 6 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, fontWeight: '500' },
  
  filterWrapper: { marginBottom: 15 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  filterPillActive: { backgroundColor: '#8b5cf6' },
  filterPillText: { fontSize: 14, fontWeight: '700' },
  filterPillTextActive: { color: 'white' },
  
  listContainer: { paddingHorizontal: 20 },
  userCard: { borderRadius: 24, padding: 20, marginBottom: 18, borderWidth: 1, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  avatarWrapper: { position: 'relative', marginRight: 18 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 28, fontWeight: '900' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10b981', borderWidth: 2.5 },
  
  userDetails: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 19, fontWeight: '800', marginBottom: 6, letterSpacing: 0.3 },
  userEmail: { fontSize: 14, opacity: 0.8 },
  
  metaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.15)', paddingTop: 16 },
  badgesRow: { flexDirection: 'row', gap: 10 },
  badge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  badgeText: { fontSize: 13, fontWeight: '900', textTransform: 'capitalize', letterSpacing: 0.5 },
  
  deleteBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  emptySubText: { fontSize: 15, opacity: 0.7 }
});
