import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, RefreshControl, FlatList, StatusBar, Image, Animated , Platform} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { PieChart } from 'react-native-chart-kit';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTeacherExams } from '../../redux/slices/examSlice';
import { getToppers, likeTopper } from '../../redux/slices/resultSlice';
import Skeleton from '../../components/Skeleton';
import BouncyTouchable from '../../components/BouncyTouchable';
import api from '../../services/api';
import { playTeacherRefreshSound, playLikeSound } from '../../utils/SoundManager';

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

const { width } = Dimensions.get('window');

// Mini sparkline wave component
const WaveLine = ({ color }) => (
  <Svg width={60} height={16} viewBox="0 0 60 16">
    <Path
      d="M0 10 Q5 4 10 8 Q15 12 20 6 Q25 2 30 8 Q35 14 40 6 Q45 0 50 8 Q55 14 60 6"
      stroke={color}
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
);

const AnimatedLikeButton = ({ item, handleLike, styles, colors, extraStyle }) => {
  const scale = useRef(new Animated.Value(1)).current;
  
  const onPress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
    handleLike(item.resultId);
  };

  return (
    <BouncyTouchable 
      style={[styles.likeBtn, item.likedByMe && styles.likeBtnActive, { marginTop: 6, paddingVertical: 4, paddingHorizontal: 10, width: 'auto', borderColor: item.likedByMe ? 'rgba(236,72,153,0.4)' : colors.border, backgroundColor: item.likedByMe ? 'rgba(236,72,153,0.15)' : (colors.bg === '#f8fafc' ? '#f1f5f9' : '#0f172a') }]} 
      onPress={onPress}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Feather name="heart" size={12} color={item.likedByMe ? "#ec4899" : "#94a3b8"} />
      </Animated.View>
      <Text style={[styles.likeText, { color: item.likedByMe ? '#ec4899' : colors.subText }]}>
        {item.likes?.length || 0}
      </Text>
    </BouncyTouchable>
  );
};

export default function DashboardScreen() {
  const player = useVideoPlayer(require('../../../assets/Teacher side video.mp4'), player => {
    player.loop = true;
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
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const { user } = useSelector(state => state.auth);
  const { exams, isLoading: examsLoading } = useSelector(state => state.exams);

  React.useEffect(() => {
    if (!examsLoading && player) {
      player.play();
    }
  }, [examsLoading, player]);
  const { toppers } = useSelector(state => state.results || { toppers: [] });
  const [showAllToppers, setShowAllToppers] = useState(false);
  const [selectedTopper, setSelectedTopper] = useState(null);
  const [statusFilter, setStatusFilter] = useState('This Month');
  const [ratioFilter, setRatioFilter] = useState('This Month');
  const { unreadCount } = useSelector(state => state.notifications);
  const { hasUnreadMessages, contacts } = useSelector(state => state.chat);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });

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

  // On mount, trigger entrance animation
  useFocusEffect(
    useCallback(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true })
      ]).start();
      
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(floatAnim, { toValue: -8, duration: 2000, useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
          ]),
          Animated.sequence([
            Animated.timing(breatheAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
            Animated.timing(breatheAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
          ]),
          Animated.timing(spinAnim, {
            toValue: 1,
            duration: 15000, // Very slow spin
            useNativeDriver: true
          })
        ])
      ).start();
      
      return () => { fadeAnim.setValue(0); slideAnim.setValue(20); floatAnim.setValue(0); pulseAnim.setValue(1); breatheAnim.setValue(1); spinAnim.setValue(0); };
    }, [])
  );

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const cycleFilter = (current, setFilter) => {
    if (current === 'This Month') setFilter('Last 3 Months');
    else if (current === 'Last 3 Months') setFilter('All Time');
    else setFilter('This Month');
  };

  const unreadUsersCount = (contacts || []).filter(c => c.unreadCount && c.unreadCount > 0).length;

  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(() => {
    dispatch(getTeacherExams());
    dispatch(getToppers());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    playTeacherRefreshSound();
    setRefreshing(true);
    await dispatch(getTeacherExams());
    await dispatch(getToppers());
    setRefreshing(false);
  }, [dispatch]);

  const handleLike = (resultId) => {
    playLikeSound();
    dispatch({ type: 'results/likeTopperOptimistic', payload: { resultId, userId: user._id || user.id } });
    dispatch(likeTopper(resultId));
  };

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    border: isDarkMode ? '#334155' : '#e2e8f0',
  };

  const totalExams = exams?.length || 0;
  const published = exams?.filter(e => e.status === 'published')?.length || 0;
  const ongoing = exams?.filter(e => e.status === 'ongoing')?.length || 0;
  const completed = exams?.filter(e => e.status === 'completed')?.length || 0;

  const passed = exams?.reduce((sum, exam) => sum + (exam.totalPassed || 0), 0) || 0;
  const failed = exams?.reduce((sum, exam) => sum + (exam.totalFailed || 0), 0) || 0;
  const totalPie2 = passed + failed;
  const passRate = totalPie2 > 0 ? Math.round((passed / totalPie2) * 100) : 0;

  const chartConfig = {
    backgroundGradientFrom: 'transparent',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: 'transparent',
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: () => colors.subText,
  };

  // Status Distribution Pie
  const totalPie1 = published + ongoing + completed;
  const pieData1 = totalPie1 > 0 ? [
    { name: 'Published', count: published, color: '#00f2fe', legendFontColor: colors.subText, legendFontSize: 12 },
    { name: 'Ongoing', count: ongoing, color: '#fe0979', legendFontColor: colors.subText, legendFontSize: 12 },
    { name: 'Completed', count: completed, color: '#7b2ff7', legendFontColor: colors.subText, legendFontSize: 12 },
  ] : [];

  // Pass/Fail Pie
  const pieData2 = totalPie2 > 0 ? [
    { name: 'Passed', count: passed, color: '#00ff87', legendFontColor: colors.subText, legendFontSize: 12 },
    { name: 'Failed', count: failed, color: '#ff0f7b', legendFontColor: colors.subText, legendFontSize: 12 },
  ] : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={false} backgroundColor={colors.bg} />
      <Animated.ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max((insets.top || 20) - 15, 5) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
            >
              <Animated.View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5, borderWidth: 2, borderColor: '#fff', transform: [{ scale: breatheAnim }] }}>
                {user?.profileImage ? (
                  <Image source={{ uri: getImageUrl(user.profileImage) }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{user?.name?.charAt(0).toUpperCase() || 'T'}</Text>
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
          </View>
        </View>

        {/* Welcome Banner */}
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={isDarkMode ? ['#1a1060', '#0d1b4b'] : ['#6366f1', '#4f46e5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.banner, { borderWidth: 0 }]}
          >
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerWelcome, { color: '#e0e7ff' }]}>Welcome back,</Text>
              <Text style={[styles.bannerTitle, { color: '#ffffff' }]}>
                Teacher {user?.name?.split(' ')[0]}! <Animated.Text style={{ transform: [{ scale: breatheAnim }] }}>🎓</Animated.Text>
              </Text>
              <Text style={[styles.bannerSubtitle, { color: '#c4b5fd' }]}>Here's your teaching statistics and{'\n'}exam performance at a glance.</Text>
            </View>
                         {/* Attractive Banner Illustration */}
              <Animated.View style={[styles.bannerIllustration, { position: 'absolute', right: -5, bottom: 5, width: 150, height: 120, opacity: 1, transform: [{ translateY: floatAnim }] }]}>
                <View style={{ width: 140, height: 95, borderRadius: 16, backgroundColor: '#000', transform: [{ rotate: '-6deg' }], shadowColor: '#ec4899', shadowOffset: {width:0, height:8}, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
                  <VideoView
                    player={player}
                    style={{ width: '100%', height: '100%', borderRadius: 14 }}
                    contentFit="cover"
                    nativeControls={false}
                  />
                  <Animated.View style={{ position: 'absolute', top: -12, right: -12, backgroundColor: 'rgba(236,72,153,1)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', transform: [{ scale: pulseAnim }], shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 }}>
                    <Feather name="star" size={16} color="#fff" />
                  </Animated.View>
                </View>
              </Animated.View>   
          </LinearGradient>
        </View>

        {/* Stat Cards Row - Scrollable */}
        {(examsLoading || refreshing) ? (
          <View style={{ paddingHorizontal: 0 }}>
            {/* Stat Cards Skeleton */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -15 }} contentContainerStyle={{ paddingHorizontal: 15, gap: 12, marginBottom: 20 }}>
               {[1, 2, 3, 4].map((w, i) => (
                 <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, width: 130, height: 85, alignItems: 'center' }]}>
                   <View style={[styles.statCardTopStripe, { backgroundColor: colors.border }]} />
                   <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
                     <Skeleton width={32} height={32} borderRadius={10} style={{ marginBottom: 4 }} />
                     <Skeleton width={30} height={20} borderRadius={6} style={{ marginBottom: 4 }} />
                   </View>
                   <Skeleton width={60} height={10} borderRadius={5} />
                 </View>
               ))}
            </ScrollView>
            
            <View style={{ paddingHorizontal: 20 }}>
              {/* Pie Chart Skeleton 1 */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
                 <View style={styles.sectionHeader}>
                   <Skeleton width={130} height={18} borderRadius={9} />
                   <Skeleton width={70} height={26} borderRadius={13} />
                 </View>
                 <View style={styles.chartRow}>
                   <View style={styles.pieChartWrapper}>
                     <Skeleton width={180} height={180} borderRadius={90} />
                     <View style={[styles.pieCenterLabel, { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.card }]} />
                   </View>
                   <View style={styles.legendContainerSide}>
                      {[1,2,3].map(i => (
                        <View key={i} style={styles.legendItem}>
                          <View style={styles.legendLeft}>
                            <Skeleton width={8} height={8} borderRadius={4} style={{ marginRight: 8 }} />
                            <Skeleton width={60} height={13} borderRadius={6} />
                          </View>
                          <Skeleton width={20} height={14} borderRadius={7} />
                        </View>
                      ))}
                   </View>
                 </View>
              </View>

              {/* Pie Chart Skeleton 2 */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
                 <View style={styles.sectionHeader}>
                   <Skeleton width={110} height={18} borderRadius={9} />
                   <Skeleton width={70} height={26} borderRadius={13} />
                 </View>
                 <View style={styles.chartRow}>
                   <View style={styles.pieChartWrapperSmall}>
                     <Skeleton width={140} height={140} borderRadius={70} />
                     <View style={[styles.pieCenterLabel, { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.card }]} />
                   </View>
                   <View style={styles.passFailLegend}>
                     {[1,2].map(i => (
                       <View key={i} style={[styles.passFailRow, i===1 && { borderBottomColor: colors.border }]}>
                         <Skeleton width={50} height={15} borderRadius={7} />
                         <Skeleton width={30} height={18} borderRadius={9} />
                       </View>
                     ))}
                   </View>
                 </View>
              </View>

              {/* Recent Activity Skeleton */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
                 <Skeleton width={120} height={18} borderRadius={9} style={{ marginBottom: 15 }} />
                 {[1,2,3].map(i => (
                   <View key={i} style={[styles.recentItem, { borderBottomColor: colors.border, borderBottomWidth: i===3 ? 0 : 1 }]}>
                      <View style={styles.recentInfo}>
                        <Skeleton width="60%" height={15} borderRadius={7} style={{ marginBottom: 8 }} />
                        <Skeleton width="40%" height={12} borderRadius={6} />
                      </View>
                      <Skeleton width={70} height={26} borderRadius={13} />
                   </View>
                 ))}
              </View>

              {/* Exam Toppers Skeleton */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: 25 }]}>
                 <View style={styles.sectionHeader}>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <Skeleton width={20} height={20} borderRadius={10} style={{ marginRight: 8 }} />
                     <View>
                       <Skeleton width={100} height={16} borderRadius={8} style={{ marginBottom: 6 }} />
                       <Skeleton width={140} height={12} borderRadius={6} />
                     </View>
                   </View>
                   <Skeleton width={60} height={16} borderRadius={8} />
                 </View>
                 
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                   {[1,2].map(i => (
                     <View key={i} style={[styles.leaderCard, { width: 250, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, marginRight: 15 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Skeleton width="80%" height={15} borderRadius={7} style={{ marginBottom: 6 }} />
                            <Skeleton width="60%" height={13} borderRadius={6} />
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Skeleton width={40} height={18} borderRadius={9} style={{ marginBottom: 6 }} />
                          <Skeleton width={30} height={30} borderRadius={15} />
                        </View>
                     </View>
                   ))}
                 </ScrollView>
              </View>
            </View>
          </View>
        ) : (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -15 }} contentContainerStyle={{ paddingHorizontal: 15, gap: 12, marginBottom: 20 }}>
          {/* Total Exams */}
          <BouncyTouchable activeScale={0.9} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, width: 130, alignItems: 'center' }]} onPress={() => navigation.navigate('ManageExams')}>  
            <View style={[styles.statCardTopStripe, { backgroundColor: '#6366f1' }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4, width: '100%' }}>
              <Animated.View style={[styles.iconWrapper, { backgroundColor: 'rgba(99,102,241,0.15)', transform: [{ scale: breatheAnim }] }]}>
                <Feather name="file-text" size={16} color="#6366f1" />
              </Animated.View>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{totalExams}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.subText, textAlign: 'center' }]} numberOfLines={1}>Total Exams</Text>
          </BouncyTouchable>

          <BouncyTouchable activeScale={0.9} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, width: 130, alignItems: 'center' }]} onPress={() => navigation.navigate('ManageExams')}>  
            <View style={[styles.statCardTopStripe, { backgroundColor: '#10b981' }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4, width: '100%' }}>
              <Animated.View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)', transform: [{ translateY: floatAnim }] }]}>
                <Feather name="check-circle" size={16} color="#10b981" />
              </Animated.View>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{published}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.subText, textAlign: 'center' }]} numberOfLines={1}>Published</Text>
          </BouncyTouchable>

          <BouncyTouchable activeScale={0.9} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, width: 130, alignItems: 'center' }]} onPress={() => navigation.navigate('ManageExams')}>  
            <View style={[styles.statCardTopStripe, { backgroundColor: '#f59e0b' }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4, width: '100%' }}>
              <Animated.View style={[styles.iconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.15)', transform: [{ scale: breatheAnim }] }]}>
                <Feather name="clock" size={16} color="#f59e0b" />
              </Animated.View>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{ongoing}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.subText, textAlign: 'center' }]} numberOfLines={1}>Ongoing</Text>
          </BouncyTouchable>

          <BouncyTouchable activeScale={0.9} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, width: 130, alignItems: 'center' }]} onPress={() => navigation.navigate('ManageExams')}>  
            <View style={[styles.statCardTopStripe, { backgroundColor: '#3b82f6' }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4, width: '100%' }}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Feather name="check-square" size={16} color="#3b82f6" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{completed}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.subText, textAlign: 'center' }]} numberOfLines={1}>Completed</Text>
          </BouncyTouchable>
        </ScrollView>

        {/* Status Distribution Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Status Distribution</Text>
            <BouncyTouchable 
              style={[styles.dropdownBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => cycleFilter(statusFilter, setStatusFilter)}
              activeScale={0.9}
            >
              <Text style={[styles.dropdownText, { color: colors.text }]}>{statusFilter}</Text>
              <Feather name="chevron-down" size={14} color={colors.subText} />
            </BouncyTouchable>
          </View>

          <View style={styles.chartRow}>
            <View style={styles.pieChartWrapper}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <PieChart
                  data={pieData1}
                  width={140}
                  height={140}
                  chartConfig={chartConfig}
                  accessor={"count"}
                  backgroundColor={"transparent"}
                  paddingLeft={"32"}
                  hasLegend={false}
                  absolute
                />
              </Animated.View>
              <Animated.View style={[styles.pieCenterLabel, { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.card, transform: [{ scale: breatheAnim }] }]}>
                <Text style={[styles.pieCenterTitle, { color: colors.subText, fontSize: 11 }]}>Total</Text>
                <Text style={[styles.pieCenterValue, { color: colors.text, fontSize: 18 }]}>{totalPie1}</Text>
              </Animated.View>
            </View>

            <View style={styles.legendContainerSide}>
              <View style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: '#00f2fe', shadowColor: '#00f2fe', shadowOpacity: 0.8, shadowRadius: 5, elevation: 3 }]} />
                  <Text style={[styles.legendText, { color: colors.subText }]}>Published</Text>
                </View>
                <Text style={[styles.legendCount, { color: colors.subText }]}>{published}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: '#fe0979', shadowColor: '#fe0979', shadowOpacity: 0.8, shadowRadius: 5, elevation: 3 }]} />
                  <Text style={[styles.legendText, { color: colors.subText }]}>Ongoing</Text>
                </View>
                <Text style={[styles.legendCount, { color: colors.subText }]}>{ongoing}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: '#7b2ff7', shadowColor: '#7b2ff7', shadowOpacity: 0.8, shadowRadius: 5, elevation: 3 }]} />
                  <Text style={[styles.legendText, { color: colors.subText }]}>Completed</Text>
                </View>
                <Text style={[styles.legendCount, { color: colors.subText }]}>{completed}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pass/Fail Ratio Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pass/Fail Ratio</Text>
            <TouchableOpacity 
              style={[styles.dropdownBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => cycleFilter(ratioFilter, setRatioFilter)}
            >
              <Text style={[styles.dropdownText, { color: colors.text }]}>{ratioFilter}</Text>
              <Feather name="chevron-down" size={14} color={colors.subText} />
            </TouchableOpacity>
          </View>

          <View style={styles.chartRow}>
            <View style={styles.pieChartWrapperSmall}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <PieChart
                  data={pieData2}
                  width={130}
                  height={130}
                  chartConfig={chartConfig}
                  accessor={"count"}
                  backgroundColor={"transparent"}
                  paddingLeft={"30"}
                  hasLegend={false}
                  absolute
                />
              </Animated.View>
              <Animated.View style={[styles.pieCenterLabel, { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.card, transform: [{ scale: breatheAnim }] }]}>
                <Text style={[styles.pieCenterPassRate, { color: colors.text, fontSize: 16 }]}>{passRate}%</Text>
                <Text style={[styles.pieCenterPassLabel, { color: colors.subText, fontSize: 10 }]}>Pass Rate</Text>
              </Animated.View>
              {/* Star badge at bottom of chart */}
              <Animated.View style={[styles.starBadge, { transform: [{ scale: breatheAnim }] }]}>
                <Feather name="star" size={14} color="white" />
              </Animated.View>
            </View>

            <View style={styles.passFailLegend}>
              <View style={[styles.passFailRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: '#00ff87', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,255,135,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 6 }}>Passed</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{passed}</Text>
              </View>
              <View style={styles.passFailRow}>
                <Text style={{ color: '#ff0f7b', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(255,15,123,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 6 }}>Failed</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{failed}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Activity Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 15 }]}>Recent Activity</Text>
          {exams?.length > 0 ? exams.slice(0, 3).map(exam => (
            <View key={exam._id} style={[styles.recentItem, { borderBottomColor: colors.border }]}>
              <View style={styles.recentInfo}>
                <Text style={[styles.recentTitle, { color: colors.text }]}>{exam.title}</Text>
                <Text style={[styles.recentSubtitle, { color: colors.subText }]}>{exam.subject} • {new Date(exam.date).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.badge, 
                exam.status === 'published' ? styles.badgeInfo :
                exam.status === 'ongoing' ? styles.badgeWarn :
                exam.status === 'completed' && !exam.isResultPublished ? { backgroundColor: 'rgba(255,184,0,0.15)', borderColor: 'rgba(255,184,0,0.4)', borderWidth: 1 } :
                exam.status === 'completed' ? styles.badgeSuccess :
                styles.badgeSec
              ]}>
                <Text style={[styles.badgeText, 
                  exam.status === 'published' ? styles.badgeTextInfo :
                  exam.status === 'ongoing' ? styles.badgeTextWarn :
                  exam.status === 'completed' && !exam.isResultPublished ? { color: '#ffb800', fontSize: 11, fontWeight: '800', textShadowColor: 'rgba(255,184,0,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 4 } :
                  exam.status === 'completed' ? styles.badgeTextSuccess :
                  styles.badgeTextSec
                ]}>{exam.status === 'completed' && !exam.isResultPublished ? 'Publish Pending' : exam.status}</Text>
              </View>
            </View>
          )) : (
            <View style={styles.recentEmptyRow}>
              <View style={styles.recentEmptyLeft}>
                <View style={[styles.recentEmptyIcon, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : '#f1f5f9' }]}>
                  <Feather name="file-text" size={24} color="#8b5cf6" />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>No recent activity yet</Text>
                  <Text style={{ color: colors.subText, fontSize: 12, lineHeight: 17 }}>Once you start creating exams,{'\n'}your activity will appear here.</Text>
                </View>
              </View>
              <View style={styles.recentEmptyGraphic}>
                <View style={[styles.clipboardIcon, { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.15)' : '#f3e8ff' }]}>
                  <Feather name="clipboard" size={28} color="#a78bfa" />
                </View>
                <View style={[styles.searchBadge, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.2)' : '#e0e7ff' }]}>
                  <Feather name="search" size={16} color="#818cf8" />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Exam Toppers ── */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>🏆</Text>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Exam Toppers</Text>
                <Text style={{ fontSize: 12, color: colors.subText }}>Top performers in recent exams</Text>
              </View>
            </View>
            {toppers && toppers.length > 0 && (
              <BouncyTouchable onPress={() => setShowAllToppers(true)} style={{ flexDirection: 'row', alignItems: 'center' }} activeScale={0.9}>
                <Text style={[styles.viewAllText, { color: '#6366f1' }]}>See All</Text>
                <Feather name="chevron-right" size={16} color="#6366f1" />
              </BouncyTouchable>
            )}
          </View>

          {/* carousel style – horizontal scroll */}
          {toppers && toppers.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {toppers.slice(0, 2).map((item, idx) => (
                <View key={item.resultId || idx} style={[styles.leaderCard, { width: 250, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <BouncyTouchable 
                      onPress={() => setSelectedTopper(item)} 
                      style={{ position: 'relative', marginRight: 12 }}
                      activeScale={0.85}
                    >
                      {item.student?.profileImage ? (
                        <Image source={{ uri: getImageUrl(item.student.profileImage) }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: idx === 0 ? '#ffdf00' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ff7e67' : '#334155' }} />
                      ) : (
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: idx === 0 ? '#ffdf00' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ff7e67' : '#334155', justifyContent: 'center', alignItems: 'center', shadowColor: idx === 0 ? '#ffdf00' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ff7e67' : 'transparent', shadowOpacity: 0.6, shadowRadius: 6, elevation: 4 }}>
                          <Text style={{ color: idx > 2 ? '#fff' : '#0f172a', fontSize: 18, fontWeight: 'bold' }}>{(item.student?.name || 'U').charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: idx === 0 ? '#ffdf00' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ff7e67' : '#334155', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#0f172a', shadowColor: idx === 0 ? '#ffdf00' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ff7e67' : 'transparent', shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 }}>
                        <Text style={{ color: idx > 2 ? '#fff' : '#0f172a', fontSize: 10, fontWeight: '900' }}>{idx + 1}</Text>
                      </View>
                    </BouncyTouchable>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.leaderName, { textAlign: 'left', marginBottom: 2, color: colors.text }]} numberOfLines={1}>{item.student?.name || 'Unknown'}</Text>
                      <Text style={[styles.recentSub, { textAlign: 'left', color: colors.subText }]} numberOfLines={1}>{item.examTitle}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.leaderScore, { color: colors.text }]}>{item.score?.toFixed(1)}%</Text>
                    <AnimatedLikeButton 
                      item={item} 
                      handleLike={handleLike} 
                      styles={styles} 
                      colors={colors}
                      extraStyle={{ marginTop: 6, paddingVertical: 4, paddingHorizontal: 10, width: 'auto', backgroundColor: colors.card, borderColor: colors.border }}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyLeader}>
              <Feather name="award" size={24} color="#475569" />
              <Text style={[styles.emptyText, { marginTop: 8 }]}>No toppers available yet.</Text>
            </View>
          )}
        </View>
        </View>
        )}

      </Animated.ScrollView>

      {/* Sidebar Modal */}
      <Modal visible={isSidebarVisible} transparent animationType="fade">
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity style={styles.sidebarCloseArea} onPress={() => setSidebarVisible(false)} />
          <View style={[styles.sidebarContent, { backgroundColor: colors.card }]}>
            <View style={styles.sidebarHeader}>
              <Text style={[styles.sidebarTitle, { color: colors.text }]}>Menu</Text>
              <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { setSidebarVisible(false); navigation.navigate('Home'); }}>
              <Feather name="grid" size={20} color={colors.text} style={styles.sidebarIcon} />
              <Text style={[styles.sidebarItemText, { color: colors.text }]}>Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { setSidebarVisible(false); navigation.navigate('CreateExam'); }}>
              <Feather name="plus-circle" size={20} color={colors.text} style={styles.sidebarIcon} />
              <Text style={[styles.sidebarItemText, { color: colors.text }]}>Create Exam</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { setSidebarVisible(false); navigation.navigate('ManageExams'); }}>
              <Feather name="list" size={20} color={colors.text} style={styles.sidebarIcon} />
              <Text style={[styles.sidebarItemText, { color: colors.text }]}>Manage</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { setSidebarVisible(false); navigation.navigate('Profile'); }}>
              <Feather name="user" size={20} color={colors.text} style={styles.sidebarIcon} />
              <Text style={[styles.sidebarItemText, { color: colors.text }]}>Profile</Text>
            </TouchableOpacity>
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
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Math.max((insets.top || 20) - 15, 5) + 15, paddingBottom: 15 }]}>
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
              <View style={[styles.leaderCard, { width: '100%', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <BouncyTouchable 
                    onPress={() => {
                      setShowAllToppers(false);
                      setSelectedTopper(item);
                    }} 
                    style={{ position: 'relative', marginRight: 12 }}
                    activeScale={0.85}
                  >
                    {item.student?.profileImage ? (
                      <Image source={{ uri: getImageUrl(item.student.profileImage) }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#334155' }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#334155', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{(item.student?.name || 'U').charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#334155', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#0f172a' }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{index + 1}</Text>
                    </View>
                  </BouncyTouchable>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leaderName, { marginBottom: 2, textAlign: 'left', fontSize: 15, color: colors.text }]} numberOfLines={1}>{item.student?.name || 'Unknown'}</Text>
                    <Text style={[styles.recentSub, { textAlign: 'left', fontSize: 13, color: colors.subText }]}>{item.examTitle}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.leaderScore, { fontSize: 18 }]}>{item.score?.toFixed(1)}%</Text>
                  <AnimatedLikeButton 
                    item={item} 
                    handleLike={handleLike} 
                    styles={styles} 
                    colors={colors}
                    extraStyle={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, width: 'auto', backgroundColor: colors.card, borderColor: colors.border }}
                  />
                </View>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* ── Topper Student Profile Modal ── */}
      <Modal visible={!!selectedTopper} transparent animationType="fade" onRequestClose={() => setSelectedTopper(null)}>
        {selectedTopper && (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '90%', backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center', position: 'relative' }}>
              <TouchableOpacity style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }} onPress={() => setSelectedTopper(null)}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>

              <View style={{ width: 110, height: 110, borderRadius: 55, marginBottom: 16, borderWidth: 3, borderColor: '#6366f1', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card, overflow: 'hidden' }}>
                {selectedTopper.student?.profileImage ? (
                  <Image source={{ uri: getImageUrl(selectedTopper.student.profileImage) }} style={{ width: 110, height: 110 }} resizeMode="cover" />
                ) : (
                  <Text style={{ color: colors.text, fontSize: 44, fontWeight: 'bold' }}>{(selectedTopper.student?.name || 'U').charAt(0).toUpperCase()}</Text>
                )}
              </View>

              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
                {selectedTopper.student?.name || 'Unknown Student'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: 'rgba(139,92,246,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 }}>
                <Feather name="users" size={14} color="#a855f7" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#a855f7' }}>
                  {selectedTopper.student?.classGroup || selectedTopper.student?.department || 'General Class'}
                </Text>
              </View>

              {selectedTopper.student?.email && (
                <Text style={{ fontSize: 13, color: colors.subText, marginTop: 8 }}>
                  {selectedTopper.student.email}
                </Text>
              )}

              <View style={{ width: '100%', marginTop: 22, padding: 16, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
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
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#10b981' }}>{selectedTopper.score?.toFixed(1)}%</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={{ width: '100%', backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 22 }}
                onPress={() => setSelectedTopper(null)}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Close Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginLeft: 12, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  badgeDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#fff' },
  badgeTextDot: { position: 'absolute', top: 4, right: 2, backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, minWidth: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  content: { padding: 15, paddingBottom: 30 },
  
  // Sidebar
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  sidebarCloseArea: { flex: 1 },
  sidebarContent: { width: 250, height: '100%', padding: 20, paddingTop: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  sidebarTitle: { fontSize: 22, fontWeight: 'bold' },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  sidebarIcon: { marginRight: 15 },
  sidebarItemText: { fontSize: 16, fontWeight: '500' },

  // Banner
  bannerContainer: { marginBottom: 20 },
  banner: { 
    borderRadius: 20, padding: 24, flexDirection: 'row', justifyContent: 'space-between',
    borderWidth: 1, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 15, elevation: 8, overflow: 'hidden', minHeight: 150,
  },
  bannerTextContainer: { flex: 1, zIndex: 1 },
  bannerWelcome: { fontSize: 14, color: '#c4b5fd', marginBottom: 4, fontWeight: '500' },
  bannerTitle: { fontSize: 26, fontWeight: '800', color: 'white', marginBottom: 8 },
  bannerSubtitle: { fontSize: 13, lineHeight: 18, color: '#a78bfa' },
  bannerDecorations: { position: 'absolute', right: 10, top: 0, bottom: 0, width: 100 },
  bannerIconCircle: { position: 'absolute', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  // Stat Cards
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  statCard: { padding: 12, borderRadius: 14, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, overflow: 'hidden', justifyContent: 'center' },
  statCardTopStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  iconWrapper: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 24, fontWeight: '800' },

  // Section Card
  sectionCard: { borderRadius: 16, padding: 18, marginBottom: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  dropdownText: { fontSize: 12, fontWeight: '500' },

  // Chart layout
  chartRow: { flexDirection: 'row', alignItems: 'center' },
  pieChartWrapper: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  pieChartWrapperSmall: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pieCenterLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pieCenterTitle: { fontSize: 12 },
  pieCenterValue: { fontSize: 22, fontWeight: 'bold' },
  pieCenterPassRate: { fontSize: 20, fontWeight: '800' },
  pieCenterPassLabel: { fontSize: 11, fontWeight: '500' },

  // Star badge
  starBadge: { position: 'absolute', bottom: 5, left: '50%', marginLeft: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },

  // Side legend
  legendContainerSide: { flex: 1, marginLeft: 5 },
  legendItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  legendLeft: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendText: { fontSize: 13, fontWeight: '500' },
  legendCount: { fontSize: 14, fontWeight: 'bold' },

  // Pass/Fail legend
  passFailLegend: { flex: 1, marginLeft: 20 },
  passFailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },

  // Recent Activity
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  recentInfo: { flex: 1, marginRight: 10 },
  recentTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  recentSubtitle: { fontSize: 12, fontWeight: '500' },

  // Recent empty state
  recentEmptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  recentEmptyLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  recentEmptyIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  recentEmptyGraphic: { position: 'relative', width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  clipboardIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  searchBadge: { position: 'absolute', bottom: 5, right: 0, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  // Badges
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeInfo: { backgroundColor: 'rgba(0,242,254,0.15)', borderColor: 'rgba(0,242,254,0.4)', borderWidth: 1 },
  badgeTextInfo: { color: '#00f2fe', fontSize: 11, fontWeight: '800', textTransform: 'capitalize', textShadowColor: 'rgba(0,242,254,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 4 },
  badgeWarn: { backgroundColor: 'rgba(254,9,121,0.15)', borderColor: 'rgba(254,9,121,0.4)', borderWidth: 1 },
  badgeTextWarn: { color: '#fe0979', fontSize: 11, fontWeight: '800', textTransform: 'capitalize', textShadowColor: 'rgba(254,9,121,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 4 },
  badgeSuccess: { backgroundColor: 'rgba(0,255,135,0.15)', borderColor: 'rgba(0,255,135,0.4)', borderWidth: 1 },
  badgeTextSuccess: { color: '#00ff87', fontSize: 11, fontWeight: '800', textTransform: 'capitalize', textShadowColor: 'rgba(0,255,135,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 4 },
  badgeSec: { backgroundColor: 'rgba(148,163,184,0.1)' },
  badgeTextSec: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },

  // Toppers
  leaderCard: { borderRadius: 14, padding: 14, marginRight: 10, borderWidth: 1 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontWeight: '800', fontSize: 13 },
  leaderName: { fontSize: 12, fontWeight: '600' },
  recentSub: { fontSize: 11 },
  leaderScore: { color: '#00ff87', fontSize: 16, fontWeight: '900', textShadowColor: 'rgba(0,255,135,0.4)', textShadowOffset: {width:0, height:0}, textShadowRadius: 5 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 20, borderWidth: 1 },
  likeBtnActive: { backgroundColor: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.4)' },
  likeText: { fontSize: 13, fontWeight: '700' },
  emptyLeader: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  viewAll: { color: '#818cf8', fontSize: 13, fontWeight: '600' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalCloseBtn: { padding: 4 },
});
