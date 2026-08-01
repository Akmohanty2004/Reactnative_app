import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert, FlatList, Modal, TextInput, ActivityIndicator, StatusBar, RefreshControl, Image, Animated , Platform} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { getAdminDashboardStats } from '../../redux/slices/adminSlice';
import { getToppers, likeTopper } from '../../redux/slices/resultSlice';
import BouncyTouchable from '../../components/BouncyTouchable';
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

const { width } = Dimensions.get('window');

const AdminSkeleton = ({ isDarkMode }) => (
  <View style={{ paddingVertical: 10 }}>
    <View style={{ height: 160, backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0', borderRadius: 24, marginBottom: 20 }} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 }}>
      {[1, 2, 3, 4, 5, 6].map((idx) => (
        <View 
          key={idx} 
          style={{ width: '31%', height: 100, backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0', borderRadius: 16, marginBottom: 10 }} 
        />
      ))}
    </View>
    <View style={{ height: 220, backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0', borderRadius: 24, marginBottom: 20 }} />
  </View>
);

export default function DashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { stats, isLoading } = useSelector(state => state.admin);
  const { toppers } = useSelector(state => state.results);
  const { user } = useSelector(state => state.auth);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const [selectedPieItem, setSelectedPieItem] = useState(null);
  const [showAllToppers, setShowAllToppers] = useState(false);
  const [selectedTopper, setSelectedTopper] = useState(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isBroadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const breatheAnim = React.useRef(new Animated.Value(1)).current;
  const modalZoomAnim = React.useRef(new Animated.Value(0)).current;
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (selectedTopper) {
      modalZoomAnim.setValue(0.5);
      Animated.spring(modalZoomAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();
    }
  }, [selectedTopper]);

  useFocusEffect(
    useCallback(() => {
      dispatch(getAdminDashboardStats());
      dispatch(getToppers());
      
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
    }, [dispatch])
  );

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(getAdminDashboardStats()),
      dispatch(getToppers())
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleLike = (resultId) => {
    dispatch(likeTopper(resultId));
  };

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#0B0E14' : '#f8fafc',
    text: isDarkMode ? '#ffffff' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#141927' : '#ffffff',
    cardBorder: isDarkMode ? '#1e2a3a' : '#e2e8f0',
  };

  const statCards = [
    { label: 'Total Users',       value: stats?.totalUsers || 0,   icon: 'users',       color: '#3b82f6', route: 'Users' },
    { label: 'Total Exams',       value: stats?.totalExams || 0,   icon: 'file-text',   color: '#8b5cf6', route: 'Exams' },
    { label: 'Active Exams',      value: stats?.activeExams || 0,  icon: 'clock',       color: '#10b981', route: 'Exams' },
    { label: 'Results Published', value: stats?.totalResults || 0, icon: 'award',       color: '#f59e0b', route: 'Results' },
    { label: 'Passed',            value: stats?.totalPassed || 0,  icon: 'check-circle',color: '#10b981', route: 'Results' },
    { label: 'Failed',            value: stats?.totalFailed || 0,  icon: 'trending-up', color: '#ef4444', route: 'Results' },
  ];

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: colors.card,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: (opacity = 1) => colors.subText,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
  };

  let userDistributionData = [
    { name: 'Students', count: stats?.totalStudents || 0, color: '#8b5cf6', legendFontColor: colors.subText, legendFontSize: 12 },
    { name: 'Teachers', count: stats?.totalTeachers || 0, color: '#3b82f6', legendFontColor: colors.subText, legendFontSize: 12 },
  ];
  const hasData = userDistributionData.some(d => d.count > 0);
  if (!hasData) {
    userDistributionData = [];
  }

  const totalUsers = stats?.totalUsers || 0;

  const recentExams = stats?.recentExams || [];
  const recentResults = stats?.recentResults || [];
  const combinedActivities = [
    ...recentExams.map(ex => ({
      id: `ex-${ex._id}`,
      title: 'Exam Created',
      desc: ex.title || 'A new exam was added',
      time: new Date(ex.createdAt).toLocaleDateString(),
      timestamp: new Date(ex.createdAt).getTime(),
      icon: 'file-text',
      color: '#8b5cf6'
    })),
    ...recentResults.map(r => ({
      id: `res-${r._id}`,
      title: 'Result Published',
      desc: `${r.studentId?.name || 'A student'} completed an exam`,
      time: new Date(r.createdAt).toLocaleDateString(),
      timestamp: new Date(r.createdAt).getTime(),
      icon: 'check-circle',
      color: '#10b981'
    }))
  ];
  
  const activities = combinedActivities
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);

  if (activities.length === 0) {
    activities.push({ id: 1, title: 'No Recent Activity', desc: 'System is quiet', time: '--', icon: 'clock', color: '#64748b' });
  }

  const quickActions = [
    { label: 'Manage Users', icon: 'users',       color: '#3b82f6', route: 'Users'   },
    { label: 'Manage Exams', icon: 'file-text',   color: '#8b5cf6', route: 'Exams'   },
    { label: 'View Results', icon: 'bar-chart-2', color: '#10b981', route: 'Results' },
    { label: 'Reports',      icon: 'pie-chart',   color: '#f59e0b', route: 'Reports' },
  ];

  const displayedPieItem = selectedPieItem;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={true} backgroundColor="transparent" />

      <Animated.ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor="#8b5cf6" 
            colors={['#8b5cf6', '#3b82f6']} 
          />
        }
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Top Header */}
        <View style={[styles.topHeader, { paddingTop: Math.max((insets.top || 20) - 15, 5) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5, borderWidth: 2, borderColor: '#fff' }}
            >
              {user?.profileImage ? (
                <Image source={{ uri: getImageUrl(user.profileImage) }} style={{ width: 38, height: 38, borderRadius: 19 }} />
              ) : (
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{user?.name?.charAt(0).toUpperCase() || 'A'}</Text>
              )}
            </TouchableOpacity>
            <View>
              <Text style={[styles.topHeaderTitle, { color: colors.text }]}>Home</Text>
              <Text style={{ color: colors.subText, fontSize: 12, marginTop: 2 }}>Dashboard Overview</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>

            <TouchableOpacity 
              onPress={() => setBroadcastModalVisible(true)}
            >
              <Animated.View style={[styles.menuBtn, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : '#ffffff', borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginRight: 15, transform: [{ scale: breatheAnim }] }]}>
                <Feather name="message-square" size={20} color={colors.text} />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Animated.View style={[styles.crownAvatar, { transform: [{ scale: breatheAnim }] }]}>
                <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.crownAvatarGrad}>
                  <Text style={styles.crownEmoji}>👑</Text>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {(isLoading && !stats) || refreshing ? (
          <AdminSkeleton isDarkMode={isDarkMode} />
        ) : (
          <>
            {/* Welcome Banner */}
        <View style={styles.bannerOuter}>
          <LinearGradient
            colors={isDarkMode ? ['#1a1060', '#0d1b4b'] : ['#7c3aed', '#4f46e5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.bannerGrad}
          >
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: '#ffffff' }]}>
                <Text style={{ color: '#e0e7ff' }}>Welcome back,</Text>{'\n'}Admin! 👑
              </Text>
              <Text style={[styles.bannerSubtitle, { color: '#c4b5fd' }]}>Here's what's happening{'\n'}on your platform today.</Text>
            </View>
            {/* Dashboard illustration */}
            <Animated.View style={[styles.bannerIllustration, { transform: [{ translateY: floatAnim }] }]}>
              <View style={styles.illustrationScreen}>
                <LinearGradient colors={['#312e81','#1e1b4b']} style={styles.illustrationBg}>
                  {/* Mini chart bars */}
                  <View style={styles.miniChartRow}>
                    {[40,65,45,80,55,70].map((h,i) => (
                      <View key={i} style={[styles.miniBar, { height: h * 0.6, backgroundColor: i % 2 === 0 ? '#8b5cf6' : '#6366f1' }]} />
                    ))}
                  </View>
                  {/* Mini pie placeholder */}
                  <View style={styles.miniPieWrapper}>
                    <View style={[styles.miniPie, { borderColor: '#8b5cf6' }]} />
                    <View style={[styles.miniPieSlice, { borderColor: '#f59e0b' }]} />
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* Stats Grid - Scrollable */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2, gap: 12, marginBottom: 15 }}>
          {statCards.map((stat, i) => (
            <BouncyTouchable 
              key={i} 
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, width: 130 }]}
              onPress={() => stat.route && navigation.navigate(stat.route)}
              activeScale={stat.route ? 0.9 : 1}
            >
              <View style={[styles.statCardTopStripe, { backgroundColor: stat.color }]} />
              <View style={[styles.iconWrapper, { backgroundColor: stat.color + '22' }]}>
                <Feather name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={[styles.statLabel, { color: colors.subText }]} numberOfLines={1}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
            </BouncyTouchable>
          ))}
        </ScrollView>

        {/* Distribution + Activity Row */}
        <View style={styles.rowLayout}>

          {/* User Distribution */}
          <View style={[styles.card, styles.distributionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>User Distribution</Text>
              <TouchableOpacity onPress={() => setShowMoreOptions(true)} hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
                <Feather name="more-vertical" size={20} color={colors.subText} />
              </TouchableOpacity>
            </View>
            <View style={styles.pieChartWrapper}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <PieChart
                  data={userDistributionData}
                  width={150}
                  height={150}
                  chartConfig={chartConfig}
                  accessor={"count"}
                  backgroundColor={"transparent"}
                  paddingLeft={"30"}
                  hasLegend={false}
                  absolute
                />
              </Animated.View>
              {/* Center label: shows selected or default Total */}
              <Animated.View style={[styles.pieCenterLabel, { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.card, transform: [{ scale: breatheAnim }] }]} pointerEvents="none">
                <Text style={[styles.pieCenterTitle, { color: colors.subText }]}>
                  {displayedPieItem ? displayedPieItem.name.substring(0,8) : 'Total'}
                </Text>
                <Text style={[styles.pieCenterValue, { color: displayedPieItem ? displayedPieItem.color : colors.text }]}>
                  {displayedPieItem ? displayedPieItem.count : totalUsers}
                </Text>
              </Animated.View>
            </View>
            <View style={styles.legendContainer}>
              {userDistributionData.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.legendItem, selectedPieItem?.name === item.name && { backgroundColor: item.color + '18', paddingHorizontal: 4, borderRadius: 6 }]}
                  onPress={() => setSelectedPieItem(prev => prev?.name === item.name ? null : item)}
                >
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendText, { color: colors.subText, fontWeight: selectedPieItem?.name === item.name ? '700' : '400' }]}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={[styles.legendCount, { color: colors.subText, fontWeight: selectedPieItem?.name === item.name ? '700' : '400' }]}>
                    {`${item.count} (${Math.round((item.count / Math.max(1, totalUsers)) * 100)}%)`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={[styles.card, styles.activityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Activity</Text>
            {activities.map((act) => (
              <View key={act.id} style={styles.activityItem}>
                <View style={[styles.activityIconWrapper, { backgroundColor: act.color + '22' }]}>
                  <Feather name={act.icon} size={14} color={act.color} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>{act.title}</Text>
                  <Text style={[styles.activityDesc, { color: colors.subText }]} numberOfLines={1}>{act.desc}</Text>
                </View>
                <Text style={styles.activityTime}>{act.time}</Text>
              </View>
            ))}
            <BouncyTouchable style={[styles.viewAllBtn, { borderTopColor: colors.cardBorder }]} onPress={() => navigation.navigate('ActivityLogs')}>
              <Text style={[styles.viewAllText, { color: colors.subText }]}>View All Activity</Text>
              <Feather name="chevron-right" size={14} color={colors.subText} />
            </BouncyTouchable>
          </View>

        </View>

        {/* Exam Toppers */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 20 }]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>🏆</Text>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Exam Toppers</Text>
              </View>
            </View>
            {toppers && toppers.length > 0 && (
              <BouncyTouchable onPress={() => setShowAllToppers(true)}>
                <Text style={[styles.viewAll, { color: '#6366f1' }]}>View All</Text>
              </BouncyTouchable>
            )}
          </View>

          {toppers && toppers.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {toppers.slice(0, 5).map((item, idx) => (
                <View key={item.resultId || idx} style={[styles.leaderCard, { width: 260, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <BouncyTouchable 
                      onPress={() => setSelectedTopper(item)} 
                      style={{ position: 'relative', marginRight: 12 }}
                      activeScale={0.85}
                    >
                      {item.student?.profileImage ? (
                        <Image source={{ uri: getImageUrl(item.student.profileImage) }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#334155' }} />
                      ) : (
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#334155', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{(item.student?.name || 'U').charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#334155', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#0f172a' }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{idx + 1}</Text>
                      </View>
                    </BouncyTouchable>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.leaderName, { color: colors.text, textAlign: 'left', marginBottom: 2 }]} numberOfLines={1}>{item.student?.name || 'Unknown'}</Text>
                      <Text style={[styles.recentSub, { color: colors.subText, textAlign: 'left' }]} numberOfLines={1}>{item.examTitle}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.leaderScore}>{item.score?.toFixed(1)}%</Text>
                    <BouncyTouchable 
                      style={[styles.likeBtn, item.likedByMe && styles.likeBtnActive, { marginTop: 6, paddingVertical: 4, paddingHorizontal: 10, width: 'auto', borderColor: item.likedByMe ? 'rgba(236,72,153,0.4)' : colors.cardBorder, backgroundColor: item.likedByMe ? 'rgba(236,72,153,0.15)' : isDarkMode ? '#0f172a' : '#f1f5f9' }]} 
                      onPress={() => handleLike(item.resultId)}
                    >
                      <Feather name="heart" size={12} color={item.likedByMe ? "#ec4899" : "#94a3b8"} />
                      <Text style={[styles.likeText, { color: item.likedByMe ? '#ec4899' : colors.subText }]}>
                        {item.likes?.length || 0}
                      </Text>
                    </BouncyTouchable>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyLeader}>
              <Feather name="award" size={24} color="#475569" />
              <Text style={[styles.emptyText, { color: colors.subText, marginTop: 8 }]}>No toppers available yet.</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, i) => (
            <BouncyTouchable
              key={i}
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => navigation.navigate(action.route)}
              activeScale={0.92}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '18' }]}>
                <Feather name={action.icon} size={20} color={action.color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.subText }]}>{action.label}</Text>
            </BouncyTouchable>
          ))}
        </View>
        </>
        )}
      </Animated.ScrollView>

      {/* Broadcast Modal */}
      <Modal
        visible={showAllToppers}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowAllToppers(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder, paddingTop: Math.max((insets.top || 20) - 15, 5) + 15, paddingBottom: 15 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>All Exam Toppers</Text>
            <BouncyTouchable onPress={() => setShowAllToppers(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={24} color={colors.text} />
            </BouncyTouchable>
          </View>
          
          <FlatList
            data={toppers || []}
            keyExtractor={item => item.resultId}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }) => (
              <View style={[styles.leaderCard, { width: '100%', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
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
                    <Text style={[styles.leaderName, { color: colors.text, marginBottom: 2, textAlign: 'left', fontSize: 15 }]} numberOfLines={1}>{item.student?.name || 'Unknown'}</Text>
                    <Text style={[styles.recentSub, { color: colors.subText, textAlign: 'left', fontSize: 13 }]}>{item.examTitle}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.leaderScore, { fontSize: 18 }]}>{item.score?.toFixed(1)}%</Text>
                  <TouchableOpacity 
                    style={[styles.likeBtn, item.likedByMe && styles.likeBtnActive, { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, width: 'auto', borderColor: item.likedByMe ? 'rgba(236,72,153,0.4)' : colors.cardBorder, backgroundColor: item.likedByMe ? 'rgba(236,72,153,0.15)' : isDarkMode ? '#0f172a' : '#f1f5f9' }]} 
                    onPress={() => handleLike(item.resultId)}
                  >
                    <Feather name="heart" size={14} color={item.likedByMe ? "#ec4899" : "#94a3b8"} />
                    <Text style={[styles.likeText, { color: item.likedByMe ? '#ec4899' : colors.subText }, { fontSize: 13 }]}>
                      {item.likes?.length || 0}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* More Options Modal */}
      <Modal visible={showMoreOptions} transparent animationType="fade" onRequestClose={() => setShowMoreOptions(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMoreOptions(false)}>
          <View style={[styles.optionsModalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity style={styles.optionItem} onPress={() => { setShowMoreOptions(false); dispatch(getAdminDashboardStats()); }}>
              <Feather name="refresh-cw" size={16} color={colors.text} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, { color: colors.text }]}>Refresh Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomWidth: 0 }]} onPress={() => { setShowMoreOptions(false); navigation.navigate('Users'); }}>
              <Feather name="users" size={16} color={colors.text} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, { color: colors.text }]}>View All Users</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
 
      {/* Broadcast Message Modal */}
      <Modal visible={isBroadcastModalVisible} animationType="slide" transparent={true} onRequestClose={() => setBroadcastModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} activeOpacity={1} onPress={() => setBroadcastModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderTopColor: colors.cardBorder, borderTopWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Broadcast Message</Text>
              <TouchableOpacity onPress={() => setBroadcastModalVisible(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ color: colors.text, fontSize: 14, marginBottom: 15, lineHeight: 20 }}>
                This message will be sent as a push notification to <Text style={{fontWeight:'bold', color: colors.primary}}>ALL students and teachers</Text>.
              </Text>
              
              <Text style={[styles.inputLabel, { color: colors.text }]}>Title</Text>
              <View style={[styles.inputContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.cardBorder }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. System Maintenance"
                  placeholderTextColor={colors.subText}
                  value={broadcastData.title}
                  onChangeText={(text) => setBroadcastData({...broadcastData, title: text})}
                />
              </View>

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 15 }]}>Message</Text>
              <View style={[styles.inputContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.cardBorder, height: 100, alignItems: 'flex-start' }]}>
                <TextInput
                  style={[styles.input, { color: colors.text, textAlignVertical: 'top', marginTop: 10 }]}
                  placeholder="Type your broadcast message here..."
                  placeholderTextColor={colors.subText}
                  multiline
                  numberOfLines={4}
                  value={broadcastData.message}
                  onChangeText={(text) => setBroadcastData({...broadcastData, message: text})}
                />
              </View>

              <TouchableOpacity 
                style={[styles.broadcastBtn, { opacity: (broadcastData.title && broadcastData.message && !isBroadcasting) ? 1 : 0.5 }]}
                disabled={!broadcastData.title || !broadcastData.message || isBroadcasting}
                onPress={async () => {
                  if (!broadcastData.title.trim() || !broadcastData.message.trim()) return;
                  setIsBroadcasting(true);
                  try {
                    await api.post('/api/notifications/send', {
                      email: 'all',
                      title: broadcastData.title,
                      message: broadcastData.message,
                      type: 'system_alert'
                    });
                    
                    Toast.show({ type: 'success', text1: 'Success', text2: 'Broadcast message sent to all users!' });
                    setBroadcastModalVisible(false);
                    setBroadcastData({ title: '', message: '' });
                  } catch (error) {
                    Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'Failed to send broadcast message.' });
                  } finally {
                    setIsBroadcasting(false);
                  }
                }}
              >
                {isBroadcasting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Feather name="send" size={18} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.broadcastBtnText}>Send to All Users</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Topper Student Profile Modal ── */}
      {selectedTopper && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setSelectedTopper(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Animated.View style={{ transform: [{ scale: modalZoomAnim }], width: '90%', backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center', position: 'relative' }}>
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
            </Animated.View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Top header */
  topHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 10 : 20, paddingBottom: 15,
  },
  menuBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  topHeaderTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  crownAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  crownAvatarGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  crownEmoji: { fontSize: 16 },

  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalCloseBtn: { padding: 4 },

  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, height: 50 },
  input: { flex: 1, fontSize: 15 },
  broadcastBtn: { backgroundColor: '#8b5cf6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginTop: 25 },
  broadcastBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },

  content: { paddingHorizontal: 15, paddingBottom: 36 },

  /* Banner */
  bannerOuter: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, elevation: 8 },
  bannerGrad: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 120 },
  bannerTextContainer: { flex: 1, marginRight: 10 },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', lineHeight: 28, marginBottom: 6 },
  bannerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },

  /* Banner illustration */
  bannerIllustration: { width: 110, height: 90 },
  illustrationScreen: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  illustrationBg: { flex: 1, padding: 8, justifyContent: 'space-between' },
  miniChartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 40 },
  miniBar: { width: 10, borderRadius: 3 },
  miniPieWrapper: { flexDirection: 'row', justifyContent: 'flex-end' },
  miniPie: { width: 26, height: 26, borderRadius: 13, borderWidth: 6, borderColor: '#8b5cf6' },
  miniPieSlice: { width: 26, height: 26, borderRadius: 13, borderWidth: 6, borderColor: '#f59e0b', marginLeft: -14 },

  /* Stats Grid */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  statCard: {
    padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, overflow: 'hidden',
  },
  statCardTopStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  iconWrapper: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 11, marginBottom: 6, lineHeight: 14 },
  trendRow: { flexDirection: 'row', alignItems: 'center' },
  trendText: { fontSize: 10, fontWeight: '700' },
  trendSub: { fontSize: 9 },

  /* Distribution + Activity */
  rowLayout: { flexDirection: 'row', gap: 12, marginBottom: 20 },

  card: { borderRadius: 16, padding: 14, borderWidth: 1 },
  distributionCard: { flex: 1 },
  activityCard: { flex: 1 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },

  pieChartWrapper: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  pieCenterLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pieCenterTitle: { fontSize: 10, fontWeight: '500' },
  pieCenterValue: { fontSize: 18, fontWeight: '800' },

  legendContainer: { marginTop: 8 },
  legendItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, paddingVertical: 2 },
  legendLeft: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 11 },
  legendCount: { fontSize: 11 },

  activityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  activityIconWrapper: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 11, fontWeight: '700', marginBottom: 1 },
  activityDesc: { fontSize: 10 },
  activityTime: { color: '#818cf8', fontSize: 10, fontWeight: '600' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderTopWidth: 1, marginTop: 4 },
  viewAllText: { fontSize: 12, marginRight: 4 },

  /* Quick Actions */
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, marginLeft: 2 },
  quickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionCard: {
    width: '23.5%', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6,
    alignItems: 'center', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  quickActionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 10, textAlign: 'center', fontWeight: '600' },

  /* Toppers */
  leaderCard: { borderRadius: 14, padding: 14, marginRight: 10, borderWidth: 1 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontWeight: '800', fontSize: 13 },
  leaderName: { fontSize: 12, fontWeight: '600' },
  recentSub: { fontSize: 11 },
  leaderScore: { color: '#10b981', fontSize: 14, fontWeight: '800' },
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
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  optionsModalContent: { width: 220, borderRadius: 12, padding: 8, borderWidth: 1, elevation: 5 },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.2)' },
  optionText: { fontSize: 14, fontWeight: '500' }
});
