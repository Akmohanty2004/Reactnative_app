import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Modal, ActivityIndicator, Switch , Platform, StatusBar, Animated, Easing } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfile, getCurrentUser, changePassword, logoutUser, uploadProfileImage } from '../../redux/slices/authSlice';
import { getStudentResults } from '../../redux/slices/resultSlice';
import { toggleTheme, toggleChatbot, toggleNotificationsEnabled } from '../../redux/slices/uiSlice';
import api from '../../services/api';
import BouncyTouchable from '../../components/BouncyTouchable';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const { user, token } = useSelector(state => state.auth);
  const { results } = useSelector(state => state.results);
  const { unreadCount } = useSelector(state => state.notifications);
  const { theme, showChatbot, notificationsEnabled } = useSelector(state => state.ui || { theme: 'dark', showChatbot: true, notificationsEnabled: true });

  const [isEditing, setIsEditing] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', department: '', address: '', college: '', age: '', gender: ''
  });
  
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showClassModal, setShowClassModal] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [isRequesting, setIsRequesting] = useState(false);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [cardSlideAnim] = useState(new Animated.Value(50));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [floatAnim] = useState(new Animated.Value(0));
  const [statsFade] = useState(new Animated.Value(0));
  const getPasswordStrength = (pass) => {
    if (!pass) return { label: '', color: 'transparent', score: 0 };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    if (score === 1) return { label: 'Weak', color: '#ef4444', score: 1 };
    if (score === 2) return { label: 'Fair', color: '#f59e0b', score: 2 };
    if (score >= 3) return { label: 'Strong', color: '#10b981', score: 3 };
    return { label: '', color: 'transparent', score: 0 };
  };
  
  const strength = getPasswordStrength(passwordData.newPassword);
  const hasMinLength = passwordData.newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordData.newPassword);
  const hasNumberOrSpecial = /[0-9]/.test(passwordData.newPassword) || /[^A-Za-z0-9]/.test(passwordData.newPassword);

  useEffect(() => {
    dispatch(getCurrentUser());
    dispatch(getStudentResults());

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(cardSlideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(statsFade, { toValue: 1, duration: 500, useNativeDriver: true })
      ])
    ]).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: -8, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ])
    ).start();
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        department: user.department || '',
        address: user.address || '',
        college: user.college || '',
        age: user.age ? String(user.age) : '',
        gender: user.gender || '',
        classGroup: user.classGroup || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/api/classes');
        setAvailableClasses(res.data.classes || []);
      } catch (err) {
        console.log('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, []);

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    text: isDarkMode ? 'white' : '#050505',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? 'rgba(255,255,255,0.03)' : 'white',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    primary: '#06b6d4',
    modalBg: isDarkMode ? isDarkMode ? 'rgba(255,255,255,0.03)' : 'white' : 'white',
    inputBg: isDarkMode ? isDarkMode ? '#000000' : '#f8fafc' : '#f1f5f9',
  };

  const getStats = () => {
    const publishedResults = results?.filter(r => r.isPublished) || [];
    const examsTaken = results?.filter(r => r.status === 'submitted' || r.isCompleted)?.length || 0;
    const passedExams = publishedResults.filter(r => r.isPassed).length;
    
    const scores = publishedResults.map(r => r.percentage || 0);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
      
    const ranks = publishedResults.map(r => r.rank).filter(r => r != null && r > 0);
    const rank = ranks.length > 0 ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length) : '-';
    
    return {
      total: examsTaken,
      passed: passedExams,
      average: avgScore,
      rank: rank === '-' ? '-' : `#${rank}`
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { ...formData };
      if (payload.gender) {
        payload.gender = payload.gender.toLowerCase();
      }
      await dispatch(updateProfile(payload)).unwrap();
      setIsEditing(false);
      await dispatch(getCurrentUser());
      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };
  const handleClassRequest = async (requestedClass) => {
    if (!requestedClass || requestedClass === user?.classGroup) return;
    setIsRequesting(true);
    try {
      await api.post('/api/users/request-class-change', { requestedClass });
      Toast.show({ type: 'success', text1: 'Class change requested!' });
      setShowClassModal(false);
      dispatch(getCurrentUser()); // Refresh user data to show pending status
    } catch (error) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to request change' });
    } finally {
      setIsRequesting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter old and new password' });
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'New passwords do not match' });
    }
    setIsSaving(true);
    try {
      await dispatch(changePassword({ 
        currentPassword: passwordData.oldPassword,
        oldPassword: passwordData.oldPassword, 
        newPassword: passwordData.newPassword 
      })).unwrap();
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Password updated successfully' });
    } catch (error) {
      // Error handled in slice
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        const fd = new FormData();
        fd.append('profileImage', { uri, name: filename, type });
        
        await dispatch(uploadProfileImage(fd)).unwrap();
        setImageTimestamp(Date.now());
        Toast.show({ type: 'success', text1: 'Success', text2: 'Profile image updated' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to pick image' });
    }
  };


  const stats = getStats();
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:image')) return path;
    if (path.startsWith('http')) {
      const sep = path.includes('?') ? '&' : '?';
      return `${path}${sep}t=${imageTimestamp}`;
    }
    const cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');
    return `https://exam-app-backend-vqos.vercel.app/${cleanPath}?t=${imageTimestamp}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Custom Header */}
        <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingHorizontal: 0, paddingBottom: 25, paddingTop: topPadding + 10, flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginRight: 15 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My <Text style={{color: '#6366f1'}}>Profile</Text></Text>
            <Text style={[styles.headerSubtitle, { color: colors.subText }]} numberOfLines={2}>Manage your account and track your performance</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={[styles.iconBtn, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : colors.border }]} onPress={() => navigation.navigate('Notifications')}>
              <Feather name="bell" size={20} color={colors.text} />
              {unreadCount > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : colors.border }]} onPress={() => setIsSettingsVisible(true)}>
              <Feather name="settings" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <Animated.View style={[styles.profileCard, { opacity: fadeAnim, transform: [{ translateY: cardSlideAnim }], shadowColor: isDarkMode ? '#6366f1' : '#4f46e5', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 25, elevation: 15 }]}>
          <LinearGradient colors={isDarkMode ? ['#1e1b4b', isDarkMode ? '#000000' : '#f8fafc'] : ['#6366f1', '#4f46e5']} style={StyleSheet.absoluteFillObject} borderRadius={24} />
          
          <View style={styles.profileTopRow}>
            <Animated.View style={[styles.avatarWrapper, { transform: [{ translateY: floatAnim }] }]}>
              <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(6, 182, 212, 0.4)', borderRadius: 100, transform: [{ scale: pulseAnim }] }]} />
              <View style={[styles.avatarContainer, { borderColor: '#6366f1', borderWidth: 3 }]}>
                {user?.profileImage ? (
                  <Image source={{ uri: getImageUrl(user.profileImage) }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.editAvatarBtn} onPress={handlePickImage}>
                <Feather name="camera" size={14} color="white" />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: 'white' }]}>{user?.name || 'User'}</Text>
              <View style={styles.roleBadge}>
                <Feather name="user" size={12} color="#c4b5fd" style={{ marginRight: 4 }} />
                <Text style={styles.roleText}>STUDENT</Text>
            </View>
              
              <Text style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 15 }}>{user?.email || 'N/A'}</Text>
              
              {user?.classChangeStatus === 'pending' ? (
                <View style={styles.classStatusBadge}>
                  <Feather name="clock" size={14} color="#f59e0b" style={{ marginRight: 5 }} />
                  <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '600' }}>Change pending</Text>
            </View>
              ) : (
                <TouchableOpacity style={styles.classStatusBadge} onPress={() => setShowClassModal(true)}>
                  <Feather name="refresh-cw" size={14} color="#a78bfa" style={{ marginRight: 5 }} />
                  <Text style={{ color: '#a78bfa', fontSize: 12, fontWeight: '600' }}>Request Class Change</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            <BouncyTouchable style={styles.actionBtnEdit} onPress={() => setIsEditing(true)} activeScale={0.9}>
              <Feather name="edit-2" size={16} color="white" style={styles.actionIcon} />
              <Text style={styles.actionBtnTextEdit}>Edit Profile</Text>
            </BouncyTouchable>
            <BouncyTouchable style={styles.actionBtnPass} onPress={() => setShowPasswordModal(true)} activeScale={0.9}>
              <Feather name="lock" size={16} color="white" style={styles.actionIcon} />
              <Text style={styles.actionBtnTextPass}>Change Password</Text>
            </BouncyTouchable>
          </View>
        </Animated.View>

        <Animated.View style={[styles.sectionHeader, { opacity: statsFade }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Overview</Text>
          <BouncyTouchable activeScale={0.9}>
            <Text style={styles.viewAllText}>View All <Feather name="chevron-right" size={14} /></Text>
          </BouncyTouchable>
        </Animated.View>

        {/* Horizontal Performance Grid */}
        <Animated.View style={[styles.perfGrid, { opacity: statsFade, transform: [{ translateY: slideAnim }] }]}>
          <BouncyTouchable style={[styles.perfCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: isDarkMode ? '#000' : '#475569', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }]} activeScale={0.92}>
            <View style={[styles.perfIconBox, { backgroundColor: 'rgba(56,189,248,0.15)' }]}>
              <Feather name="file-text" size={24} color="#38bdf8" />
            </View>
            <Text style={[styles.perfValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.perfLabel, { color: colors.subText }]}>Exams Taken</Text>
          </BouncyTouchable>

          <BouncyTouchable style={[styles.perfCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: isDarkMode ? '#000' : '#475569', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }]} activeScale={0.92}>
            <View style={[styles.perfIconBox, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
              <Feather name="check-circle" size={24} color="#10b981" />
            </View>
            <Text style={[styles.perfValue, { color: colors.text }]}>{stats.passed}</Text>
            <Text style={[styles.perfLabel, { color: colors.subText }]}>Passed</Text>
          </BouncyTouchable>

          <BouncyTouchable style={[styles.perfCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: isDarkMode ? '#000' : '#475569', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }]} activeScale={0.92}>
            <View style={[styles.perfIconBox, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
              <Feather name="trending-up" size={24} color="#6366f1" />
            </View>
            <Text style={[styles.perfValue, { color: colors.text }]}>{stats.average}%</Text>
            <Text style={[styles.perfLabel, { color: colors.subText }]}>Avg Score</Text>
          </BouncyTouchable>

          <BouncyTouchable style={[styles.perfCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: isDarkMode ? '#000' : '#475569', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }]} activeScale={0.92}>
            <View style={[styles.perfIconBox, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <Feather name="award" size={24} color="#f59e0b" />
            </View>
            <Text style={[styles.perfValue, { color: colors.text }]}>{stats.rank}</Text>
            <Text style={[styles.perfLabel, { color: colors.subText }]}>Rank</Text>
          </BouncyTouchable>
        </Animated.View>

        {/* Additional Information */}
        <Animated.View style={{ marginTop: 25, opacity: statsFade }}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 15 }]}>Additional Information</Text>
          <View style={[styles.infoCard, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.95)', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', shadowColor: isDarkMode ? '#000' : '#64748b', shadowOffset: {width:0, height:12}, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 }]}>
            <BouncyTouchable style={[styles.infoRow, { borderBottomColor: colors.border }]} activeScale={0.97}>
              <View style={styles.infoRowLeft}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
                  <Feather name="users" size={16} color="#6366f1" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.subText }]}>Class Group</Text>
            </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.classGroup || 'Unassigned'}</Text>
            </BouncyTouchable>
            
            <BouncyTouchable style={[styles.infoRow, { borderBottomColor: colors.border }]} activeScale={0.97}>
              <View style={styles.infoRowLeft}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <Feather name="phone" size={16} color="#10b981" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.subText }]}>Phone</Text>
            </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.phone || 'Not specified'}</Text>
            </BouncyTouchable>

            <BouncyTouchable style={[styles.infoRow, { borderBottomColor: colors.border }]} activeScale={0.97}>
              <View style={styles.infoRowLeft}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                  <Feather name="briefcase" size={16} color="#f59e0b" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.subText }]}>Department</Text>
            </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.department || 'Not specified'}</Text>
            </BouncyTouchable>

            <BouncyTouchable style={[styles.infoRow, { borderBottomColor: colors.border }]} activeScale={0.97}>
              <View style={styles.infoRowLeft}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(236,72,153,0.15)' }]}>
                  <Feather name="map" size={16} color="#ec4899" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.subText }]}>College</Text>
            </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.college || 'Not specified'}</Text>
            </BouncyTouchable>

            <BouncyTouchable style={[styles.infoRow, { borderBottomColor: colors.border }]} activeScale={0.97}>
              <View style={styles.infoRowLeft}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(56,189,248,0.15)' }]}>
                  <Feather name="user" size={16} color="#38bdf8" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.subText }]}>Gender & Age</Text>
            </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.gender ? (user.gender.charAt(0).toUpperCase() + user.gender.slice(1)) : 'N/A'} • {user?.age || 'N/A'} yrs
              </Text>
            </BouncyTouchable>
            
            <BouncyTouchable style={[styles.infoRow, { borderBottomColor: 'transparent' }]} activeScale={0.97}>
              <View style={styles.infoRowLeft}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(148,163,184,0.15)' }]}>
                  <Feather name="map-pin" size={16} color="#94a3b8" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.subText }]}>Address</Text>
            </View>
              <Text style={[styles.infoValue, { color: colors.text, maxWidth: '50%', textAlign: 'right' }]}>{user?.address || 'Not specified'}</Text>
            </BouncyTouchable>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={{ marginTop: 25, opacity: statsFade, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 15 }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <BouncyTouchable 
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }]}
              onPress={() => navigation.navigate('Exams')}
            >
              <View style={[styles.quickActionIconWrapper, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
                <Feather name="file-text" size={24} color="#6366f1" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>My Exams</Text>
            </BouncyTouchable>
            
            <BouncyTouchable 
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }]}
              onPress={() => navigation.navigate('Results')}
            >
              <View style={[styles.quickActionIconWrapper, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <Feather name="bar-chart-2" size={24} color="#10b981" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>My Results</Text>
            </BouncyTouchable>
            
            <BouncyTouchable 
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }]}
              onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Bookmarks feature is under development.' })}
            >
              <View style={[styles.quickActionIconWrapper, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <Feather name="bookmark" size={24} color="#f59e0b" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Bookmarks</Text>
            </BouncyTouchable>
            
            <BouncyTouchable 
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }]}
              onPress={() => setIsSettingsVisible(true)}
            >
              <View style={[styles.quickActionIconWrapper, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
                <Feather name="settings" size={24} color="#6366f1" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Settings</Text>
            </BouncyTouchable>
          </View>
        </Animated.View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: isDarkMode ? 'rgba(239,68,68,0.2)' : '#fecaca' }]}
          onPress={() => dispatch(logoutUser())}
        >
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={isSettingsVisible} transparent animationType="slide">
        <View style={styles.settingsOverlay}>
          <TouchableOpacity style={styles.settingsCloseArea} onPress={() => setIsSettingsVisible(false)} />
          <View style={[styles.settingsContent, { backgroundColor: isDarkMode ? '#09090b' : '#ffffff' }]}>
            <View style={styles.settingsDragIndicator} />
            <View style={styles.settingsHeader}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>Settings</Text>
              <TouchableOpacity onPress={() => setIsSettingsVisible(false)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: colors.subText }]}>PREFERENCES</Text>
                
                <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(6,182,212,0.1)' }]}>
                      <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color="#6366f1" />
                    </View>
                    <Text style={[styles.settingsRowText, { color: colors.text }]}>Dark Mode</Text>
            </View>
                  <Switch
                    value={isDarkMode}
                    onValueChange={() => dispatch(toggleTheme())}
                    trackColor={{ false: "#cbd5e1", true: "#818cf8" }}
                    thumbColor={isDarkMode ? "#6366f1" : "#f1f5f9"}
                  />
                </View>

                <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                      <Feather name="message-square" size={20} color="#10b981" />
                    </View>
                    <Text style={[styles.settingsRowText, { color: colors.text }]}>Show AI Assistant</Text>
                  </View>
                  <Switch
                    value={showChatbot !== false}
                    onValueChange={() => dispatch(toggleChatbot())}
                    trackColor={{ false: "#cbd5e1", true: "#34d399" }}
                    thumbColor={showChatbot !== false ? "#10b981" : "#f1f5f9"}
                  />
                </View>

                <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
                      <Feather name="bell" size={20} color="#8b5cf6" />
                    </View>
                    <Text style={[styles.settingsRowText, { color: colors.text }]}>Device Notifications</Text>
                  </View>
                  <Switch
                    value={notificationsEnabled !== false}
                    onValueChange={() => {
                      dispatch(toggleNotificationsEnabled());
                      Toast.show({
                        type: 'info',
                        text1: 'Device Notifications',
                        text2: notificationsEnabled !== false ? 'Notifications disabled' : 'Notifications enabled'
                      });
                    }}
                    trackColor={{ false: "#cbd5e1", true: "#a78bfa" }}
                    thumbColor={notificationsEnabled !== false ? "#8b5cf6" : "#f1f5f9"}
                  />
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: colors.subText }]}>ACCOUNT</Text>

                <TouchableOpacity 
                  style={[styles.settingsRow, { borderBottomColor: colors.border }]}
                  onPress={() => { setIsSettingsVisible(false); setIsEditing(true); }}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(6,182,212,0.1)' }]}>
                      <Feather name="user" size={20} color="#6366f1" />
                    </View>
                    <Text style={[styles.settingsRowText, { color: colors.text }]}>Edit Profile</Text>
            </View>
                  <Feather name="chevron-right" size={20} color={colors.subText} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.settingsRow, { borderBottomColor: colors.border }]}
                  onPress={() => { setIsSettingsVisible(false); setShowPasswordModal(true); }}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                      <Feather name="lock" size={20} color="#f59e0b" />
                    </View>
                    <Text style={[styles.settingsRowText, { color: colors.text }]}>Change Password</Text>
            </View>
                  <Feather name="chevron-right" size={20} color={colors.subText} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.settingsRow, { borderBottomColor: colors.border }]}
                  onPress={() => { setIsSettingsVisible(false); setPrivacyModalVisible(true); }}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                      <Feather name="shield" size={20} color="#f59e0b" />
                    </View>
                    <Text style={[styles.settingsRowText, { color: colors.text }]}>Manage Account Security</Text>
            </View>
                  <Feather name="chevron-right" size={20} color={colors.subText} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.settingsRow, { borderBottomWidth: 0 }]}
                  onPress={() => { setIsSettingsVisible(false); setPrivacyModalVisible(true); }}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(168,85,247,0.1)' }]}>
                      <Feather name="headphones" size={20} color="#a855f7" />
                    </View>
                    <Text style={[styles.settingsRowText, { color: colors.text }]}>Help & Support</Text>
            </View>
                  <Feather name="chevron-right" size={20} color={colors.subText} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.settingsRow, { borderBottomWidth: 0, marginTop: 15, paddingVertical: 12, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 12 }]}
                  onPress={() => { setIsSettingsVisible(false); dispatch(logoutUser()); }}
                >
                  <View style={[styles.settingsRowLeft, { paddingLeft: 10 }]}>
                    <Feather name="log-out" size={20} color="#ef4444" style={{ marginRight: 15 }} />
                    <Text style={[styles.settingsRowText, { color: '#ef4444' }]}>Log Out</Text>
            </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy & Help Modal */}
      <Modal visible={isPrivacyModalVisible} transparent animationType="slide">
        <View style={styles.fsModalOverlay}>
          <View style={styles.fsModalHeader}>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)} style={styles.fsHeaderBtn}>
              <Feather name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.fsModalTitle}>Help & Privacy</Text>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)} style={styles.fsHeaderBtn}>
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.fsModalScroll}>
            <View style={[styles.fsRulesBox, { padding: 20 }]}>
              <Feather name="info" size={32} color="#3b82f6" style={{ marginBottom: 15 }} />
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 10 }}>About ExamHub</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 10 }}>
                ExamHub is a modern, secure, and comprehensive online assessment platform designed to connect educators and students seamlessly. With real-time testing, automated grading, anti-cheat monitoring, and instant result analytics, ExamHub empowers educational institutions to conduct reliable examinations anytime, anywhere.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                <Feather name="award" size={18} color="#3b82f6" style={{ marginRight: 10 }} />
                <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>Version 2.4.0 • Built for Excellence</Text>
            </View>
            </View>

            <View style={[styles.fsRulesBox, { padding: 20 }]}>
              <Feather name="shield" size={32} color="#10b981" style={{ marginBottom: 15 }} />
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Security & Protection</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 10 }}>
                ExamHub implements advanced multi-layered security protocols to safeguard examination integrity and user data. Features include automated full-screen anti-cheat monitoring, secure JWT token authentication, encrypted password storage, and strict session management.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                <Feather name="lock" size={18} color="#10b981" style={{ marginRight: 10 }} />
                <Text style={{ color: '#10b981', fontWeight: 'bold' }}>256-bit Encryption • Anti-Cheat Active</Text>
            </View>
            </View>

            <View style={[styles.fsRulesBox, { padding: 20 }]}>
              <Feather name="key" size={32} color="#f59e0b" style={{ marginBottom: 15 }} />
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Account Security & Access</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 10 }}>
                Manage your account security settings. Your account is protected with automatic session timeouts, bcrypt password hashing, and active device monitoring. Never share your OTP or password with anyone.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                <Feather name="check-circle" size={18} color="#f59e0b" style={{ marginRight: 10 }} />
                <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>Account Protected • 2FA Ready</Text>
            </View>
            </View>

            <View style={[styles.fsRulesBox, { padding: 20 }]}>
              <Feather name="headphones" size={32} color="#a855f7" style={{ marginBottom: 15 }} />
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Need Support?</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 10 }}>If you are experiencing any issues with your account or have questions about the platform, please contact our administrative team.</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(6, 182, 212, 0.1)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                <Feather name="mail" size={18} color="#a855f7" style={{ marginRight: 10 }} />
                <Text style={{ color: '#a855f7', fontWeight: 'bold' }}>testsbuddy@gmail.com</Text>
            </View>
            </View>

            <View style={[styles.fsRulesBox, { padding: 20 }]}>
              <Feather name="shield" size={32} color="#10b981" style={{ marginBottom: 15 }} />
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Privacy Policy</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 15 }}>
                Your privacy is important to us. It is ExamHub&apos;s policy to respect your privacy regarding any information we may collect from you across our application.
              </Text>
              <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 5 }}>1. Information we collect</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 15 }}>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</Text>
              <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 5 }}>2. How we use your data</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 15 }}>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we&apos;ll protect within commercially acceptable means to prevent loss and theft.</Text>
              <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 5 }}>3. Third-party access</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 15 }}>We don&apos;t share any personally identifying information publicly or with third-parties, except when required to by law.</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} transparent animationType="slide">
        <View style={styles.fsModalOverlay}>
          <View style={styles.fsModalHeader}>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.fsHeaderBtn}>
              <Feather name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.fsModalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.fsHeaderBtn}>
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.fsModalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.fsAvatarSection}>
              <View style={styles.fsAvatarOuterRing}>
                <View style={styles.fsAvatarInner}>
                  {user?.profileImage ? (
                    <Image source={{ uri: getImageUrl(user.profileImage) }} style={styles.fsAvatarImage} />
                  ) : (
                    <Text style={styles.fsAvatarInitials}>{initials}</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.fsCameraBtn} onPress={handlePickImage}>
                  <Feather name="camera" size={14} color="white" />
                </TouchableOpacity>
              </View>
              <Text style={styles.fsAvatarHint}>Tap to change profile picture</Text>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Full Name</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="user" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={formData.name} onChangeText={(val) => setFormData({...formData, name: val})} placeholderTextColor="#64748b" />
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Email (Read Only)</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="mail" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={[styles.fsInput, { color: '#64748b' }]} value={user?.email || ''} editable={false} />
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Phone</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="phone" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={formData.phone} onChangeText={(val) => setFormData({...formData, phone: val})} placeholderTextColor="#64748b" keyboardType="phone-pad" />
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Age</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="calendar" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={formData.age} onChangeText={(val) => setFormData({...formData, age: val})} keyboardType="numeric" placeholderTextColor="#64748b" />
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Gender</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="users" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={formData.gender} onChangeText={(val) => setFormData({...formData, gender: val})} placeholder="Male / Female / Other" placeholderTextColor="#64748b" />
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Department</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="book-open" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={formData.department} onChangeText={(val) => setFormData({...formData, department: val})} placeholderTextColor="#64748b" />
                <Feather name="chevron-down" size={18} color="#64748b" style={styles.fsInputRightIcon} />
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>College</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="briefcase" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={formData.college} onChangeText={(val) => setFormData({...formData, college: val})} placeholderTextColor="#64748b" />
                <Feather name="chevron-down" size={18} color="#64748b" style={styles.fsInputRightIcon} />
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Class / Group</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="users" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={formData.classGroup} onChangeText={(val) => setFormData({...formData, classGroup: val})} placeholder="e.g. Class 10" placeholderTextColor="#64748b" />
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Address</Text>
              <View style={[styles.fsInputContainer, { alignItems: 'flex-start', paddingTop: 14 }]}>
                <Feather name="map-pin" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={[styles.fsInput, { height: 80, textAlignVertical: 'top' }]} value={formData.address} onChangeText={(val) => setFormData({...formData, address: val})} multiline placeholderTextColor="#64748b" />
              </View>
            </View>

            <TouchableOpacity style={styles.fsSaveBtn} onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="white" /> : (
                <>
                  <Feather name="check-circle" size={18} color="white" />
                  <Text style={styles.fsSaveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Class Change Modal */}
      <Modal visible={showClassModal} transparent animationType="slide">
        <View style={[styles.fsModalOverlay, { backgroundColor: colors.bg }]}>
          <View style={[styles.fsModalHeader, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowClassModal(false)} style={styles.fsHeaderBtn}>
              <Feather name="chevron-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.fsModalTitle, { color: colors.text }]}>Change Class</Text>
            <TouchableOpacity onPress={() => setShowClassModal(false)} style={styles.fsHeaderBtn}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.fsModalScroll} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.classInfoBanner, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.classBannerIconBox}>
                <Feather name="shield" size={24} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.classBannerTitle, { color: colors.text }]}>Teacher Verification</Text>
                <Text style={[styles.classBannerSub, { color: colors.subText }]}>
                  Your request to join a new class group will require approval from your teacher before taking effect.
                </Text>
            </View>
            </Animated.View>

            <Text style={[styles.classSectionTitle, { color: colors.text }]}>Available Class Groups</Text>

            <View style={{ gap: 14 }}>
              {availableClasses.length === 0 ? (
                <View style={[styles.noClassesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="inbox" size={36} color={colors.subText} style={{ marginBottom: 10 }} />
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>No classes available</Text>
                  <Text style={{ color: colors.subText, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                    There are no other class groups to join right now.
                  </Text>
            </View>
              ) : (
                availableClasses.map(c => {
                  const isCurrent = user?.classGroup === c.name;
                  return (
                    <TouchableOpacity
                      key={c._id}
                      style={[
                        styles.classCardItem,
                        {
                          backgroundColor: isCurrent 
                            ? (isDarkMode ? 'rgba(6, 182, 212, 0.12)' : 'rgba(6, 182, 212, 0.08)')
                            : colors.card,
                          borderColor: isCurrent ? '#6366f1' : colors.border
                        }
                      ]}
                      onPress={() => handleClassRequest(c.name)}
                      disabled={isRequesting || isCurrent}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[
                          styles.classCardIconBox, 
                          {
                            backgroundColor: isCurrent ? 'rgba(6, 182, 212, 0.2)' : (isDarkMode ? isDarkMode ? '#000000' : '#f8fafc' : '#f8fafc'),
                            borderColor: isCurrent ? '#6366f1' : colors.border
                          }
                        ]}>
                          <Feather name="users" size={20} color={isCurrent ? '#6366f1' : colors.subText} />
                        </View>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={[styles.classCardName, { color: colors.text }]}>{c.name}</Text>
                          {isCurrent ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                              <Feather name="check-circle" size={12} color="#6366f1" />
                              <Text style={{ color: '#6366f1', fontSize: 12, fontWeight: '600', marginLeft: 5 }}>Current Class</Text>
            </View>
                          ) : (
                            <Text style={{ color: colors.subText, fontSize: 12, marginTop: 4 }}>Tap to request transfer</Text>
                          )}
                        </View>
                      </View>

                      {isCurrent ? (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Active</Text>
            </View>
                      ) : (
                        <View style={styles.selectBadge}>
                          <Text style={styles.selectBadgeText}>Select</Text>
                          <Feather name="arrow-right" size={14} color="#6366f1" style={{ marginLeft: 4 }} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={[styles.fsModalOverlay, { backgroundColor: colors.bg }]}>
          <View style={styles.fsModalHeader}>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.fsHeaderBtn}>
              <Feather name="chevron-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.fsModalTitle, { color: colors.text }]}>Change Password</Text>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.fsHeaderBtn}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.fsModalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.fsShieldSection}>
              <View style={styles.fsShieldOuter}>
                <View style={styles.fsShieldInner}>
                  <Feather name="lock" size={40} color="#a855f7" />
                </View>
                <View style={styles.fsShieldCheck}>
                  <Feather name="check" size={14} color="white" />
                </View>
              </View>
              <Text style={[styles.fsShieldTitle, { color: colors.text }]}>Keep your account secure</Text>
              <Text style={[styles.fsShieldSub, { color: colors.subText }]}>Choose a strong password to protect your account</Text>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={[styles.fsLabel, { color: colors.subText }]}>Old Password</Text>
              <View style={[styles.fsInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Feather name="lock" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={[styles.fsInput, { color: colors.text }]} value={passwordData.oldPassword} onChangeText={(val) => setPasswordData({...passwordData, oldPassword: val})} secureTextEntry={!showOldPassword} placeholder="Enter your old password" placeholderTextColor={colors.subText} />
                <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
                  <Feather name={showOldPassword ? 'eye-off' : 'eye'} size={18} color={colors.subText} style={styles.fsInputRightIcon} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={[styles.fsLabel, { color: colors.subText }]}>New Password</Text>
              <View style={[styles.fsInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Feather name="lock" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={[styles.fsInput, { color: colors.text }]} value={passwordData.newPassword} onChangeText={(val) => setPasswordData({...passwordData, newPassword: val})} secureTextEntry={!showNewPassword} placeholder="Enter new password" placeholderTextColor={colors.subText} />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={18} color={colors.subText} style={styles.fsInputRightIcon} />
                </TouchableOpacity>
              </View>
              {passwordData.newPassword.length > 0 && (
                <View style={styles.fsStrengthSection}>
                  <View style={styles.fsStrengthBars}>
                    <View style={[styles.fsStrengthBar, strength.score >= 1 ? {backgroundColor: strength.color, borderColor: strength.color} : null]} />
                    <View style={[styles.fsStrengthBar, strength.score >= 2 ? {backgroundColor: strength.color, borderColor: strength.color} : null]} />
                    <View style={[styles.fsStrengthBar, strength.score >= 3 ? {backgroundColor: strength.color, borderColor: strength.color} : null]} />
                    <View style={[styles.fsStrengthBar]} />
                  </View>
                  <Text style={[styles.fsStrengthText, {color: strength.color}]}>Strength: {strength.label}</Text>
            </View>
              )}
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={[styles.fsLabel, { color: colors.subText }]}>Confirm New Password</Text>
              <View style={[styles.fsInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Feather name="lock" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={[styles.fsInput, { color: colors.text }]} value={passwordData.confirmPassword} onChangeText={(val) => setPasswordData({...passwordData, confirmPassword: val})} secureTextEntry={!showConfirmPassword} placeholder="Confirm new password" placeholderTextColor={colors.subText} />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={colors.subText} style={styles.fsInputRightIcon} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.fsRulesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fsRulesTitle, { color: colors.text }]}>Password must contain:</Text>
              <View style={styles.fsRuleRow}>
                <Feather name="check-circle" size={16} color={hasMinLength ? '#6366f1' : isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                <Text style={[styles.fsRuleText, { color: hasMinLength ? colors.text : colors.subText }]}>At least 8 characters</Text>
            </View>
              <View style={styles.fsRuleRow}>
                <Feather name="check-circle" size={16} color={hasUpper ? '#6366f1' : isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                <Text style={[styles.fsRuleText, { color: hasUpper ? colors.text : colors.subText }]}>One uppercase letter</Text>
            </View>
              <View style={styles.fsRuleRow}>
                <Feather name="check-circle" size={16} color={hasNumberOrSpecial ? '#6366f1' : isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                <Text style={[styles.fsRuleText, { color: hasNumberOrSpecial ? colors.text : colors.subText }]}>One number or special character</Text>
            </View>
            </View>

            <TouchableOpacity style={styles.fsSaveBtn} onPress={handlePasswordSubmit} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="white" /> : (
                <>
                  <Feather name="lock" size={18} color="white" />
                  <Text style={styles.fsSaveBtnText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  headerIcons: { flexDirection: 'row' },
  iconBtn: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 10, borderWidth: 1, backgroundColor: 'transparent' },
  badgeDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', borderWidth: 1.5, borderColor: '#0B0E14' },

  content: { padding: 15, paddingBottom: 40 },

  profileCard: { borderRadius: 24, padding: 25, marginBottom: 25, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(176,38,255,0.4)', shadowColor: '#b026ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  profileTopRow: { flexDirection: 'column', alignItems: 'center', marginBottom: 25, zIndex: 2 },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#06b6d4', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#6366f1', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#1e1b4b' },
  
  profileInfo: { alignItems: 'center', width: '100%' },
  userName: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(6,182,212,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'center', marginBottom: 10 },
  roleText: { color: '#c4b5fd', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  
  classStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignSelf: 'center', marginTop: 5 },

  headerActions: { flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  actionBtnEdit: { flex: 1, backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  actionBtnTextEdit: { color: 'white', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  actionBtnPass: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  actionBtnTextPass: { color: '#cbd5e1', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  viewAllText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },

  perfGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  perfCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', marginHorizontal: 4, backgroundColor: 'rgba(0,242,254,0.05)', borderWidth: 1, borderColor: 'rgba(0,242,254,0.3)', shadowColor: '#00f2fe', shadowOffset: {width:0, height:2}, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  perfIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  perfValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  perfLabel: { fontSize: 11, fontWeight: '600' },

  infoCard: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, backgroundColor: 'rgba(176,38,255,0.03)', borderColor: 'rgba(176,38,255,0.3)', shadowColor: '#b026ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center' },
  infoIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel: { fontSize: 14, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '700' },

  quickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'nowrap' },
  quickActionCard: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginHorizontal: 4, backgroundColor: 'rgba(0,242,254,0.05)', borderWidth: 1, borderColor: 'rgba(0,242,254,0.3)', shadowColor: '#00f2fe', shadowOffset: {width:0, height:2}, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  quickActionIconWrapper: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 11, fontWeight: '600' },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginTop: 30, borderWidth: 1, marginBottom: 10 },
  logoutBtnText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

  fsModalOverlay: { flex: 1, backgroundColor: '#0B0E14' },
  fsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 20 },
  fsHeaderBtn: { padding: 5 },
  fsModalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  fsModalScroll: { paddingHorizontal: 25, paddingBottom: 50 },
  
  fsAvatarSection: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  fsAvatarOuterRing: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(6,182,212,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#6366f1' },
  fsAvatarInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fsAvatarImage: { width: '100%', height: '100%' },
  fsAvatarInitials: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  fsCameraBtn: { position: 'absolute', bottom: 5, right: 5, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0B0E14' },
  fsAvatarHint: { color: '#94a3b8', fontSize: 13, marginTop: 15 },
  
  fsFormGroup: { marginBottom: 20 },
  fsLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  fsInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#131823', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 15 },
  fsInputIcon: { marginRight: 10 },
  fsInput: { flex: 1, color: 'white', fontSize: 15, paddingVertical: 14 },
  fsInputRightIcon: { marginLeft: 10 },
  
  fsSaveBtn: { backgroundColor: '#06b6d4', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 20, marginBottom: 40 },
  fsSaveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  
  fsShieldSection: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
  fsShieldOuter: { width: 100, height: 110, backgroundColor: 'rgba(6,182,212,0.1)', justifyContent: 'center', alignItems: 'center', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)', position: 'relative' },
  fsShieldInner: { width: 60, height: 70, backgroundColor: 'rgba(6,182,212,0.2)', justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  fsShieldCheck: { position: 'absolute', bottom: 15, right: 15, width: 24, height: 24, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0B0E14' },
  fsShieldTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  fsShieldSub: { color: '#94a3b8', fontSize: 14, marginTop: 8, textAlign: 'center' },
  
  fsStrengthSection: { marginTop: 10 },
  fsStrengthBars: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  fsStrengthBar: { height: 4, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginHorizontal: 2 },
  fsStrengthText: { fontSize: 12, fontWeight: '600' },
  
  fsRulesBox: { backgroundColor: '#131823', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', marginBottom: 20 },
  fsRulesTitle: { color: 'white', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  fsRuleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fsRuleText: { fontSize: 13, marginLeft: 8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', height: '85%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, borderWidth: 1, borderBottomWidth: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalInput: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 15, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  primaryBtn: { flexDirection: 'row', backgroundColor: '#06b6d4', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700' },
  
  settingsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  settingsCloseArea: { flex: 1 },
  settingsContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 40, maxHeight: '80%', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10 },
  settingsDragIndicator: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingsTitle: { fontSize: 24, fontWeight: 'bold' },
  settingsSection: { marginBottom: 25 },
  settingsSectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginLeft: 5 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1 },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingsIconWrapper: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingsRowText: { fontSize: 16, fontWeight: '500' },

  classInfoBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 24 },
  classBannerIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(6,182,212,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  classBannerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  classBannerSub: { fontSize: 12, lineHeight: 18 },
  classSectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  noClassesBox: { padding: 30, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  classCardItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderRadius: 18, marginBottom: 12 },
  classCardIconBox: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  classCardName: { fontSize: 16, fontWeight: '700' },
  activeBadge: { backgroundColor: 'rgba(6, 182, 212, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  activeBadgeText: { color: '#6366f1', fontSize: 12, fontWeight: '700' },
  selectBadge: { backgroundColor: 'rgba(6, 182, 212, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  selectBadgeText: { color: '#06b6d4', fontSize: 12, fontWeight: '700' }
});
