import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile, getCurrentUser, changePassword, logoutUser, uploadProfileImage } from '../../redux/slices/authSlice';
import { toggleTheme } from '../../redux/slices/uiSlice';
import { getAdminDashboardStats } from '../../redux/slices/adminSlice';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const { stats } = useSelector(state => state.admin);
  const { notifications } = useSelector(state => state.notifications || { notifications: [] });
  
  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now()); // For cache busting
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [isBroadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(true);
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const languages = ['English', 'Hindi', 'Spanish'];
  const [formData, setFormData] = useState({
    name: '', phone: '', address: ''
  });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    dispatch(getCurrentUser());
    dispatch(getAdminDashboardStats());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await dispatch(updateProfile(formData)).unwrap();
      setEditModalVisible(false);
      await dispatch(getCurrentUser());
      Toast.show({ type: 'success', text1: 'Profile Updated' });
    } catch (error) {}
  };

  const handlePasswordSubmit = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter old and new password' });
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'New passwords do not match' });
    }
    try {
      await dispatch(changePassword({ 
        currentPassword: passwordData.oldPassword,
        oldPassword: passwordData.oldPassword, 
        newPassword: passwordData.newPassword 
      })).unwrap();
      setPasswordModalVisible(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      Toast.show({ type: 'success', text1: 'Password Updated' });
    } catch (error) {}
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logoutUser()) }
    ]);
  };

  const handleBroadcast = async () => {
    if (!broadcastData.title || !broadcastData.message) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill both title and message' });
    }
    setIsBroadcasting(true);
    try {
      const { default: api } = await import('../../services/api');
      await api.post('/api/notifications/send', {
        email: 'all',
        title: broadcastData.title,
        message: broadcastData.message,
        type: 'system_alert'
      });
      Toast.show({ type: 'success', text1: 'Broadcast Sent', text2: 'Message sent to all users' });
      setBroadcastModalVisible(false);
      setBroadcastData({ title: '', message: '' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to send broadcast' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      const fd = new FormData();
      fd.append('profileImage', { uri, name: filename, type });
      await dispatch(uploadProfileImage(fd));
      setImageTimestamp(Date.now()); // bust cache
    }
  };

  const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:image')) return path;
    const cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');
    return `https://exam-app-backend-vqos.vercel.app/${cleanPath}?t=${imageTimestamp}`;
  };

  const totalUsers = stats?.totalUsers || 1;
  const totalExams = stats?.totalExams || 0;
  const resultsPublished = stats?.totalResults || 0;
  const passed = stats?.totalPassed || 0;
  const successRate = totalExams > 0 ? Math.round((passed / totalExams) * 100) : 0;

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#09090b' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#13102b' : 'white',
    listCard: isDarkMode ? '#111827' : 'white',
    border: isDarkMode ? '#2e1b54' : '#e2e8f0',
    listBorder: isDarkMode ? '#1f2937' : '#e2e8f0',
    iconBg: isDarkMode ? '#1e293b' : '#f1f5f9',
    iconColor: isDarkMode ? 'white' : '#334155',
    modalBg: isDarkMode ? '#1e293b' : 'white',
    inputBg: isDarkMode ? '#0f172a' : '#f1f5f9',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginRight: 15 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My <Text style={{color: '#8b5cf6'}}>Profile</Text></Text>
            <Text style={styles.headerSubtitle}>Manage your account and preferences</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.iconBg }]} onPress={() => navigation.navigate('Notifications')}>
              <Feather name="bell" size={20} color={colors.iconColor} />
              {unreadCount > 0 && <View style={styles.badge} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.iconBg }]} onPress={() => setSettingsModalVisible(true)}>
              <Feather name="settings" size={20} color={colors.iconColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileCardInner}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              <View style={styles.avatarRing}>
                {user?.profileImage ? (
                  <Image source={{ uri: getImageUrl(user.profileImage) }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
              </View>
              <View style={styles.onlineDot} />
              <View style={[styles.cameraIconBadge, { backgroundColor: colors.iconBg, borderColor: colors.border }]}>
                <Feather name="camera" size={12} color={colors.iconColor} />
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'Admin Name'}</Text>
              
              <View style={styles.roleBadgeContainer}>
                <Feather name="award" size={12} color="#a855f7" />
                <Text style={styles.roleText}>Admin</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Feather name="mail" size={12} color={colors.subText} />
                <Text style={[styles.infoText, { color: colors.subText }]}>{user?.email || 'email@example.com'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Feather name="phone" size={12} color={colors.subText} />
                <Text style={[styles.infoText, { color: colors.subText }]}>{user?.phone || '+91 0000000000'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={12} color={colors.subText} />
                <Text style={[styles.infoText, { color: colors.subText }]}>{user?.address || 'Bhubaneswar, Odisha, India'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.editBtn} onPress={() => setEditModalVisible(true)}>
              <Feather name="edit-2" size={12} color="#a855f7" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsCard, { backgroundColor: colors.listCard, borderColor: colors.listBorder }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(99, 102, 241, 0.15)'}]}>
              <Feather name="users" size={18} color="#818cf8" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalUsers}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Total Users</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: colors.listBorder }]} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(16, 185, 129, 0.15)'}]}>
              <Feather name="clipboard" size={18} color="#34d399" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalExams}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Total Exams</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: colors.listBorder }]} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(245, 158, 11, 0.15)'}]}>
              <Feather name="award" size={18} color="#fbbf24" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{resultsPublished}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Results Published</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: colors.listBorder }]} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(59, 130, 246, 0.15)'}]}>
              <Feather name="trending-up" size={18} color="#60a5fa" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{successRate}%</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Success Rate</Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={[styles.listCard, { backgroundColor: colors.listCard, borderColor: colors.listBorder }]}>
          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => setEditModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(99, 102, 241, 0.1)'}]}>
              <Feather name="user" size={18} color="#818cf8" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Personal Information</Text>
              <Text style={[styles.listSubtitle, { color: colors.subText }]}>Update your personal details</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => setPasswordModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
              <Feather name="lock" size={18} color="#34d399" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Change Password</Text>
              <Text style={[styles.listSubtitle, { color: colors.subText }]}>Update your account password</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.listItem, {borderBottomWidth: 0}]} onPress={() => setPrivacyModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(245, 158, 11, 0.1)'}]}>
              <Feather name="shield" size={18} color="#fbbf24" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Security</Text>
              <Text style={[styles.listSubtitle, { color: colors.subText }]}>Manage your account security</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
        </View>

        {/* App Preferences */}
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <View style={[styles.listCard, { backgroundColor: colors.listCard, borderColor: colors.listBorder }]}>
          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => dispatch(toggleTheme())}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}>
              <Feather name="moon" size={18} color="#60a5fa" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Theme</Text>
              <Text style={[styles.listSubtitle, { color: colors.subText }]}>Choose your preferred theme</Text>
            </View>
            <View style={[styles.rightBadge, { backgroundColor: colors.iconBg }]}>
              <Feather name={isDarkMode ? "moon" : "sun"} size={12} color={colors.subText} style={{marginRight: 4}} />
              <Text style={[styles.rightBadgeText, { color: colors.subText }]}>{isDarkMode ? 'Dark' : 'Light'}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => setSettingsModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
              <Feather name="bell" size={18} color="#34d399" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.listSubtitle, { color: colors.subText }]}>Manage your notification settings</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.listItem, {borderBottomWidth: 0}]} onPress={() => setLanguageModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(168, 85, 247, 0.1)'}]}>
              <Feather name="globe" size={18} color="#c084fc" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Language</Text>
              <Text style={[styles.listSubtitle, { color: colors.subText }]}>Choose your preferred language</Text>
            </View>
            <View style={[styles.rightBadge, { backgroundColor: colors.iconBg }]}>
              <Text style={[styles.rightBadgeText, { color: colors.subText }]}>{selectedLanguage}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={[styles.listCard, { backgroundColor: colors.listCard, borderColor: colors.listBorder }]}>
          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => setPrivacyModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}>
              <Feather name="headphones" size={18} color="#60a5fa" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Help & Support</Text>
              <Text style={[styles.listSubtitle, { color: colors.subText }]}>Get help and contact support</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.listItem, {borderBottomWidth: 0}]} onPress={() => Toast.show({ type: 'info', text1: 'About ExamHub', text2: 'Version 1.0.0' })}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(168, 85, 247, 0.1)'}]}>
              <Feather name="info" size={18} color="#c084fc" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>About ExamHub</Text>
              <Text style={[styles.listSubtitle, { color: colors.subText }]}>Learn more about the platform</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
        </View>

        {/* Admin Tools Section */}
        <Text style={styles.sectionTitle}>Admin Tools</Text>
        <View style={[styles.listCard, { backgroundColor: colors.listCard, borderColor: colors.listBorder }]}>
          <TouchableOpacity style={[styles.listItem, { borderBottomWidth: 0 }]} onPress={() => setBroadcastModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(236, 72, 153, 0.1)'}]}>
              <Feather name="send" size={18} color="#ec4899" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Send Notification / Message</Text>
              <Text style={[styles.listSubtitle, { color: colors.subText }]}>Broadcast a message to all users</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
          <Feather name="log-out" size={16} color="#ef4444" />
        </TouchableOpacity>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.listBorder, color: colors.text }]} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
              
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.listBorder, color: colors.text }]} value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} keyboardType="phone-pad" />
              
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.listBorder, color: colors.text, height: 80, textAlignVertical: 'top' }]} value={formData.address} onChangeText={t => setFormData({...formData, address: t})} multiline />
              
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
                <Text style={styles.primaryBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <View style={{height: 20}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={isPasswordModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.subText }]}>Old Password</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.listBorder, color: colors.text }]} secureTextEntry value={passwordData.oldPassword} onChangeText={t => setPasswordData({...passwordData, oldPassword: t})} />
              
              <Text style={[styles.inputLabel, { color: colors.subText }]}>New Password</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.listBorder, color: colors.text }]} secureTextEntry value={passwordData.newPassword} onChangeText={t => setPasswordData({...passwordData, newPassword: t})} />
              
              <Text style={[styles.inputLabel, { color: colors.subText }]}>Confirm New Password</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.listBorder, color: colors.text }]} secureTextEntry value={passwordData.confirmPassword} onChangeText={t => setPasswordData({...passwordData, confirmPassword: t})} />
              
              <TouchableOpacity style={styles.primaryBtn} onPress={handlePasswordSubmit}>
                <Text style={styles.primaryBtnText}>Update Password</Text>
              </TouchableOpacity>
              <View style={{height: 20}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language Modal */}
      <Modal visible={isLanguageModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg, maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Language</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              {languages.map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.listBorder,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    setSelectedLanguage(lang);
                    setLanguageModalVisible(false);
                    Toast.show({ type: 'success', text1: 'Language Updated', text2: `Language changed to ${lang}` });
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>{lang}</Text>
                  {selectedLanguage === lang && <Feather name="check" size={20} color="#8b5cf6" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy & Help Modal */}
      <Modal visible={isPrivacyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Help & Privacy</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flexGrow: 0 }}>
              <View style={{ backgroundColor: isDarkMode ? '#111827' : '#f8fafc', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: colors.listBorder, marginBottom: 20 }}>
                <Feather name="info" size={32} color="#3b82f6" style={{ marginBottom: 15 }} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>About ExamHub</Text>
                <Text style={{ color: colors.subText, fontSize: 14, lineHeight: 22, marginBottom: 10 }}>
                  ExamHub is a modern, secure, and comprehensive online assessment platform designed to connect educators and students seamlessly. With real-time testing, automated grading, anti-cheat monitoring, and instant result analytics, ExamHub empowers educational institutions to conduct reliable examinations anytime, anywhere.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                  <Feather name="award" size={18} color="#3b82f6" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>Version 2.4.0 • Built for Excellence</Text>
                </View>
              </View>

              <View style={{ backgroundColor: isDarkMode ? '#111827' : '#f8fafc', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: colors.listBorder, marginBottom: 20 }}>
                <Feather name="shield" size={32} color="#10b981" style={{ marginBottom: 15 }} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Security & Protection</Text>
                <Text style={{ color: colors.subText, fontSize: 14, lineHeight: 22, marginBottom: 10 }}>
                  ExamHub implements advanced multi-layered security protocols to safeguard examination integrity and user data. Features include automated full-screen anti-cheat monitoring, secure JWT token authentication, encrypted password storage, and strict session management.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                  <Feather name="lock" size={18} color="#10b981" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#10b981', fontWeight: 'bold' }}>256-bit Encryption • Anti-Cheat Active</Text>
                </View>
              </View>

              <View style={{ backgroundColor: isDarkMode ? '#111827' : '#f8fafc', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: colors.listBorder, marginBottom: 20 }}>
                <Feather name="key" size={32} color="#f59e0b" style={{ marginBottom: 15 }} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Account Security & Access</Text>
                <Text style={{ color: colors.subText, fontSize: 14, lineHeight: 22, marginBottom: 10 }}>
                  Manage your account security settings. Your account is protected with automatic session timeouts, bcrypt password hashing, and active device monitoring. Never share your OTP or password with anyone.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                  <Feather name="check-circle" size={18} color="#f59e0b" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>Account Protected • 2FA Ready</Text>
                </View>
              </View>

              <View style={{ backgroundColor: isDarkMode ? '#111827' : '#f8fafc', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: colors.listBorder, marginBottom: 20 }}>
                <Feather name="headphones" size={32} color="#a855f7" style={{ marginBottom: 15 }} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Need Support?</Text>
                <Text style={{ color: colors.subText, fontSize: 14, lineHeight: 22, marginBottom: 10 }}>If you are experiencing any issues with your account or have questions about the platform, please contact our administrative team.</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                  <Feather name="mail" size={18} color="#a855f7" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#a855f7', fontWeight: 'bold' }}>testsbuddy@gmail.com</Text>
                </View>
              </View>

              <View style={{ backgroundColor: isDarkMode ? '#111827' : '#f8fafc', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: colors.listBorder, marginBottom: 20 }}>
                <Feather name="shield" size={32} color="#10b981" style={{ marginBottom: 15 }} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Privacy Policy</Text>
                <Text style={{ color: colors.subText, fontSize: 14, lineHeight: 22, marginBottom: 15 }}>
                  Your privacy is important to us. It is ExamHub's policy to respect your privacy regarding any information we may collect from you across our application.
                </Text>
                <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 5 }}>1. Information we collect</Text>
                <Text style={{ color: colors.subText, fontSize: 13, lineHeight: 20, marginBottom: 15 }}>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</Text>
                <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 5 }}>2. How we use your data</Text>
                <Text style={{ color: colors.subText, fontSize: 13, lineHeight: 20, marginBottom: 15 }}>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we'll protect within commercially acceptable means to prevent loss and theft.</Text>
                <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 5 }}>3. Third-party access</Text>
                <Text style={{ color: colors.subText, fontSize: 13, lineHeight: 20, marginBottom: 15 }}>We don't share any personally identifying information publicly or with third-parties, except when required to by law.</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Broadcast Modal */}
      <Modal visible={isBroadcastModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Broadcast Message</Text>
              <TouchableOpacity onPress={() => setBroadcastModalVisible(false)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={{ color: colors.subText, marginBottom: 15, fontSize: 13 }}>This message will be sent to ALL students as a personal notification.</Text>
              <Text style={styles.inputLabel}>Message Title</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.listBorder, color: colors.text }]} 
                placeholder="e.g. Server Maintenance, Important Update"
                placeholderTextColor={colors.subText}
                value={broadcastData.title} 
                onChangeText={t => setBroadcastData({...broadcastData, title: t})} 
              />
              
              <Text style={styles.inputLabel}>Message Content</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.listBorder, color: colors.text, height: 100, textAlignVertical: 'top' }]} 
                placeholder="Type your message here..."
                placeholderTextColor={colors.subText}
                value={broadcastData.message} 
                onChangeText={t => setBroadcastData({...broadcastData, message: t})} 
                multiline 
              />
              
              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: '#ec4899', flexDirection: 'row', justifyContent: 'center' }]} 
                onPress={handleBroadcast}
                disabled={isBroadcasting}
              >
                {isBroadcasting ? <ActivityIndicator color="white" /> : <Feather name="send" size={18} color="white" style={{ marginRight: 8 }} />}
                <Text style={styles.primaryBtnText}>{isBroadcasting ? 'Sending...' : 'Send Broadcast'}</Text>
              </TouchableOpacity>
              <View style={{height: 20}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={isSettingsModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg, maxHeight: 350 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Quick Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingVertical: 10 }}>
              <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => setIsPushEnabled(!isPushEnabled)}>
                <View style={styles.listTextContainer}>
                  <Text style={[styles.listTitle, { color: colors.text }]}>Push Notifications</Text>
                  <Text style={[styles.listSubtitle, { color: colors.subText }]}>Enable or disable alerts</Text>
                </View>
                <Feather name={isPushEnabled ? "toggle-right" : "toggle-left"} size={28} color={isPushEnabled ? "#10b981" : colors.subText} />
              </TouchableOpacity>
              <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                <View style={styles.listTextContainer}>
                  <Text style={[styles.listTitle, { color: colors.text }]}>App Theme</Text>
                  <Text style={[styles.listSubtitle, { color: colors.subText }]}>Toggle light and dark mode</Text>
                </View>
                <TouchableOpacity onPress={() => dispatch(toggleTheme())}>
                  <Feather name={isDarkMode ? "toggle-right" : "toggle-left"} size={28} color={isDarkMode ? "#a855f7" : colors.subText} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, paddingTop: 60 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  headerIcons: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: '#a855f7' },

  profileCard: { borderRadius: 20, padding: 2, marginBottom: 20, borderWidth: 1 },
  profileCardInner: { flexDirection: 'row', padding: 20, position: 'relative' },
  avatarContainer: { marginRight: 20, position: 'relative' },
  avatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#8b5cf6', padding: 3, backgroundColor: 'transparent' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 45 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 45, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 30, color: 'white', fontWeight: 'bold' },
  onlineDot: { position: 'absolute', bottom: 5, right: 5, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#13102b' },
  cameraIconBadge: { position: 'absolute', bottom: -5, left: -5, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  profileInfo: { flex: 1, justifyContent: 'center', paddingRight: 95 },
  userName: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  roleBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  roleText: { color: '#a855f7', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 12, marginLeft: 8 },

  editBtn: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)' },
  editBtnText: { color: '#a855f7', fontSize: 11, fontWeight: 'bold', marginLeft: 6 },

  statsCard: { flexDirection: 'row', borderRadius: 16, padding: 15, marginBottom: 25, justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  statItem: { flex: 1, alignItems: 'center' },
  statIconWrapper: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 10, textAlign: 'center' },
  statDivider: { width: 1, height: '60%' },

  sectionTitle: { color: '#a855f7', fontSize: 14, fontWeight: 'bold', marginBottom: 12, marginLeft: 4 },
  listCard: { borderRadius: 16, marginBottom: 25, borderWidth: 1 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  listIconWrapper: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  listTextContainer: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  listSubtitle: { fontSize: 11 },
  rightBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 10 },
  rightBadgeText: { fontSize: 11 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 10 },
  logoutText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold', marginRight: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { flexGrow: 0 },
  inputLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 14, marginBottom: 16 },
  primaryBtn: { backgroundColor: '#8b5cf6', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' }
});
