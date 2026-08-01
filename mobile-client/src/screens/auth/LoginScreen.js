import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, ActivityIndicator, 
  Animated, Dimensions, Easing, Alert, Image
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { loginUser, verifyLoginUser, clearError } from '../../redux/slices/authSlice';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import BouncyTouchable from '../../components/BouncyTouchable';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const otpInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [logoScale] = useState(new Animated.Value(0.3));
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Floating Orbs animation
  const [orb1Anim] = useState(new Animated.Value(0));
  const [orb2Anim] = useState(new Animated.Value(0));

  const dispatch = useDispatch();
  const { isLoading, error, loginOtpSent, loginEmail, loginRole, loginPassword } = useSelector(state => state.auth);

  useEffect(() => {
    if (otp.length === 6 && loginOtpSent) {
      handleVerifyOTP();
    }
  }, [otp]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true })
    ]).start();

    // Pulse animation for logo after entrance
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) })
      ])
    ).start();

    // Floating orb animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, { toValue: 1, duration: 4000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(orb1Anim, { toValue: 0, duration: 4000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, { toValue: 1, duration: 5000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(orb2Anim, { toValue: 0, duration: 5000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) })
      ])
    ).start();
  }, []);

  const roles = [
    { id: 'student', label: 'Student', icon: 'user', color: '#38bdf8' },
    { id: 'teacher', label: 'Teacher', icon: 'briefcase', color: '#a78bfa' },
    { id: 'admin', label: 'Admin', icon: 'shield', color: '#f43f5e' },
  ];

  const handleSubmit = async () => {
    let newErrors = {};
    if (!email) newErrors.email = 'Please fill this Email field';
    if (!password) newErrors.password = 'Please fill this Password field';
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);
    
    setErrors({});
    dispatch(loginUser({ email: email.trim(), password, role: selectedRole }));
  };

  const handleForgotPassword = async () => {
    if (!email) {
      return Alert.alert('Email Required', 'Please enter your registered email address above first to recover your password.');
    }
    setIsSendingForgot(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: email.trim() });
      setIsSendingForgot(false);
      Alert.alert('Recovery Email Sent', res.data.message || 'We have sent your current login password to your email. You can now login using this password.');
    } catch (err) {
      setIsSendingForgot(false);
      Alert.alert('Error', err.response?.data?.message || 'Failed to send recovery email. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return setErrors({ otp: 'Please enter the OTP' });
    setErrors({});
    dispatch(verifyLoginUser({ 
      email: (loginEmail || email).trim(), 
      password: loginPassword || password, 
      role: loginRole || selectedRole, 
      otp 
    }));
  };

  const handleResendOTP = () => {
    dispatch(loginUser({ 
      email: (loginEmail || email).trim(), 
      password: loginPassword || password, 
      role: loginRole || selectedRole 
    }));
  };

  const renderOtpBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const digit = otp[i] || '';
      const isCurrent = otp.length === i;
      boxes.push(
        <View 
          key={i} 
          style={[
            styles.otpBox,
            isCurrent && styles.otpBoxActive,
            digit && styles.otpBoxFilled
          ]}
        >
          <Text style={styles.otpDigit}>{digit}</Text>
        </View>
       );
    }
    return boxes;
  };

  const orb1TranslateY = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const orb2TranslateY = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0f172a', '#1e1b4b', '#0f172a']} style={StyleSheet.absoluteFillObject} />
      
      {/* Decorative Orbs */}
      <Animated.View style={[styles.orb, styles.orb1, { transform: [{ translateY: orb1TranslateY }] }]} />
      <Animated.View style={[styles.orb, styles.orb2, { transform: [{ translateY: orb2TranslateY }] }]} />

      <KeyboardAvoidingView style={styles.content} behavior="padding">
        <Animated.View style={[styles.glassCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          
          {!loginOtpSent ? (
            <View>
              <View style={styles.headerContainer}>
                <Animated.View style={[styles.iconWrapper, { transform: [{ scale: logoScale }, { scale: pulseAnim }] }]}>
                  <Image source={require('../../../assets/Applogo.png')} style={{ width: 64, height: 64, borderRadius: 20 }} resizeMode="contain" />
                </Animated.View>
                <Text style={styles.title}>ExamHub</Text>
                <Text style={styles.subtitle}>Welcome back! Please enter your details.</Text>
              </View>

              <View style={styles.rolesContainer}>
                {roles.map((role) => {
                  const isActive = selectedRole === role.id;
                  return (
                    <TouchableOpacity
                      key={role.id}
                      onPress={() => {
                        setSelectedRole(role.id);
                        setEmail('');
                        setPassword('');
                      }}
                      style={[
                        styles.roleButton,
                        isActive && { backgroundColor: role.color + '20', borderColor: role.color }
                      ]}
                      activeOpacity={0.7}
                    >
                      <Feather name={role.icon} size={20} color={isActive ? role.color : '#94a3b8'} />
                      <Text style={[styles.roleText, isActive && { color: role.color, fontWeight: 'bold' }]}>{role.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email Address"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <View style={[styles.inputContainer, { marginTop: 16 }]}>
                <Feather name="lock" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              <TouchableOpacity 
                onPress={handleForgotPassword} 
                disabled={isSendingForgot}
                style={{ alignSelf: 'flex-end', marginTop: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}
              >
                {isSendingForgot && <ActivityIndicator size="small" color="#6366f1" style={{ marginRight: 6 }} />}
                <Text style={{ color: '#6366f1', fontSize: 13, fontWeight: '600' }}>
                  {isSendingForgot ? 'Sending Mail...' : 'Forgot Password?'}
                </Text>
              </TouchableOpacity>

              {error && (
                <View style={styles.serverError}>
                  <Feather name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.serverErrorText}>{error}</Text>
                </View>
              )}

              <BouncyTouchable 
                style={[styles.submitButton, isLoading && styles.disabledButton]} 
                onPress={handleSubmit}
                disabled={isLoading}
                activeScale={0.95}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Continue</Text>
                )}
              </BouncyTouchable>

              {selectedRole !== 'admin' && (
                <BouncyTouchable onPress={() => navigation.navigate('Register')} style={styles.registerLink} activeScale={0.98}>
                  <Text style={styles.registerText}>
                    Don't have an account? <Text style={styles.registerTextBold}>Sign up</Text>
                  </Text>
                </BouncyTouchable>
              )}
            </View>
          ) : (
            <View>
              <TouchableOpacity onPress={() => { dispatch(clearError()); setOtp(''); }} style={styles.backBtnCircle}>
                <Feather name="arrow-left" size={20} color="#10b981" />
              </TouchableOpacity>

              <View style={styles.headerContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1 }]}>
                  <Feather name="shield" size={32} color="#10b981" />
                </View>
                <Text style={styles.title}>Check Your Email</Text>
                <Text style={styles.subtitle}>We've sent a 6-digit code to</Text>
                <Text style={[styles.subtitle, { color: '#10b981', fontWeight: '700', marginTop: 4 }]}>{email || loginEmail}</Text>
              </View>

              <View style={styles.otpContainer}>
                <TouchableOpacity activeOpacity={1} onPress={() => otpInputRef.current?.focus()} style={styles.otpBoxesRow}>
                  {renderOtpBoxes()}
                </TouchableOpacity>
                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenOtpInput}
                  value={otp}
                  onChangeText={(val) => setOtp(val.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  maxLength={6}
                  caretHidden={true}
                  selectTextOnFocus={false}
                  autoFocus
                />
              </View>
              {errors.otp && <Text style={[styles.errorText, { textAlign: 'center' }]}>{errors.otp}</Text>}

              <View style={styles.validityBadge}>
                <Feather name="shield" size={15} color="#10b981" />
                <Text style={styles.validityText}>Your code is valid for 10 minutes</Text>
              </View>

              {error && (
                <View style={styles.serverError}>
                  <Feather name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.serverErrorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: '#10b981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, isLoading && styles.disabledButton]} 
                onPress={handleVerifyOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Feather name="lock" size={18} color="white" />
                    <Text style={styles.submitButtonText}>Verify OTP</Text>
                    <Feather name="chevron-right" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <TouchableOpacity onPress={handleResendOTP}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.resendLink}>Resend Code</Text>
                    <Feather name="refresh-cw" size={14} color="#10b981" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  orb: { position: 'absolute', borderRadius: 9999, opacity: 0.4 },
  orb1: { width: 300, height: 300, backgroundColor: '#4338ca', top: -50, left: -100, filter: 'blur(40px)' },
  orb2: { width: 250, height: 250, backgroundColor: '#7e22ce', bottom: -50, right: -50, filter: 'blur(50px)' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContainer: { alignItems: 'center', marginBottom: 32 },
  iconWrapper: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  rolesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  roleButton: {
    flex: 1, alignItems: 'center', paddingVertical: 12, marginHorizontal: 4,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  roleText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginTop: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12, height: 56, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: 'white', fontSize: 16, height: '100%' },
  eyeIcon: { padding: 8 },
  errorText: { color: '#f87171', fontSize: 12, marginTop: 6, marginLeft: 4 },
  serverError: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1,
    borderRadius: 12, padding: 12, marginTop: 16,
  },
  serverErrorText: { color: '#f87171', fontSize: 13, marginLeft: 8, flex: 1 },
  submitButton: {
    backgroundColor: '#8b5cf6', borderRadius: 12, height: 56,
    justifyContent: 'center', alignItems: 'center', marginTop: 24,
  },
  disabledButton: { opacity: 0.7 },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  registerLink: { marginTop: 24, alignItems: 'center' },
  registerText: { color: '#94a3b8', fontSize: 14 },
  registerTextBold: { color: '#a78bfa', fontWeight: 'bold' },
  closeBtn: { alignSelf: 'flex-start', marginBottom: -20, zIndex: 10, padding: 8 },

  /* OTP Verification UI styles */
  backBtnCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start', marginBottom: 12
  },
  otpContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 16
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8
  },
  otpBox: {
    width: 46, height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  otpBoxActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  otpBoxFilled: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(15, 23, 42, 0.9)'
  },
  otpDigit: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800'
  },
  hiddenOtpInput: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.01,
    color: 'transparent',
    backgroundColor: 'transparent'
  },
  validityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8
  },
  validityText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500'
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24
  },
  resendText: {
    color: '#94a3b8',
    fontSize: 14
  },
  resendLink: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700'
  }
});
