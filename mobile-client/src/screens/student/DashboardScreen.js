import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
  TouchableOpacity, Modal, Image, FlatList, StatusBar, RefreshControl, Platform, Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStudentExams } from '../../redux/slices/examSlice';
import { getStudentResults, getLeaderboard, getToppers, likeTopper } from '../../redux/slices/resultSlice';
import Skeleton from '../../components/Skeleton';
import BouncyTouchable from '../../components/BouncyTouchable';
import api from '../../services/api';
import { playRefreshSound, playHomeChime, playLikeSound } from '../../utils/SoundManager';

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

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 44) / 2;   // two columns with spacing

const AnimatedLikeButton = ({ item, handleLike, styles, colors, extraStyle }) => {
  const scale = useRef(new Animated.Value(1)).current;
  
  const onPress = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
    handleLike(item.resultId);
  };

  return (
    <TouchableOpacity 
      style={[styles.likeBtn, item.likedByMe && styles.likeBtnActive, extraStyle]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Feather name="heart" size={12} color={item.likedByMe ? "#ec4899" : "#94a3b8"} />
      </Animated.View>
      <Text style={[styles.likeText, item.likedByMe && { color: '#ec4899' }]}>
        {item.likes?.length || 0}
      </Text>
    </TouchableOpacity>
  );
};

export default function DashboardScreen() {
  const player = useVideoPlayer(require('../../../assets/student side video.mp4'), player => {
    player.loop = true;
    player.volume = 0;
  });

  React.useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      player.muted = true;
    });
    return () => sub.remove();
  }, [player]);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [perfFilter, setPerfFilter] = useState('This Month');
  const [subFilter, setSubFilter] = useState('This Month');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const modalZoomAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (selectedTopper) {
      modalZoomAnim.setValue(0.5);
      Animated.spring(modalZoomAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();
    }
  }, [selectedTopper]);

  const cycleFilter = (current, setFilter) => {
    if (current === 'This Month') setFilter('Last 3 Months');
    else if (current === 'Last 3 Months') setFilter('All Time');
    else setFilter('This Month');
  };

  const { user } = useSelector(s => s.auth);
  const { exams, isLoading: examsLoading } = useSelector(s => s.exams);

  React.useEffect(() => {
    if (!examsLoading && player) {
      player.play();
    }
  }, [examsLoading, player]);
  const { results, leaderboard, toppers } = useSelector(s => s.results);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllToppers, setShowAllToppers] = useState(false);
  const [selectedTopper, setSelectedTopper] = useState(null);
  const [statModalConfig, setStatModalConfig] = useState({ visible: false, title: '', filterType: '' });
  const [showRecentExamsModal, setShowRecentExamsModal] = useState(false);
  const { unreadCount } = useSelector(s => s.notifications);
  const { hasUnreadMessages, contacts } = useSelector(s => s.chat);
  const { theme } = useSelector(s => s.ui || { theme: 'dark' });
  const unreadUsersCount = (contacts || []).filter(c => c.unreadCount && c.unreadCount > 0).length;

  const getExamStatus = useCallback((exam) => {
    const resultForExam = (results || []).find(r => r.examId?._id === exam._id || r.examId === exam._id);
    if (resultForExam && (resultForExam.status === 'submitted' || resultForExam.isCompleted)) return 'Completed';
    if (exam.isAvailable || exam.status === 'ongoing') return 'Available';
    if (exam.isUpcoming || exam.status === 'published') return 'Upcoming';
    return 'Expired';
  }, [results]);

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    text: isDarkMode ? 'white' : '#050505',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? 'rgba(255,255,255,0.03)' : 'white',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    primary: '#06b6d4', // Cyan accent
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
  };

  const styles = getStyles(colors);
  const [stats, setStats] = useState({
    examsTaken: 0, passed: 0, avgScore: 0, upcoming: 0, ongoing: 0,
    totalPassed: 0, totalFailed: 0, bestScore: 0, expired: 0,
  });

  useFocusEffect(
    useCallback(() => {
      const fetchData = () => {
        dispatch(getToppers()); // Fetch toppers first for immediate display
        dispatch(getStudentExams());
        dispatch(getStudentResults());
        dispatch(getLeaderboard());
      };

      fetchData();
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true })
      ]).start();

      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(floatAnim, { toValue: -6, duration: 2000, useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
          ]),
          Animated.sequence([
            Animated.timing(breatheAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
            Animated.timing(breatheAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
          ]),
          Animated.timing(spinAnim, {
            toValue: 1,
            duration: 15000,
            useNativeDriver: true
          })
        ])
      ).start();

      const interval = setInterval(fetchData, 30000); // 30 seconds poll
      
      return () => { 
        clearInterval(interval); 
        fadeAnim.setValue(0); 
        slideAnim.setValue(20); 
        floatAnim.setValue(0);
        pulseAnim.setValue(1);
        breatheAnim.setValue(1);
        spinAnim.setValue(0);
      };
    }, [dispatch])
  );

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  useFocusEffect(useCallback(() => {
    if (!exams || !results) return;
    const publishedResults = results?.filter(r => r.isPublished) || [];
    const examsTaken = results?.filter(r => r.status === 'submitted' || r.isCompleted)?.length || 0;
    const passed = publishedResults.filter(r => r.isPassed).length;
    const missedExams = (exams || []).filter(e => {
      const isExpired = getExamStatus(e) === 'Expired';
      const hasTaken = results?.some(r => r.examId?._id === e._id || r.examId === e._id);
      return isExpired && !hasTaken;
    }).length;
    const scores = publishedResults.map(r => r.percentage || 0);
    const totalExpected = scores.length + missedExams;
    const avgScore = totalExpected > 0 ? scores.reduce((a, b) => a + b, 0) / totalExpected : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const ongoing = (exams || []).filter(e => e.isAvailable || e.status === 'ongoing').length;
    const upcoming = (exams || []).filter(e => !(e.isAvailable || e.status === 'ongoing') && (e.isUpcoming || e.status === 'published')).length;
    const expired = (exams || []).filter(e => getExamStatus(e) === 'Expired').length;
    const publishedCount = publishedResults.length;
    const totalFailed = publishedCount - passed;
    const pendingCount = Math.max(0, examsTaken - publishedCount);
    setStats({ examsTaken, passed, avgScore, upcoming, ongoing, totalPassed: passed, totalFailed, publishedCount, bestScore, expired, pendingCount, missedExams });
  }, [exams, results]));

  const onRefresh = useCallback(async () => {
    playRefreshSound();
    setRefreshing(true);
    await Promise.all([
      dispatch(getToppers()), // Fetch toppers first for immediate display
      dispatch(getStudentExams()),
      dispatch(getStudentResults()),
      dispatch(getLeaderboard()),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleLike = (resultId) => {
    playLikeSound();
    dispatch({ type: 'results/likeTopperOptimistic', payload: { resultId, userId: user._id || user.id } });
    dispatch(likeTopper(resultId));
  };

  /* ─── stat modal filter helper ─── */
  const handleStatCardClick = (label) => {
    switch (label) {
      case 'Total Attempted':
        setStatModalConfig({ visible: true, title: 'Total Attempted Exams', filterType: 'attempted' });
        break;
      case 'Passed':
        setStatModalConfig({ visible: true, title: 'Passed Exams', filterType: 'passed' });
        break;
      case 'Failed':
        setStatModalConfig({ visible: true, title: 'Failed Exams', filterType: 'failed' });
        break;
      case 'Pending Result':
        setStatModalConfig({ visible: true, title: 'Pending Result Exams', filterType: 'pending' });
        break;
      case 'Best Score':
        setStatModalConfig({ visible: true, title: 'Best Score Exam', filterType: 'best' });
        break;
      case 'Missing':
        setStatModalConfig({ visible: true, title: 'Missing Exams', filterType: 'missing' });
        break;
      case 'Avg Score':
        setStatModalConfig({ visible: true, title: 'All Published Exams', filterType: 'all_published' });
        break;
      default:
        break;
    }
  };

  const getFilteredStatExams = () => {
    if (!results) return [];
    const submitted = results.filter(r => r.status === 'submitted' || r.isCompleted || r.isPublished);
    const published = results.filter(r => r.isPublished);
    if (statModalConfig.filterType === 'attempted') {
      return [...submitted].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
    }
    if (statModalConfig.filterType === 'passed') {
      return [...published.filter(r => r.isPassed)].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
    }
    if (statModalConfig.filterType === 'failed') {
      return [...published.filter(r => !r.isPassed)].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
    }
    if (statModalConfig.filterType === 'pending') {
      return [...results.filter(r => !r.isPublished && (r.status === 'submitted' || r.isCompleted || r.status === 'pending_evaluation'))].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
    }
    if (statModalConfig.filterType === 'best') {
      if (published.length === 0) return [];
      const best = Math.max(...published.map(r => r.percentage || 0));
      return published.filter(r => (r.percentage || 0) === best);
    }
    if (statModalConfig.filterType === 'all_published') {
      return [...published].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
    }
        if (statModalConfig.filterType === 'missing') {
      return (exams || []).filter(e => {
        const isExpired = getExamStatus(e) === 'Expired';
        const hasTaken = results?.some(r => r.examId?._id === e._id || r.examId === e._id);
        return isExpired && !hasTaken;
      }).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    }
    return [];
  };

  /* ─── chart data ─── */
  const published = [...(results?.filter(r => r.isPublished) || [])].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
  const recentPublished = published.slice(0, 6);

  const perfLabels = recentPublished.length > 1
    ? recentPublished.map(r => (r.examId?.title || 'Exam').substring(0, 5))
    : recentPublished.length === 1
      ? [(recentPublished[0].examId?.title || 'Exam').substring(0, 5), 'Prev']
      : ['No Data'];

  const perfScores = recentPublished.length > 1
    ? recentPublished.map(r => r.percentage || 0)
    : recentPublished.length === 1
      ? [recentPublished[0].percentage || 0, 0]
      : [0];

  const lineData = {
    labels: perfLabels,
    datasets: [{ data: perfScores, color: (op = 1) => `rgba(6,182,212,${op})`, strokeWidth: 2 }],
  };

  /* subject bar & pass/fail breakdown */
  const subjectMap = published.reduce((acc, r) => {
    const s = r.examId?.subject || 'General';
    if (!acc[s]) acc[s] = { total: 0, count: 0, passed: 0, failed: 0 };
    acc[s].total += r.percentage || 0;
    acc[s].count += 1;
    if (r.isPassed) {
      acc[s].passed += 1;
    } else {
      acc[s].failed += 1;
    }
    return acc;
  }, {});
  const subLabels = Object.keys(subjectMap).length > 0 ? Object.keys(subjectMap) : ['N/A'];
  const subAvgs = Object.keys(subjectMap).length > 0
    ? Object.values(subjectMap).map(v => v.total / v.count)
    : [0];

  const barData = { labels: subLabels, datasets: [{ data: subAvgs }] };

  /* pass/fail pie */
  const pieData = stats.publishedCount > 0 ? [
    { name: 'Passed', population: stats.passed || 0.001, color: '#00e676', legendFontColor: '#94a3b8', legendFontSize: 13 },
    { name: 'Failed', population: stats.totalFailed || 0.001, color: '#ff3d00', legendFontColor: '#94a3b8', legendFontSize: 13 },
  ] : [];

  const chartCfg = {
    backgroundGradientFrom: isDarkMode ? 'rgba(255,255,255,0.03)' : 'white',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: isDarkMode ? '#000000' : '#f8fafc',
    backgroundGradientToOpacity: 0,
    color: (op = 1) => `rgba(0, 242, 254, ${op})`,
    labelColor: () => '#94a3b8',
    strokeWidth: 3,
    barPercentage: 0.7,
    propsForDots: { r: '5', strokeWidth: '3', stroke: colors.card },
    propsForBackgroundLines: { strokeDasharray: '4', stroke: 'rgba(148,163,184,0.1)' },
    decimalPlaces: 1,
  };

  /* recent exams (last 4 by default) */
  const sortedExams = [...(exams || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentExams = sortedExams.slice(0, 4);

  /* upcoming exams (next 5) */
  const upcomingExams = [...(exams || [])]
    .filter(e => getExamStatus(e) === 'Upcoming' || getExamStatus(e) === 'Available')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const statusStyle = {
    'Completed': { bg: 'rgba(6,182,212,0.15)', color: '#818cf8' },
    'Available': { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    'Upcoming': { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
    'Expired': { bg: 'rgba(148,163,184,0.15)', color: colors.subText },
  };

  const FilterPill = ({ label, active, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterPill, active && styles.filterPillActive]}
    >
      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
        {label}
      </Text>
      <Feather name="chevron-down" size={12} color={active ? '#fff' : '#94a3b8'} style={{ marginLeft: 2 }} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={true} backgroundColor="transparent" />
      <Animated.ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />
        }
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
            >
              <Animated.View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5, borderWidth: 2, borderColor: '#fff', transform: [{ scale: breatheAnim }] }}>
                {user?.profileImage ? (
                  <Image source={{ uri: getImageUrl(user.profileImage) }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{user?.name?.charAt(0).toUpperCase() || 'S'}</Text>
                )}
              </Animated.View>
            </TouchableOpacity>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Home</Text>
              <Text style={{ color: colors.subText, fontSize: 12, marginTop: 2 }}>Dashboard Overview</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : '#ffffff', borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} 
              onPress={() => {
                dispatch({ type: 'chat/clearUnreadMessages' });
                navigation.navigate('ChatList');
              }}
            >
              <Feather name="message-square" size={20} color={colors.text} />
              {unreadUsersCount > 0 ? (
                <Animated.View style={[styles.badgeTextDot, { opacity: pulseAnim }]}>
                  <Text style={styles.badgeText}>{unreadUsersCount > 99 ? '99+' : unreadUsersCount}</Text>
                </Animated.View>
              ) : hasUnreadMessages ? (
                <Animated.View style={[styles.badgeDot, { opacity: pulseAnim }]} />
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : '#ffffff', borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} 
              onPress={() => navigation.navigate('Notifications')}
            >
              <Feather name="bell" size={20} color={colors.text} />
              {unreadCount > 0 ? (
                <Animated.View style={[styles.badgeTextDot, { opacity: pulseAnim }]}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </Animated.View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : '#ffffff', borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setSidebarVisible(true)}>
              <Feather name="menu" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 🌟 Welcome Banner 🌟 */}
        <Animated.View style={[
          styles.banner, 
          { 
            borderColor: isDarkMode ? 'rgba(6,182,212,0.5)' : 'rgba(99,102,241,0.5)',
            shadowColor: isDarkMode ? '#06b6d4' : '#6366f1',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            transform: [{ scale: breatheAnim.interpolate({ inputRange: [1, 1.03], outputRange: [1, 1.01] }) }]
          }
        ]}>
          <View style={{ flex: 1 }}>
            <Animated.Text style={[
              styles.bannerWelcome, 
              { 
                color: isDarkMode ? '#00f2fe' : '#4f46e5',
                textShadowColor: isDarkMode ? 'rgba(0,242,254,0.6)' : 'rgba(79,70,229,0.3)',
                textShadowRadius: 6
              }
            ]}>Welcome back,</Animated.Text>
            <Text style={[styles.bannerName]}>{user?.name?.split(' ')[0]}! 👋</Text>
            <Text style={[styles.bannerSub]}>Here&apos;s your exam performance summary.</Text>
          </View>
          <Animated.View style={[styles.bannerGraphic, { transform: [{ translateY: floatAnim }] }]}>
            <View style={{ width: 100, height: 100, position: 'relative', marginTop: 10 }}>
              <VideoView
                player={player}
                style={{
                  position: 'absolute',
                  top: 12.5,
                  left: 8.3,
                  width: 83.4,
                  height: 58.4,
                  borderRadius: 6,
                }}
                contentFit="cover"
                nativeControls={false}
              />
              <Feather name="monitor" size={100} color={isDarkMode ? "#ffffff" : "#6366f1"} style={{ position: 'absolute', top: 0, left: 0 }} />
              <View style={[styles.monitorInner, { bottom: 2, right: -10, backgroundColor: isDarkMode ? 'rgba(0,242,254,0.7)' : 'rgba(6,182,212,0.6)', padding: 6, borderRadius: 12 }]}>
                <Feather name="activity" size={24} color={isDarkMode ? "#ffffff" : "#ffffff"} />
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* ── Ongoing Exam Banner ── */}
        {exams?.find(e => getExamStatus(e) === 'Available') && (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Exams')}
          >
            <Animated.View style={[styles.banner, { backgroundColor: '#f59e0b', borderColor: '#d97706', paddingVertical: 14, paddingHorizontal: 18, transform: [{ scale: breatheAnim }] }]}>
              <Feather name="alert-circle" size={24} color="#fff" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Ongoing Exam Available!</Text>
                <Text style={{ color: '#fff', fontSize: 13, opacity: 0.9 }}>Tap to join now</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#fff" />
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* ── Stat Cards - Scrollable ── */}
        {((examsLoading && (!exams || exams.length === 0)) || refreshing) ? (
          <FlatList
            horizontal
            data={[1, 2, 3, 4]}
            keyExtractor={(item) => item.toString()}
            renderItem={() => <Skeleton width={130} height={110} borderRadius={20} />}
            contentContainerStyle={{ paddingHorizontal: 2, gap: 12, marginBottom: 16 }}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2, gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Total Attempted', value: stats.examsTaken || 0, icon: 'file-text', iconBg: '#1e3a5f', iconColor: '#60a5fa', stripeColor: '#3b82f6' },
              { label: 'Passed', value: stats.passed || 0, icon: 'check-circle', iconBg: '#14532d', iconColor: '#4ade80', stripeColor: '#10b981' },
              { label: 'Failed', value: stats.totalFailed || 0, icon: 'x-circle', iconBg: '#450a0a', iconColor: '#f87171', stripeColor: '#ef4444' },
              { label: 'Pending Result', value: stats.pendingCount || 0, icon: 'clock', iconBg: '#422006', iconColor: '#fb923c', stripeColor: '#f59e0b' },
              { label: 'Avg Score', value: `${(stats.avgScore || 0).toFixed(1)}%`, icon: 'trending-up', iconBg: '#3b0764', iconColor: '#c084fc', stripeColor: '#6366f1' },
              { label: 'Best Score', value: `${(stats.bestScore || 0).toFixed(1)}%`, icon: 'star', iconBg: '#312e81', iconColor: '#fbbf24', stripeColor: '#eab308' },
              { label: 'Missing', value: stats.missedExams || 0, icon: 'alert-triangle', iconBg: '#451a03', iconColor: '#fbbf24', stripeColor: '#f59e0b' },
            ].map((s, i) => (
              <BouncyTouchable key={i} style={[styles.statCard, { width: 130 }]} activeScale={0.9} onPress={() => handleStatCardClick(s.label)}>
                <View style={[styles.statCardTopStripe, { backgroundColor: s.stripeColor }]} />
                <Animated.View style={[styles.statIconBox, { backgroundColor: s.iconBg, transform: [{ scale: breatheAnim }] }]}>
                  <Feather name={s.icon} size={18} color={s.iconColor} />
                </Animated.View>
                <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
              </BouncyTouchable>
            ))}
          </ScrollView>
        )}

        {/* ── Performance Trend (full width) ── */}
        {((examsLoading && (!exams || exams.length === 0)) || refreshing) ? (
          <View style={styles.fullCard}>
            <Skeleton width="100%" height={24} style={{marginBottom: 16}} borderRadius={8} />
            <Skeleton width="100%" height={200} borderRadius={12} />
          </View>
        ) : (
        <View style={styles.fullCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleLg}>Performance Trend (Recent Exams)</Text>
            <BouncyTouchable 
              activeScale={0.9}
              onPress={() => setStatModalConfig({ visible: true, title: 'All Attempted Exams', filterType: 'attempted' })}
              style={{ backgroundColor: 'rgba(6,182,212,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 }}
            >
              <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: '700' }}>View All</Text>
            </BouncyTouchable>
          </View>
          {published.length > 0 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={lineData}
                  width={Math.max(SCREEN_W - 48, perfLabels.length * 75)}
                  height={200}
                  chartConfig={chartCfg}
                  style={{ marginLeft: -8, marginTop: 8, borderRadius: 12 }}
                  withInnerLines
                  withOuterLines={false}
                  withDots
                  withShadow
                  fromZero={true}
                  bezier
                />
              </ScrollView>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#00f2fe' }]} />
                <Text style={styles.legendText}>Score (%)</Text>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Feather name="bar-chart-2" size={48} color="#475569" style={{ marginBottom: 12 }} />
              <Text style={{ color: colors.subText, fontSize: 15, fontWeight: 'bold' }}>No performance data yet</Text>
              <Text style={{ color: colors.subText, fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 }}>
                Complete exams and wait for results to see your trend.
              </Text>
            </View>
          )}
        </View>
        )}

        {/* ── Subject Performance (full width) ── */}
        {((examsLoading && (!exams || exams.length === 0)) || refreshing) ? (
          <View style={styles.fullCard}>
            <Skeleton width="100%" height={24} style={{marginBottom: 16}} borderRadius={8} />
            <Skeleton width="100%" height={200} borderRadius={12} />
          </View>
        ) : (
        <View style={styles.fullCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleLg}>Subject Performance</Text>
            <FilterPill label={subFilter} active onPress={() => cycleFilter(subFilter, setSubFilter)} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* ── Top side P and F badges above each bar ── */}
              <View style={{ flexDirection: 'row', paddingLeft: 56, marginBottom: 4 }}>
                {subLabels.map((subj) => {
                  const data = subjectMap[subj] || { passed: 0, failed: 0 };
                  return (
                    <View key={subj} style={{ width: 80, alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(30,41,59,0.9)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#00e676' }}>P:{data.passed}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', marginHorizontal: 3 }}>|</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#ff3d00' }}>F:{data.failed}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              <BarChart
                data={barData}
                width={Math.max(SCREEN_W - 64, subLabels.length * 80)}
                height={200}
                chartConfig={{ ...chartCfg, color: (op = 1) => `rgba(176, 38, 255, ${op})`, strokeWidth: 0, fillShadowGradient: '#b026ff', fillShadowGradientOpacity: 1 }}
                style={{ marginLeft: -8, marginTop: 4, borderRadius: 12 }}
                withInnerLines
                showValuesOnTopOfBars
                withHorizontalLabels
                fromZero
              />
            </View>
          </ScrollView>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#b026ff' }]} />
            <Text style={styles.legendText}>Score (%)</Text>
          </View>
        </View>
        )}

        {/* ── Pass/Fail Distribution (full width, matching teacher layout) ── */}
        {((examsLoading && (!exams || exams.length === 0)) || refreshing) ? (
          <View style={styles.fullCard}>
            <Skeleton width="100%" height={24} style={{marginBottom: 16}} borderRadius={8} />
            <Skeleton width="100%" height={140} borderRadius={12} />
          </View>
        ) : (
        <View style={styles.fullCard}>
          <Text style={styles.cardTitleLg}>Pass/Fail Distribution</Text>
          <View style={styles.passFailRow}>
            {/* Donut Chart */}
            <View style={styles.passFailDonut}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <PieChart
                  data={pieData}
                  width={140}
                  height={140}
                  chartConfig={chartCfg}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="32"
                  hasLegend={false}
                  absolute
                />
              </Animated.View>
              <Animated.View style={[styles.passFailDonutCenter, { width: 80, height: 80, borderRadius: 40, backgroundColor: isDarkMode ? '#000000' : '#ffffff', transform: [{ scale: breatheAnim }] }]}>
                <Text style={styles.passFailDonutValue}>{stats.publishedCount || 0}</Text>
                <Text style={styles.passFailDonutLabel}>Total Exam</Text>
              </Animated.View>
            </View>

            {/* Legend */}
            <View style={styles.passFailLegend}>
              <View style={styles.passFailLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#00e676' }]} />
                <Text style={{ color: '#00e676', fontSize: 13, fontWeight: '600' }}>
                  {stats.publishedCount > 0 ? ((stats.passed / stats.publishedCount) * 100).toFixed(0) : 0}% Passed
                </Text>
              </View>
              <Text style={styles.passFailLegendCount}>{stats.passed} Exam</Text>
              <View style={[styles.passFailLegendItem, { marginTop: 10 }]}>
                <View style={[styles.legendDot, { backgroundColor: '#ff3d00' }]} />
                <Text style={{ color: '#ff3d00', fontSize: 13, fontWeight: '600' }}>
                  {stats.publishedCount > 0 ? ((stats.totalFailed / stats.publishedCount) * 100).toFixed(0) : 0}% Failed
                </Text>
              </View>
              <Text style={styles.passFailLegendCount}>{stats.totalFailed} Exam</Text>
            </View>

            {/* Pass Rate Card */}
            <View style={styles.passRateCard}>
              <Feather name="clipboard" size={22} color="#818cf8" />
              <Text style={styles.passRateLabel}>Pass Rate</Text>
              <Text style={styles.passRateValue}>
                {stats.publishedCount > 0 ? ((stats.passed / stats.publishedCount) * 100).toFixed(1) : '0.0'}%
              </Text>
            </View>
          </View>
        </View>
        )}

        {/* ── Recent Exams (full width) ── */}
        <View style={styles.fullCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleLg}>Recent Exams</Text>
            {sortedExams.length > 4 && (
              <BouncyTouchable activeScale={0.9} onPress={() => setShowRecentExamsModal(true)}>
                <Text style={styles.viewAll}>View All</Text>
              </BouncyTouchable>
            )}
          </View>
          {recentExams.length > 0 ? recentExams.map((exam, i) => {
            const status = getExamStatus(exam);
            const ss = statusStyle[status] || statusStyle['Expired'];
            return (
              <View key={exam._id} style={[styles.recentRow, { backgroundColor: colors.bg, padding: 10, borderRadius: 12, marginBottom: 8 }]}>
                <View style={styles.examIconBox}>
                  <Feather name="file-text" size={14} color="#818cf8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTitle} numberOfLines={1}>{exam.title}</Text>
                  <Text style={styles.recentSub}>
                    {exam.subject} • {new Date(exam.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.statusText, { color: ss.color, fontSize: 12, fontWeight: '700' }]}>{status}</Text>
                  {status === 'Completed' && (
                    <Text style={{ color: ss.color, fontSize: 11, marginTop: 2 }}>
                      Score: {exam.isResultPublished 
                        ? `${(results || []).find(r => r.examId?._id === exam._id || r.examId === exam._id)?.percentage?.toFixed(1) ?? 0}%`
                        : 'Pending'
                      }
                    </Text>
                  )}
                  <Feather name="chevron-right" size={14} color="#64748b" style={{ marginTop: 2 }} />
                </View>
              </View>
            );
          }) : (
            <Text style={styles.emptyText}>No recent exams.</Text>
          )}
        </View>

        {/* ── Upcoming Exams (full width) ── */}
        <View style={styles.fullCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>📅</Text>
              <View>
                <Text style={styles.cardTitle}>Upcoming Exams</Text>
                <Text style={styles.cardSubtitle}>Exams scheduled in the future</Text>
              </View>
            </View>
            <BouncyTouchable activeScale={0.9} onPress={() => navigation.navigate('Exams')}>
              <Text style={styles.viewAll}>View All</Text>
            </BouncyTouchable>
          </View>

          {upcomingExams.length > 0 ? upcomingExams.map((exam) => {
            const status = getExamStatus(exam);
            const ss = statusStyle[status] || statusStyle['Upcoming'];
            return (
              <View key={exam._id} style={styles.recentRow}>
                <View style={[styles.examIconBox, { backgroundColor: 'rgba(251,146,60,0.1)' }]}>
                  <Feather name="clock" size={14} color="#fb923c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTitle} numberOfLines={1}>{exam.title}</Text>
                  <Text style={styles.recentSub}>
                    {exam.subject} • {new Date(exam.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' })} at {new Date(exam.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                  <Text style={[styles.statusText, { color: ss.color }]}>{status}</Text>
                </View>
              </View>
            );
          }) : (
            <View style={styles.emptyLeader}>
              <Feather name="calendar" size={24} color="#475569" />
              <Text style={[styles.emptyText, { marginTop: 8 }]}>No upcoming exams scheduled.</Text>
            </View>
          )}
        </View>

        {/* ── Exam Toppers ── */}
        <View style={styles.fullCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>🏆</Text>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Exam Toppers</Text>
                <Text style={styles.cardSubtitle}>Top performers in recent exams</Text>
              </View>
            </View>
            {toppers && toppers.length > 0 && (
              <BouncyTouchable activeScale={0.9} onPress={() => setShowAllToppers(true)}>
                <Text style={styles.viewAll}>View All</Text>
              </BouncyTouchable>
            )}
          </View>

          {/* carousel style – horizontal scroll */}
          {toppers && toppers.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {toppers.slice(0, 2).map((item, idx) => (
                <TouchableOpacity 
                  key={item.resultId} 
                  onPress={() => setSelectedTopper(item)}
                  activeOpacity={0.7}
                  style={[styles.leaderCard, { width: 280, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ position: 'relative', marginRight: 12 }}>
                      {item.student?.profileImage ? (
                        <Image source={{ uri: getImageUrl(item.student.profileImage) }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />
                      ) : (
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{(item.student?.name || 'U').charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: isDarkMode ? '#000000' : '#f8fafc' }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{idx + 1}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.leaderName, { textAlign: 'left', marginBottom: 2, color: colors.text }]} numberOfLines={1}>{item.student?.name || 'Unknown'}</Text>
                      <Text style={[styles.recentSub, { textAlign: 'left', color: colors.subText }]} numberOfLines={1}>{item.examTitle}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.leaderScore}>{item.score?.toFixed(1)}%</Text>
                    <AnimatedLikeButton 
                      item={item} 
                      handleLike={handleLike} 
                      styles={styles} 
                      colors={colors}
                      extraStyle={{ marginTop: 6, paddingVertical: 4, paddingHorizontal: 10, width: 'auto' }}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyLeader}>
              <Feather name="award" size={24} color="#475569" />
              <Text style={[styles.emptyText, { marginTop: 8 }]}>No toppers available yet.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </Animated.ScrollView>

      {/* ── Sidebar Modal ── */}
      <Modal visible={isSidebarVisible} transparent animationType="fade">
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSidebarVisible(false)} />
          <View style={[styles.sidebar, { backgroundColor: isDarkMode ? '#09090b' : '#ffffff', borderLeftWidth: 1, borderLeftColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <View style={styles.sidebarHead}>
              <Text style={[styles.sidebarTitle, { color: colors.text }]}>Menu</Text>
              <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'Home', icon: 'home', screen: 'Home' },
              { label: 'My Exams', icon: 'book-open', screen: 'Exams' },
              { label: 'Results', icon: 'award', screen: 'Results' },
              { label: 'Profile', icon: 'user', screen: 'Profile' },
            ].map(item => (
              <TouchableOpacity
                key={item.screen}
                style={[styles.sidebarItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
                onPress={() => { setSidebarVisible(false); navigation.navigate(item.screen); }}
              >
                <Feather name={item.icon} size={20} color={colors.text} style={{ marginRight: 16 }} />
                <Text style={[styles.sidebarItemText, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* All Toppers Modal */}
      <Modal
        visible={showAllToppers}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowAllToppers(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border || isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0', paddingTop: Math.max((insets.top || 20) + 15, 30) + 15, paddingBottom: 15 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>All Exam Toppers</Text>
            <TouchableOpacity onPress={() => setShowAllToppers(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={toppers || []}
            keyExtractor={item => item.resultId}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                key={item.resultId} 
                onPress={() => { setShowAllToppers(false); setSelectedTopper(item); }}
                activeOpacity={0.7}
                style={[styles.leaderCard, { width: '100%', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{ position: 'relative', marginRight: 12 }}>
                    {item.student?.profileImage ? (
                      <Image source={{ uri: getImageUrl(item.student.profileImage) }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{(item.student?.name || 'U').charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: isDarkMode ? '#000000' : '#f8fafc' }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{index + 1}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leaderName, { marginBottom: 2, textAlign: 'left', color: colors.text }]} numberOfLines={1}>{item.student?.name || 'Unknown'}</Text>
                    <Text style={[styles.recentSub, { textAlign: 'left', color: colors.subText }]}>{item.examTitle}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.leaderScore, { marginBottom: 6 }]}>{item.score?.toFixed(1)}%</Text>
                  <AnimatedLikeButton 
                    item={item} 
                    handleLike={handleLike} 
                    styles={styles} 
                    colors={colors}
                    extraStyle={{ marginTop: 0, paddingVertical: 4, paddingHorizontal: 10, width: 'auto', backgroundColor: colors.card, borderColor: colors.border }}
                  />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* All Recent Exams Modal */}
      <Modal
        visible={showRecentExamsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecentExamsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border || isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
            <Text style={styles.modalTitle}>All Recent Exams</Text>
            <TouchableOpacity onPress={() => setShowRecentExamsModal(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            horizontal
            data={sortedExams}
            keyExtractor={item => item._id}
            renderItem={({ item }) => {
              const status = getExamStatus(item);
              const ss = statusStyle[status] || statusStyle['Expired'];
              return (
                <View style={[styles.recentRow, { backgroundColor: colors.card, padding: 12, borderRadius: 12, marginBottom: 10 }]}>
                  <View style={[styles.examIconBox, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
                    <Feather name="file-text" size={16} color="#818cf8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recentTitle, { color: colors.text, fontSize: 15 }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.recentSub, { color: colors.subText }]}>
                      {item.subject} • {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                    <Text style={[styles.statusText, { color: ss.color }]}>{status}</Text>
                    {status === 'Completed' && (
                      <Text style={[styles.statusScore, { color: ss.color }]}>
                        {item.isResultPublished 
                          ? `Score: ${(results || []).find(r => r.examId?._id === item._id || r.examId === item._id)?.percentage?.toFixed(1) ?? 0}%`
                          : 'Pending'
                        }
                      </Text>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      </Modal>

      {/* ── Topper Student Profile Modal ── */}
      <Modal visible={!!selectedTopper} transparent animationType="fade" onRequestClose={() => setSelectedTopper(null)}>
        {selectedTopper && (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '90%', backgroundColor: isDarkMode ? '#09090b' : '#ffffff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center', position: 'relative' }}>
              <TouchableOpacity style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }} onPress={() => setSelectedTopper(null)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>

              <View style={{ width: 110, height: 110, borderRadius: 55, marginBottom: 16, borderWidth: 3, borderColor: '#06b6d4', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card, overflow: 'hidden' }}>
                {selectedTopper.student?.profileImage ? (
                  <Image source={{ uri: getImageUrl(selectedTopper.student.profileImage) }} style={{ width: 110, height: 110 }} resizeMode="cover" />
                ) : (
                  <Text style={{ color: colors.text, fontSize: 44, fontWeight: 'bold' }}>{(selectedTopper.student?.name || 'U').charAt(0).toUpperCase()}</Text>
                )}
              </View>

              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 4 }}>
                {selectedTopper.student?.name || 'Unknown Student'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: 'rgba(6,182,212,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                <Feather name="users" size={14} color="#06b6d4" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#06b6d4' }}>
                  {selectedTopper.student?.classGroup || selectedTopper.student?.department || 'General Class'}
                </Text>
              </View>

              {selectedTopper.student?.email && (
                <Text style={{ fontSize: 13, color: colors.subText, marginTop: 12 }}>
                  {selectedTopper.student.email}
                </Text>
              )}

              <View style={{ width: '100%', marginTop: 22, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.subText }}>Achievement</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fbbf24' }}>🏆 Exam Topper</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.subText }}>Exam Title</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{selectedTopper.examTitle}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.subText }}>Score</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#00e676' }}>{selectedTopper.score?.toFixed(1)}%</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={{ width: '100%', backgroundColor: 'rgba(6,182,212,0.15)', borderWidth: 1, borderColor: '#06b6d4', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 22 }}
                onPress={() => setSelectedTopper(null)}
              >
                <Text style={{ color: '#06b6d4', fontSize: 16, fontWeight: '700' }}>Close Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* ── Stat Filtered Exams Modal ── */}
      <Modal
        visible={statModalConfig.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStatModalConfig({ ...statModalConfig, visible: false })}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border || 'rgba(148,163,184,0.2)', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 24, paddingBottom: 16 }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: 20, fontWeight: '800' }]}>{statModalConfig.title}</Text>
              <Text style={{ color: colors.subText, fontSize: 12, marginTop: 2, fontWeight: '500' }}>
                {getFilteredStatExams().length} exam{getFilteredStatExams().length !== 1 ? 's' : ''} found
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setStatModalConfig({ ...statModalConfig, visible: false })} 
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(148,163,184,0.15)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="x" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={getFilteredStatExams()}
            keyExtractor={(item, index) => item._id || item.resultId || index.toString()}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(148,163,184,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <Feather name="file-text" size={32} color={colors.subText} style={{ opacity: 0.6 }} />
                </View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
                  No exams found
                </Text>
                <Text style={{ color: colors.subText, fontSize: 13, textAlign: 'center', fontWeight: '500', paddingHorizontal: 20 }}>
                  You don&apos;t have any exams matching {statModalConfig.title.toLowerCase()} yet.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const examTitle = item.examId?.title || item.examTitle || item.title || 'Exam';
              const examSubject = item.examId?.subject || item.subject || 'General Subject';
              const dateStr = new Date(item.submittedAt || item.createdAt || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const percentage = item.percentage !== undefined ? `${item.percentage.toFixed(1)}%` : 'Pending';
              const isPub = item.isPublished;
              const isPass = item.isPassed;
              
              let badgeColor = '#64748b';
              let badgeText = 'PENDING';
              let badgeBg = 'rgba(100,116,139,0.15)';
              let accentColor = '#64748b';
              if (isPub) {
                if (isPass) {
                  badgeColor = '#10b981';
                  badgeText = 'PASSED';
                  badgeBg = 'rgba(16,185,129,0.15)';
                  accentColor = '#10b981';
                } else {
                  badgeColor = '#ef4444';
                  badgeText = 'FAILED';
                  badgeBg = 'rgba(239,68,68,0.15)';
                  accentColor = '#ef4444';
                }
              } else {
                badgeColor = '#fb923c';
                badgeText = 'PENDING EVALUATION';
                badgeBg = 'rgba(251,146,60,0.15)';
                accentColor = '#fb923c';
              }

              return (
                <View style={{ 
                  backgroundColor: colors.card, 
                  padding: 18, 
                  borderRadius: 18, 
                  marginBottom: 14, 
                  borderWidth: 1, 
                  borderColor: colors.cardBorder || 'rgba(255,255,255,0.08)',
                  borderLeftWidth: 5,
                  borderLeftColor: accentColor,
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                  <View style={{ backgroundColor: badgeBg, width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: `${accentColor}40` }}>
                    <Feather name={isPub ? (isPass ? "check-circle" : "x-circle") : "clock"} size={22} color={badgeColor} />
                  </View>

                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6, letterSpacing: 0.3 }} numberOfLines={1}>
                      {examTitle}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Feather name="book-open" size={13} color={colors.subText} style={{ marginRight: 5 }} />
                      <Text style={{ color: colors.subText, fontSize: 13, fontWeight: '600' }}>
                        {examSubject}
                      </Text>
                      <Text style={{ color: colors.subText, fontSize: 13, marginHorizontal: 8 }}>•</Text>
                      <Feather name="calendar" size={13} color={colors.subText} style={{ marginRight: 5 }} />
                      <Text style={{ color: colors.subText, fontSize: 13, fontWeight: '500' }}>
                        {dateStr}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ backgroundColor: badgeBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: `${accentColor}40` }}>
                        <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>{badgeText}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.border || 'rgba(148,163,184,0.2)' }}>
                    {isPub ? (
                      <>
                        <Text style={{ color: isPass ? '#10b981' : '#ef4444', fontSize: 22, fontWeight: '900' }}>{percentage}</Text>
                        <Text style={{ color: colors.subText, fontSize: 12, fontWeight: '600', marginTop: 3 }}>
                          {item.score !== undefined ? `${item.score}/${item.totalMarks || item.examId?.totalMarks || '-'}` : 'Score'}
                        </Text>
                      </>
                    ) : (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: '#fb923c', fontSize: 15, fontWeight: '800' }}>Pending</Text>
                        <Text style={{ color: colors.subText, fontSize: 11, marginTop: 2, fontWeight: '500' }}>Evaluation</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      </Modal>

    </View>
  );
}

const getStyles = (colors) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: 0, paddingHorizontal: 16, paddingBottom: 32 },

  /* header */
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  menuBtn: { marginRight: 12 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: colors.text, flex: 1, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginLeft: 10, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  dotBadge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#fb7185', borderWidth: 1, borderColor: colors.bg },
  badgeTextDot: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ff3d00', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, minWidth: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.bg },
  badgeText: { color: colors.text, fontSize: 10, fontWeight: '800' },

  /* banner */
  banner: {
    backgroundColor: colors.card, borderRadius: 20, padding: 22,
    flexDirection: 'row', alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  bannerWelcome: { color: '#00f2fe', fontSize: 13, fontWeight: '700', marginBottom: 4, textShadowColor: 'rgba(0, 242, 254, 0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 4 },
  bannerName: { color: colors.text, fontSize: 26, fontWeight: '900', marginBottom: 6 },
  bannerSub: { color: colors.subText, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  bannerGraphic: { marginLeft: 10 },
  monitorOuter: { width: 90, height: 80, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  monitorInner: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,242,254,0.3)', borderRadius: 8, padding: 4,
  },

  /* stat grid (scrollable) */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  statCard: {
    backgroundColor: colors.card, borderRadius: 20,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden',
  },
  statCardTopStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  statIconBox: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: 'rgba(176, 38, 255, 0.15)', borderColor: 'rgba(176, 38, 255, 0.4)', borderWidth: 1 },
  statLabel: { color: colors.subText, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },

  /* card common */
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  cardTitleLg: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  cardSubtitle: { color: colors.subText, fontSize: 11, marginTop: 2 },

  filterPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(6,182,212,0.2)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  filterPillActive: { backgroundColor: '#4f46e5' },
  filterPillText: { color: colors.subText, fontSize: 10 },
  filterPillTextActive: { color: colors.text },

  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { color: colors.subText, fontSize: 11 },

  /* pass/fail distribution */
  passFailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passFailDonut: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  passFailDonutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  passFailDonutValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  passFailDonutLabel: { color: colors.subText, fontSize: 10 },
  passFailLegend: { flex: 1, marginLeft: 8 },
  passFailLegendItem: { flexDirection: 'row', alignItems: 'center' },
  passFailLegendCount: { color: colors.subText, fontSize: 12, marginLeft: 14, marginTop: 2 },
  passRateCard: {
    backgroundColor: colors.bg, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, width: 80,
  },
  passRateLabel: { color: colors.subText, fontSize: 11, marginTop: 6 },
  passRateValue: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 4 },

  /* recent exams */
  viewAll: { color: '#06b6d4', fontSize: 12, fontWeight: '600' },
  recentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, gap: 6 },
  examIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(6,182,212,0.15)', justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  recentTitle: { color: colors.text, fontSize: 12, fontWeight: '600' },
  recentSub: { color: colors.subText, fontSize: 10, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, alignItems: 'flex-end' },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusScore: { fontSize: 9, marginTop: 2 },

  /* full card */
  fullCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  leaderboardBtn: {
    backgroundColor: 'rgba(6,182,212,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#4f46e5',
  },
  leaderboardBtnText: { color: '#818cf8', fontSize: 12, fontWeight: '600' },
  leaderCard: {
    backgroundColor: colors.bg, borderRadius: 14, padding: 14,
    marginRight: 10, alignItems: 'center', minWidth: 90, borderWidth: 1, borderColor: colors.border,
  },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  rankText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  leaderName: { color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 4, textAlign: 'center', maxWidth: 80 },
  leaderScore: { color: '#00e676', fontSize: 14, fontWeight: '800' },
  emptyLeader: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { color: colors.subText, fontSize: 13, textAlign: 'center' },

  /* sidebar */
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row' },
  sidebar: {
    width: 260, backgroundColor: colors.card, height: '100%',
    padding: 24, paddingTop: 64, position: 'absolute', right: 0, top: 0, bottom: 0,
  },
  sidebarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  sidebarTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sidebarItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sidebarItemText: { color: colors.text, fontSize: 16, fontWeight: '500' },
  modalContainer: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalCloseBtn: { padding: 4 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  likeBtnActive: { backgroundColor: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.4)' },
  likeText: { fontSize: 13, fontWeight: '700', color: colors.subText },
});
