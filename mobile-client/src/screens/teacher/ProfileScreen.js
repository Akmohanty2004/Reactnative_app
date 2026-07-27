import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Modal, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile, getCurrentUser, changePassword, logoutUser, uploadProfileImage } from '../../redux/slices/authSlice';
import { toggleTheme } from '../../redux/slices/uiSlice';
import { sendPersonalNotification } from '../../redux/slices/notificationSlice';
import { getTeacherExams } from '../../redux/slices/examSlice';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const { unreadCount } = useSelector(state => state.notifications);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const { exams } = useSelector(state => state.exams);

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [isSendNotificationModalVisible, setSendNotificationModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(true);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [notificationData, setNotificationData] = useState({ email: '', title: '', message: '' });
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', department: '', address: '', college: '', age: '', gender: ''
  });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      dispatch(getCurrentUser());
      dispatch(getTeacherExams());
    }, [dispatch])
  );

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        department: user.department || '',
        address: user.address || '',
        college: user.college || '',
        age: user.age ? String(user.age) : '',
        gender: user.gender || ''
      });
    }
  }, [user]);

  const handleSendNotification = async () => {
    if (!notificationData.email || !notificationData.title || !notificationData.message) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill all fields' });
      return;
    }
    setIsSendingNotif(true);
    try {
      await dispatch(sendPersonalNotification(notificationData)).unwrap();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Notification sent successfully' });
      setSendNotificationModalVisible(false);
      setNotificationData({ email: '', title: '', message: '' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error });
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleSave = async () => {
    try {
      await dispatch(updateProfile(formData)).unwrap();
      setEditModalVisible(false);
      await dispatch(getCurrentUser());
      Toast.show({ type: 'success', text1: 'Profile Updated' });
    } catch (error) {}
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'New passwords do not match' });
    }
    try {
      await dispatch(changePassword({ 
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

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'T';
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:image')) return path;
    const cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');
    return `https://exam-app-backend-vqos.vercel.app/${cleanPath}?t=${imageTimestamp}`;
  };

  const totalExams = exams?.length || 0;
  const activeExams = exams?.filter(e => e.status === 'published' || e.status === 'ongoing')?.length || 0;
  const totalPassed = exams?.reduce((sum, exam) => sum + (exam.totalPassed || 0), 0) || 0;
  const totalFailed = exams?.reduce((sum, exam) => sum + (exam.totalFailed || 0), 0) || 0;
  const totalStudents = totalPassed + totalFailed;
  const passRate = totalStudents > 0 ? Math.round((totalPassed / totalStudents) * 100) : 0;

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
      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0 }]}>
        <View style={[styles.headerLeft, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity 
            onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation?.navigate('Dashboard')}
            style={{ marginRight: 10, padding: 4 }}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My <Text style={{color: '#8b5cf6'}}>Profile</Text></Text>
            <Text style={[styles.headerSubtitle, { color: colors.subText }]}>Manage your account and preferences</Text>
          </View>
        </View>
        <View style={[styles.headerRight, { flexDirection: 'row' }]}>
          <TouchableOpacity style={[styles.iconBtn, { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 10, borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : colors.border, backgroundColor: 'transparent' }]} onPress={() => navigation.navigate('Notifications')}>
            <Feather name="bell" size={20} color={colors.text} />
            {unreadCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 10, borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : colors.border, backgroundColor: 'transparent' }]} onPress={() => setSettingsModalVisible(true)}>
            <Feather name="settings" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

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
              <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'Teacher Name'}</Text>
              
              <View style={styles.roleBadgeContainer}>
                <Feather name="award" size={12} color="#a855f7" />
                <Text style={styles.roleText}>Teacher</Text>
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
                <Feather name="book" size={12} color={colors.subText} />
                <Text style={[styles.infoText, { color: colors.subText }]}>{user?.department || 'Department'}</Text>
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
              <Feather name="file-text" size={18} color="#818cf8" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalExams}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Total Exams</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: colors.listBorder }]} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(16, 185, 129, 0.15)'}]}>
              <Feather name="users" size={18} color="#34d399" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalStudents}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Students</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: colors.listBorder }]} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(168, 85, 247, 0.15)'}]}>
              <Feather name="trending-up" size={18} color="#c084fc" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{passRate}%</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Pass Rate</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: colors.listBorder }]} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(245, 158, 11, 0.15)'}]}>
              <Feather name="activity" size={18} color="#fbbf24" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{activeExams}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Active</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={[styles.listCard, { backgroundColor: colors.listCard, borderColor: colors.listBorder }]}>
          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => setEditModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(99, 102, 241, 0.1)'}]}>
              <Feather name="edit-2" size={18} color="#818cf8" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Edit Profile</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => setSendNotificationModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(236, 72, 153, 0.1)'}]}>
              <Feather name="send" size={18} color="#ec4899" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Send Notification</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => setPasswordModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
              <Feather name="lock" size={18} color="#34d399" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Change Password</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.listBorder }]} onPress={() => dispatch(toggleTheme())}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}>
              <Feather name={isDarkMode ? 'moon' : 'sun'} size={18} color="#60a5fa" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Theme</Text>
            </View>
            <View style={[styles.rightBadge, { backgroundColor: colors.iconBg }]}>
              <Text style={[styles.rightBadgeText, { color: colors.subText }]}>{isDarkMode ? 'Dark' : 'Light'}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.subText} />
          </TouchableOpacity>
          
          <View style={[styles.listItem, { borderBottomColor: colors.listBorder }]}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(245, 158, 11, 0.1)'}]}>
              <Feather name="bell" size={18} color="#fbbf24" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Push Notifications</Text>
            </View>
            <Switch 
              value={isPushEnabled} 
              onValueChange={(val) => {
                setIsPushEnabled(val);
                Toast.show({ type: 'info', text1: val ? 'Notifications Enabled' : 'Notifications Disabled' });
              }} 
            />
          </View>
          
          <TouchableOpacity style={[styles.listItem, {borderBottomWidth: 0}]} onPress={() => setPrivacyModalVisible(true)}>
            <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(168, 85, 247, 0.1)'}]}>
              <Feather name="help-circle" size={18} color="#c084fc" />
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Help & Support</Text>
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
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.fsModalOverlay}>
          <View style={styles.fsModalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.fsHeaderBtn}>
              <Feather name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.fsModalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.fsHeaderBtn}>
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
                <TouchableOpacity style={styles.fsCameraBtn} onPress={pickImage}>
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
              <Text style={styles.fsLabel}>Address</Text>
              <View style={[styles.fsInputContainer, { alignItems: 'flex-start', paddingTop: 14 }]}>
                <Feather name="map-pin" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={[styles.fsInput, { height: 80, textAlignVertical: 'top' }]} value={formData.address} onChangeText={(val) => setFormData({...formData, address: val})} multiline placeholderTextColor="#64748b" />
              </View>
            </View>

            <TouchableOpacity style={styles.fsSaveBtn} onPress={handleSave}>
              <Feather name="check-circle" size={18} color="white" />
              <Text style={styles.fsSaveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={isPasswordModalVisible} transparent animationType="slide">
        <View style={styles.fsModalOverlay}>
          <View style={styles.fsModalHeader}>
            <TouchableOpacity onPress={() => setPasswordModalVisible(false)} style={styles.fsHeaderBtn}>
              <Feather name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.fsModalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setPasswordModalVisible(false)} style={styles.fsHeaderBtn}>
              <Feather name="x" size={24} color="white" />
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
              <Text style={styles.fsShieldTitle}>Keep your account secure</Text>
              <Text style={styles.fsShieldSub}>Choose a strong password to protect your account</Text>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Old Password</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="lock" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={passwordData.oldPassword} onChangeText={(val) => setPasswordData({...passwordData, oldPassword: val})} secureTextEntry={!showOldPassword} placeholder="Enter your old password" placeholderTextColor="#475569" />
                <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
                  <Feather name={showOldPassword ? 'eye-off' : 'eye'} size={18} color="#64748b" style={styles.fsInputRightIcon} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>New Password</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="lock" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={passwordData.newPassword} onChangeText={(val) => setPasswordData({...passwordData, newPassword: val})} secureTextEntry={!showNewPassword} placeholder="Enter new password" placeholderTextColor="#475569" />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={18} color="#64748b" style={styles.fsInputRightIcon} />
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
              <Text style={styles.fsLabel}>Confirm New Password</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="lock" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={passwordData.confirmPassword} onChangeText={(val) => setPasswordData({...passwordData, confirmPassword: val})} secureTextEntry={!showConfirmPassword} placeholder="Confirm new password" placeholderTextColor="#475569" />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#64748b" style={styles.fsInputRightIcon} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fsRulesBox}>
              <Text style={styles.fsRulesTitle}>Password must contain:</Text>
              <View style={styles.fsRuleRow}>
                <Feather name="check-circle" size={16} color={hasMinLength ? '#8b5cf6' : '#334155'} />
                <Text style={[styles.fsRuleText, { color: hasMinLength ? '#cbd5e1' : '#64748b' }]}>At least 8 characters</Text>
              </View>
              <View style={styles.fsRuleRow}>
                <Feather name="check-circle" size={16} color={hasUpper ? '#8b5cf6' : '#334155'} />
                <Text style={[styles.fsRuleText, { color: hasUpper ? '#cbd5e1' : '#64748b' }]}>One uppercase letter</Text>
              </View>
              <View style={styles.fsRuleRow}>
                <Feather name="check-circle" size={16} color={hasNumberOrSpecial ? '#8b5cf6' : '#334155'} />
                <Text style={[styles.fsRuleText, { color: hasNumberOrSpecial ? '#cbd5e1' : '#64748b' }]}>One number or special character</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.fsSaveBtn} onPress={handlePasswordSubmit}>
              <Feather name="lock" size={18} color="white" />
              <Text style={styles.fsSaveBtnText}>Update Password</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Send Notification Modal */}
      <Modal visible={isSendNotificationModalVisible} transparent animationType="slide">
        <View style={styles.fsModalOverlay}>
          <View style={styles.fsModalHeader}>
            <TouchableOpacity onPress={() => setSendNotificationModalVisible(false)} style={styles.fsHeaderBtn}>
              <Feather name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.fsModalTitle}>Send Notification</Text>
            <TouchableOpacity onPress={() => setSendNotificationModalVisible(false)} style={styles.fsHeaderBtn}>
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.fsModalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.fsShieldSection}>
              <View style={styles.fsShieldOuter}>
                <View style={styles.fsShieldInner}>
                  <Feather name="send" size={40} color="#a855f7" />
                </View>
              </View>
              <Text style={styles.fsShieldTitle}>Send Personal Notification</Text>
              <Text style={styles.fsShieldSub}>Send an alert directly to a student's device</Text>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Target Audience (Email or Class)</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="users" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={notificationData.email} onChangeText={(val) => setNotificationData({...notificationData, email: val})} placeholder="student@email.com, 'all', or 'class:10th'" placeholderTextColor="#64748b" autoCapitalize="none" />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setNotificationData({...notificationData, email: 'all'})}>
                  <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '500' }}>+ Broadcast to All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setNotificationData({...notificationData, email: 'class:General'})}>
                  <Text style={{ color: '#ec4899', fontSize: 12, fontWeight: '500' }}>+ Send to Class</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Notification Title</Text>
              <View style={styles.fsInputContainer}>
                <Feather name="type" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={styles.fsInput} value={notificationData.title} onChangeText={(val) => setNotificationData({...notificationData, title: val})} placeholder="Important Update" placeholderTextColor="#64748b" />
              </View>
            </View>
            
            <View style={styles.fsFormGroup}>
              <Text style={styles.fsLabel}>Message</Text>
              <View style={[styles.fsInputContainer, { alignItems: 'flex-start', paddingTop: 14 }]}>
                <Feather name="message-square" size={18} color="#a78bfa" style={styles.fsInputIcon} />
                <TextInput style={[styles.fsInput, { height: 80, textAlignVertical: 'top' }]} value={notificationData.message} onChangeText={(val) => setNotificationData({...notificationData, message: val})} multiline placeholder="Type your message here..." placeholderTextColor="#64748b" />
              </View>
            </View>

            <TouchableOpacity style={styles.fsSaveBtn} onPress={handleSendNotification} disabled={isSendingNotif}>
              <Text style={styles.fsSaveBtnText}>{isSendingNotif ? 'Sending...' : 'Send Notification'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={isSettingsModalVisible} transparent animationType="slide">
        <View style={styles.fsModalOverlay}>
          <View style={styles.fsModalHeader}>
            <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={styles.fsHeaderBtn}>
              <Feather name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.fsModalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={styles.fsHeaderBtn}>
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.fsModalScroll}>
            <View style={[styles.listCard, { backgroundColor: '#131823', borderColor: '#1e293b' }]}>
              <View style={[styles.listItem, { borderBottomColor: '#1e293b' }]}>
                <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}>
                  <Feather name={isDarkMode ? 'moon' : 'sun'} size={18} color="#60a5fa" />
                </View>
                <View style={styles.listTextContainer}>
                  <Text style={[styles.listTitle, { color: 'white' }]}>Dark Mode</Text>
                </View>
                <Switch value={isDarkMode} onValueChange={() => dispatch(toggleTheme())} />
              </View>
              <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
                  <Feather name="bell" size={18} color="#34d399" />
                </View>
                <View style={styles.listTextContainer}>
                  <Text style={[styles.listTitle, { color: 'white' }]}>Push Notifications</Text>
                </View>
                <Switch value={true} onValueChange={() => Toast.show({ type: 'info', text1: 'Preferences saved' })} />
              </View>
            </View>

            <View style={[styles.listCard, { backgroundColor: '#131823', borderColor: '#1e293b', marginTop: 15 }]}>
              <TouchableOpacity 
                style={[styles.listItem, { borderBottomColor: '#1e293b' }]}
                onPress={() => { setSettingsModalVisible(false); setEditModalVisible(true); }}
              >
                <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(139, 92, 246, 0.1)'}]}>
                  <Feather name="user" size={18} color="#8b5cf6" />
                </View>
                <View style={styles.listTextContainer}>
                  <Text style={[styles.listTitle, { color: 'white' }]}>Edit Profile</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.listItem, { borderBottomColor: '#1e293b' }]}
                onPress={() => { setSettingsModalVisible(false); setPasswordModalVisible(true); }}
              >
                <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(245, 158, 11, 0.1)'}]}>
                  <Feather name="lock" size={18} color="#f59e0b" />
                </View>
                <View style={styles.listTextContainer}>
                  <Text style={[styles.listTitle, { color: 'white' }]}>Change Password</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.listItem, { borderBottomWidth: 0 }]}
                onPress={() => { setSettingsModalVisible(false); handleLogout(); }}
              >
                <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(239, 68, 68, 0.1)'}]}>
                  <Feather name="log-out" size={18} color="#ef4444" />
                </View>
                <View style={styles.listTextContainer}>
                  <Text style={[styles.listTitle, { color: '#ef4444' }]}>Log Out</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </ScrollView>
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
            <View style={[styles.listCard, { backgroundColor: '#131823', borderColor: '#1e293b', padding: 20 }]}>
              <Feather name="headphones" size={32} color="#a855f7" style={{ marginBottom: 15 }} />
              <Text style={[styles.sectionTitle, { marginLeft: 0 }]}>Need Support?</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 10 }}>If you are experiencing any issues with your account or have questions about the platform, please contact our administrative team.</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                <Feather name="mail" size={18} color="#a855f7" style={{ marginRight: 10 }} />
                <Text style={{ color: '#a855f7', fontWeight: 'bold' }}>admin@examhub.com</Text>
              </View>
            </View>

            <View style={[styles.listCard, { backgroundColor: '#131823', borderColor: '#1e293b', padding: 20 }]}>
              <Feather name="shield" size={32} color="#10b981" style={{ marginBottom: 15 }} />
              <Text style={[styles.sectionTitle, { marginLeft: 0 }]}>Privacy Policy</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 15 }}>
                Your privacy is important to us. It is ExamHub's policy to respect your privacy regarding any information we may collect from you across our application.
              </Text>
              <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 5 }}>1. Information we collect</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 15 }}>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</Text>
              <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 5 }}>2. How we use your data</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 15 }}>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we'll protect within commercially acceptable means to prevent loss and theft.</Text>
              <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 5 }}>3. Third-party access</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 15 }}>We don't share any personally identifying information publicly or with third-parties, except when required to by law.</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#94a3b8' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 15, position: 'relative' },
  badgeDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#8b5cf6', borderWidth: 1, borderColor: '#0f172a' },
  
  content: { padding: 15, paddingBottom: 40 },

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

  fsModalOverlay: { flex: 1, backgroundColor: '#0B0E14' },
  fsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  fsHeaderBtn: { padding: 5 },
  fsModalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  fsModalScroll: { paddingHorizontal: 25, paddingBottom: 50 },
  
  fsAvatarSection: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  fsAvatarOuterRing: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(139,92,246,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#8b5cf6' },
  fsAvatarInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fsAvatarImage: { width: '100%', height: '100%' },
  fsAvatarInitials: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  fsCameraBtn: { position: 'absolute', bottom: 5, right: 5, width: 32, height: 32, borderRadius: 16, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0B0E14' },
  fsAvatarHint: { color: '#94a3b8', fontSize: 13, marginTop: 15 },
  
  fsFormGroup: { marginBottom: 20 },
  fsLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  fsInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#131823', borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', paddingHorizontal: 15 },
  fsInputIcon: { marginRight: 10 },
  fsInput: { flex: 1, color: 'white', fontSize: 15, paddingVertical: 14 },
  fsInputRightIcon: { marginLeft: 10 },
  
  fsSaveBtn: { backgroundColor: '#6366f1', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 20, marginBottom: 40 },
  fsSaveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  
  fsShieldSection: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
  fsShieldOuter: { width: 100, height: 110, backgroundColor: 'rgba(139,92,246,0.1)', justifyContent: 'center', alignItems: 'center', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', position: 'relative' },
  fsShieldInner: { width: 60, height: 70, backgroundColor: 'rgba(139,92,246,0.2)', justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  fsShieldCheck: { position: 'absolute', bottom: 15, right: 15, width: 24, height: 24, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0B0E14' },
  fsShieldTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  fsShieldSub: { color: '#94a3b8', fontSize: 14, marginTop: 8, textAlign: 'center' },
  
  fsStrengthSection: { marginTop: 10 },
  fsStrengthBars: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  fsStrengthBar: { height: 4, flex: 1, backgroundColor: '#334155', borderRadius: 2, marginHorizontal: 2 },
  fsStrengthText: { fontSize: 12, fontWeight: '600' },
  
  fsRulesBox: { backgroundColor: '#131823', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 },
  fsRulesTitle: { color: 'white', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  fsRuleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fsRuleText: { fontSize: 13, marginLeft: 8 },
});
