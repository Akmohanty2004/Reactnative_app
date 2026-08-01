import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, RefreshControl, FlatList, StatusBar, Image, Animated } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import Svg, { Path } from 'react-native-svg';
import { getTeacherExams } from '../../redux/slices/examSlice';
import { getToppers, likeTopper } from '../../redux/slices/resultSlice';
import Skeleton from '../../components/Skeleton';
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
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const { user } = useSelector(state => state.auth);
  const { exams, isLoading: examsLoading } = useSelector(state => state.exams);
  const { toppers } = useSelector(state => state.results || { toppers: [] });
  const [showAllToppers, setShowAllToppers] = useState(false);
  const [selectedTopper, setSelectedTopper] = useState(null);
  const [statusFilter, setStatusFilter] = useState('This Month');
  const [ratioFilter, setRatioFilter] = useState('This Month');
  const { unreadCount } = useSelector(state => state.notifications);
  const { hasUnreadMessages, contacts } = useSelector(state => state.chat);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });

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
    setRefreshing(true);
    await dispatch(getTeacherExams());
    await dispatch(getToppers());
    setRefreshing(false);
  }, [dispatch]);

  const handleLike = (resultId) => {
    dispatch({ type: 'results/likeTopperOptimistic', payload: { resultId, userId: user._id || user.id } });
    dispatch(likeTopper(resultId));
  };

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
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
    { name: 'Published', count: published, color: '#10b981', legendFontColor: colors.subText, legendFontSize: 12 },
    { name: 'Ongoing', count: ongoing, color: '#f59e0b', legendFontColor: colors.subText, legendFontSize: 12 },
    { name: 'Completed', count: completed, color: '#6366f1', legendFontColor: colors.subText, legendFontSize: 12 },
  ] : [];

  // Pass/Fail Pie
  const pieData2 = totalPie2 > 0 ? [
    { name: 'Passed', count: passed, color: '#10b981', legendFontColor: colors.subText, legendFontSize: 12 },
    { name: 'Failed', count: failed, color: '#ef4444', legendFontColor: colors.subText, legendFontSize: 12 },
  ] : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Home</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
            onPress={() => {
              dispatch({ type: 'chat/clearUnreadMessages' });
              navigation.navigate('ChatList');
            }}
          >
            <Feather name="message-square" size={20} color={colors.text} />
            {unreadUsersCount > 0 ? (
              <View style={styles.badgeTextDot}>
                <Text style={styles.badgeText}>{unreadUsersCount > 99 ? '99+' : unreadUsersCount}</Text>
              </View>
            ) : hasUnreadMessages ? (
              <View style={styles.badgeDot} />
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
            onPress={() => navigation.navigate('Notifications')}
          >
            <Feather name="bell" size={20} color={colors.text} />
            {unreadCount > 0 ? (
              <View style={styles.badgeTextDot}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.bannerContainer}>
          <View style={[styles.banner, { backgroundColor: isDarkMode ? '#1e1145' : '#4f46e5', borderColor: isDarkMode ? '#2e1065' : '#6366f1' }]}>
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerWelcome, { color: '#e0e7ff' }]}>Welcome back,</Text>
              <Text style={[styles.bannerTitle, { color: '#ffffff' }]}>
                {user?.name?.split(' ')[0]}! 👋✨
              </Text>
              <Text style={[styles.bannerSubtitle, { color: '#c4b5fd' }]}>Here's your teaching statistics and{'\n'}exam performance at a glance.</Text>
            </View>
            {/* Decorative icons on the banner */}
            <View style={styles.bannerDecorations}>
              <View style={[styles.bannerIconCircle, { backgroundColor: 'rgba(139,92,246,0.3)', top: 10, right: 30 }]}>
                <Feather name="bar-chart-2" size={18} color="#c4b5fd" />
              </View>
              <View style={[styles.bannerIconCircle, { backgroundColor: 'rgba(99,102,241,0.4)', top: 60, right: 5 }]}>
                <Feather name="pie-chart" size={22} color="#a5b4fc" />
              </View>
            </View>
          </View>
        </View>

        {/* Stat Cards Row */}
        {examsLoading ? (
          <View style={[styles.statsRow, { marginBottom: 20 }]}>
             <Skeleton width={100} height={120} borderRadius={16} />
             <Skeleton width={100} height={120} borderRadius={16} />
             <Skeleton width={100} height={120} borderRadius={16} />
          </View>
        ) : (
          <View style={styles.statsRow}>
          {/* Total Exams */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
              <Feather name="file-text" size={22} color="#6366f1" />
            </View>
            <Text style={[styles.statLabel, { color: colors.subText }]} numberOfLines={1}>Total Exams</Text>
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{totalExams}</Text>
            <View style={styles.statSubRow}>
              <Text style={[styles.statSub, { color: '#10b981' }]}>All time</Text>
              <WaveLine color="#10b981" />
            </View>
          </View>

          {/* Published */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
              <Feather name="check-circle" size={22} color="#10b981" />
            </View>
            <Text style={[styles.statLabel, { color: colors.subText }]} numberOfLines={1}>Published</Text>
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{published}</Text>
            <View style={styles.statSubRow}>
              <Text style={[styles.statSub, { color: '#10b981' }]}>All time</Text>
              <WaveLine color="#10b981" />
            </View>
          </View>

          {/* Ongoing */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <Feather name="clock" size={22} color="#f59e0b" />
            </View>
            <Text style={[styles.statLabel, { color: colors.subText }]} numberOfLines={1}>Ongoing</Text>
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{ongoing}</Text>
            <View style={styles.statSubRow}>
              <Text style={[styles.statSub, { color: '#f59e0b' }]}>Currently</Text>
              <WaveLine color="#f59e0b" />
            </View>
          </View>
        </View>
        )}

        {/* Status Distribution Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Status Distribution</Text>
            <TouchableOpacity 
              style={[styles.dropdownBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => cycleFilter(statusFilter, setStatusFilter)}
            >
              <Text style={[styles.dropdownText, { color: colors.text }]}>{statusFilter}</Text>
              <Feather name="chevron-down" size={14} color={colors.subText} />
            </TouchableOpacity>
          </View>

          <View style={styles.chartRow}>
            <View style={styles.pieChartWrapper}>
              <PieChart
                data={pieData1}
                width={180}
                height={180}
                chartConfig={chartConfig}
                accessor={"count"}
                backgroundColor={"transparent"}
                paddingLeft={"42"}
                hasLegend={false}
                absolute
              />
              <View style={[styles.pieCenterLabel, { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.card }]}>
                <Text style={[styles.pieCenterTitle, { color: colors.subText }]}>Total</Text>
                <Text style={[styles.pieCenterValue, { color: colors.text }]}>{totalPie1}</Text>
              </View>
            </View>

            <View style={styles.legendContainerSide}>
              <View style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={[styles.legendText, { color: colors.subText }]}>Published</Text>
                </View>
                <Text style={[styles.legendCount, { color: colors.subText }]}>{published}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={[styles.legendText, { color: colors.subText }]}>Ongoing</Text>
                </View>
                <Text style={[styles.legendCount, { color: colors.subText }]}>{ongoing}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: '#6366f1' }]} />
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
              <PieChart
                data={pieData2}
                width={140}
                height={140}
                chartConfig={chartConfig}
                accessor={"count"}
                backgroundColor={"transparent"}
                paddingLeft={"32"}
                hasLegend={false}
                absolute
              />
              <View style={[styles.pieCenterLabel, { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.card }]}>
                <Text style={[styles.pieCenterPassRate, { color: colors.text }]}>{passRate}%</Text>
                <Text style={[styles.pieCenterPassLabel, { color: colors.subText }]}>Pass Rate</Text>
              </View>
              {/* Star badge at bottom of chart */}
              <View style={styles.starBadge}>
                <Feather name="star" size={14} color="white" />
              </View>
            </View>

            <View style={styles.passFailLegend}>
              <View style={[styles.passFailRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: '#10b981', fontSize: 15, fontWeight: '600' }}>Passed</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{passed}</Text>
              </View>
              <View style={styles.passFailRow}>
                <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>Failed</Text>
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
                exam.status === 'completed' && !exam.isResultPublished ? { backgroundColor: '#f59e0b20' } :
                exam.status === 'completed' ? styles.badgeSuccess :
                styles.badgeSec
              ]}>
                <Text style={[styles.badgeText, 
                  exam.status === 'published' ? styles.badgeTextInfo :
                  exam.status === 'ongoing' ? styles.badgeTextWarn :
                  exam.status === 'completed' && !exam.isResultPublished ? { color: '#f59e0b' } :
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
              <TouchableOpacity onPress={() => setShowAllToppers(true)}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* carousel style – horizontal scroll */}
          {toppers && toppers.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {toppers.slice(0, 2).map((item, idx) => (
                <View key={item.resultId} style={[styles.leaderCard, { width: 280, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <TouchableOpacity 
                      onPress={() => setSelectedTopper(item)} 
                      style={{ position: 'relative', marginRight: 12 }}
                      activeOpacity={0.8}
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
                    </TouchableOpacity>
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

      </ScrollView>

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
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllToppers(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
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
                  <TouchableOpacity 
                    onPress={() => {
                      setShowAllToppers(false);
                      setSelectedTopper(item);
                    }} 
                    style={{ position: 'relative', marginRight: 12 }}
                    activeOpacity={0.8}
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
                  </TouchableOpacity>
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
      {selectedTopper && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setSelectedTopper(null)}>
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
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10, position: 'relative' },
  badgeDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#8b5cf6', borderWidth: 1, borderColor: '#0f172a' },
  badgeTextDot: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 4, paddingVertical: 1, minWidth: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#0f172a' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  content: { padding: 15, paddingBottom: 30 },
  
  // Sidebar
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  sidebarCloseArea: { flex: 1 },
  sidebarContent: { width: 250, height: '100%', padding: 20, paddingTop: 60, elevation: 5, shadowColor: '#000', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10 },
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
  statCard: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  iconWrapper: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statLabel: { fontSize: 12, marginBottom: 2, fontWeight: '500' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  statSub: { fontSize: 11, fontWeight: '500' },

  // Section Card
  sectionCard: { borderRadius: 16, padding: 18, marginBottom: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  dropdownText: { fontSize: 12, fontWeight: '500' },

  // Chart layout
  chartRow: { flexDirection: 'row', alignItems: 'center' },
  pieChartWrapper: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  pieChartWrapperSmall: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', position: 'relative' },
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
  badgeInfo: { backgroundColor: 'rgba(59,130,246,0.1)' },
  badgeTextInfo: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeWarn: { backgroundColor: 'rgba(245,158,11,0.1)' },
  badgeTextWarn: { color: '#f59e0b', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeSuccess: { backgroundColor: 'rgba(16,185,129,0.1)' },
  badgeTextSuccess: { color: '#10b981', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeSec: { backgroundColor: 'rgba(148,163,184,0.1)' },
  badgeTextSec: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },

  // Toppers
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
});
