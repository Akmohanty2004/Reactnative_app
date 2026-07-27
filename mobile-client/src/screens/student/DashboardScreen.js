import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
  TouchableOpacity, Modal, Image, FlatList, StatusBar, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { getStudentExams } from '../../redux/slices/examSlice';
import { getStudentResults, getLeaderboard, getToppers, likeTopper } from '../../redux/slices/resultSlice';
import Skeleton from '../../components/Skeleton';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 56) / 3;   // three columns with gaps

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [perfFilter, setPerfFilter] = useState('This Month');
  const [subFilter, setSubFilter] = useState('This Month');

  const { user } = useSelector(s => s.auth);
  const { exams, isLoading: examsLoading } = useSelector(s => s.exams);
  const { results, leaderboard, toppers } = useSelector(s => s.results);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllToppers, setShowAllToppers] = useState(false);
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
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    border: isDarkMode ? '#334155' : '#e2e8f0',
  };

  const styles = getStyles(colors);
  const [stats, setStats] = useState({
    examsTaken: 0, passed: 0, avgScore: 0, upcoming: 0, ongoing: 0,
    totalPassed: 0, totalFailed: 0, bestScore: 0, expired: 0,
  });

  useFocusEffect(useCallback(() => {
    const fetchData = () => {
      dispatch(getStudentExams());
      dispatch(getStudentResults());
      dispatch(getLeaderboard());
      dispatch(getToppers());
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30 seconds poll
    
    return () => clearInterval(interval);
  }, [dispatch]));

  useFocusEffect(useCallback(() => {
    const resList = results || [];
    const examsList = exams || [];
    const publishedResults = resList.filter(r => r.isPublished || r.status === 'submitted' || r.status === 'published' || r.status === 'checked' || r.percentage !== undefined);
    const examsTaken = resList.length;
    const passed = publishedResults.filter(r => r.isPassed || (r.percentage || 0) >= (r.examId?.passingMarks || 40)).length;
    const scores = publishedResults.map(r => r.percentage || 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const ongoing = examsList.filter(e => e.isAvailable || e.status === 'ongoing').length;
    const upcoming = examsList.filter(e => !(e.isAvailable || e.status === 'ongoing') && (e.isUpcoming || e.status === 'published')).length;
    const expired = examsList.filter(e => getExamStatus(e) === 'Expired').length;
    const publishedCount = publishedResults.length;
    const totalFailed = Math.max(0, publishedCount - passed);
    setStats({ examsTaken, passed, avgScore, upcoming, ongoing, totalPassed: passed, totalFailed, publishedCount, bestScore, expired });
  }, [exams, results]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(getStudentExams()),
      dispatch(getStudentResults()),
      dispatch(getLeaderboard()),
      dispatch(getToppers()),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleLike = (resultId) => {
    dispatch(likeTopper(resultId));
  };

  /* ─── chart data ─── */
  const published = (results || []).filter(r => r.isPublished || r.status === 'submitted' || r.status === 'published' || r.status === 'checked' || r.percentage !== undefined);

  const perfLabels = published.length > 1
    ? published.map(r => (r.examId?.title || 'Exam').substring(0, 5))
    : published.length === 1
      ? ['1 May', '8 May', '16 May', '24 May', '31 May']
      : ['1 May', '8 May', '16 May', '24 May', '31 May'];

  const perfScores = published.length > 1
    ? published.map(r => r.percentage || 0)
    : published.length === 1
      ? [0, 0, published[0].percentage || 0, published[0].percentage || 0, published[0].percentage || 0]
      : [0, 0, 0, 0, 0];

  const lineData = {
    labels: perfLabels,
    datasets: [{ data: perfScores, color: (op = 1) => `rgba(99,102,241,${op})`, strokeWidth: 2 }],
  };

  /* subject bar */
  const subjectMap = published.reduce((acc, r) => {
    const s = r.examId?.subject;
    if (s) {
      if (!acc[s]) acc[s] = { total: 0, count: 0 };
      acc[s].total += r.percentage || 0;
      acc[s].count += 1;
    }
    return acc;
  }, {});
  const subLabels = Object.keys(subjectMap).length > 0 ? Object.keys(subjectMap) : ['N/A'];
  const subAvgs = Object.keys(subjectMap).length > 0
    ? Object.values(subjectMap).map(v => v.total / v.count)
    : [0];

  const barData = { labels: subLabels, datasets: [{ data: subAvgs }] };

  /* pass/fail pie */
  const pieData = (stats.publishedCount > 0 || stats.examsTaken > 0) ? [
    { name: 'Passed', population: Math.max(stats.passed || 0, 0.001), color: '#10b981', legendFontColor: '#94a3b8', legendFontSize: 13 },
    { name: 'Failed', population: Math.max(stats.totalFailed || 0, 0.001), color: '#ef4444', legendFontColor: '#94a3b8', legendFontSize: 13 },
  ] : [
    { name: 'Passed', population: 1, color: '#10b981', legendFontColor: '#94a3b8', legendFontSize: 13 },
    { name: 'Failed', population: 0.001, color: '#ef4444', legendFontColor: '#94a3b8', legendFontSize: 13 },
  ];

  const chartCfg = {
    backgroundGradientFrom: '#1e293b',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#0f172a',
    backgroundGradientToOpacity: 0,
    color: (op = 1) => `rgba(139,92,246,${op})`,
    labelColor: () => '#94a3b8',
    strokeWidth: 2,
    barPercentage: 0.55,
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#1e293b' },
    propsForBackgroundLines: { strokeDasharray: '4', stroke: 'rgba(255,255,255,0.05)' },
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
    'Completed': { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
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
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation?.navigate('Login')}
              style={{ marginRight: 10, padding: 4 }}
            >
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              My <Text style={{ color: '#818cf8' }}>Home</Text>
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => { dispatch({ type: 'chat/clearUnreadMessages' }); navigation.navigate('ChatList'); }}
            >
              <Feather name="message-square" size={20} color={colors.text} />
              {unreadUsersCount > 0 ? (
                <View style={styles.badgeTextDot}>
                  <Text style={styles.badgeText}>{unreadUsersCount > 99 ? '99+' : unreadUsersCount}</Text>
                </View>
              ) : hasUnreadMessages ? (
                <View style={styles.dotBadge} />
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }]} onPress={() => navigation.navigate('Notifications')}>
              <Feather name="bell" size={20} color={colors.text} />
              {unreadCount > 0 ? (
                <View style={styles.badgeTextDot}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setSidebarVisible(true)}>
              <Feather name="menu" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Welcome Banner ── */}
        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerWelcome}>Welcome back,</Text>
            <Text style={styles.bannerName}>{user?.name?.split(' ')[0]}! 👋</Text>
            <Text style={styles.bannerSub}>Here's your exam performance summary.</Text>
          </View>
          <View style={styles.bannerGraphic}>
            <View style={styles.monitorOuter}>
              <Feather name="monitor" size={70} color="#7c3aed" style={{ opacity: 0.7 }} />
              <View style={styles.monitorInner}>
                <Feather name="trending-up" size={22} color="#818cf8" />
              </View>
            </View>
          </View>
        </View>

        {/* ── Ongoing Exam Banner ── */}
        {exams?.find(e => getExamStatus(e) === 'Available') && (
          <TouchableOpacity 
            style={[styles.banner, { backgroundColor: '#f59e0b', borderColor: '#d97706', paddingVertical: 14, paddingHorizontal: 18 }]}
            onPress={() => navigation.navigate('Exams')}
          >
            <Feather name="alert-circle" size={24} color="#fff" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Ongoing Exam Available!</Text>
              <Text style={{ color: colors.text, fontSize: 13, opacity: 0.9 }}>Tap to join now</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* ── 6-stat grid (3 columns) ── */}
        {((examsLoading && (!exams || exams.length === 0)) || refreshing) ? (
          <View style={styles.statsGrid}>
            <Skeleton width={CARD_W} height={90} borderRadius={16} />
            <Skeleton width={CARD_W} height={90} borderRadius={16} />
            <Skeleton width={CARD_W} height={90} borderRadius={16} />
            <Skeleton width={CARD_W} height={90} borderRadius={16} />
            <Skeleton width={CARD_W} height={90} borderRadius={16} />
            <Skeleton width={CARD_W} height={90} borderRadius={16} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {[
              { label: 'Exams Taken', value: stats.examsTaken, icon: 'file-text', iconBg: '#1e3a5f', iconColor: '#60a5fa' },
              { label: 'Passed', value: stats.passed, icon: 'check-circle', iconBg: '#14532d', iconColor: '#4ade80' },
              { label: 'Avg Score', value: `${stats.avgScore.toFixed(1)}%`, icon: 'trending-up', iconBg: '#3b0764', iconColor: '#a855f7' },
              { label: 'Upcoming', value: stats.upcoming || 0, icon: 'clock', iconBg: '#422006', iconColor: '#f59e0b' },
              { label: 'Expired', value: stats.expired || 0, icon: 'calendar', iconBg: '#431407', iconColor: '#fb923c' },
              { label: 'Best Score', value: `${stats.bestScore.toFixed(1)}%`, icon: 'star', iconBg: '#312e81', iconColor: '#fbbf24' },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: s.iconBg }]}>
                  <Feather name={s.icon} size={18} color={s.iconColor} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Performance Trend (full width) ── */}
        <View style={styles.fullCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleLg}>Performance Trend</Text>
            <FilterPill label={perfFilter} active onPress={() => {}} />
          </View>
          {published.length > 0 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={lineData}
                  width={Math.max(SCREEN_W - 64, perfLabels.length * 70)}
                  height={200}
                  chartConfig={chartCfg}
                  style={{ marginLeft: -8, marginTop: 8, borderRadius: 12 }}
                  withInnerLines
                  withOuterLines={false}
                  withDots
                  withShadow
                  bezier
                />
              </ScrollView>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#6366f1' }]} />
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

        {/* ── Subject Performance (full width) ── */}
        <View style={styles.fullCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleLg}>Subject Performance</Text>
            <FilterPill label={subFilter} active onPress={() => {}} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={barData}
              width={Math.max(SCREEN_W - 64, subLabels.length * 80)}
              height={200}
              chartConfig={{ ...chartCfg, color: (op = 1) => `rgba(139,92,246,${op})` }}
              style={{ marginLeft: -8, marginTop: 8, borderRadius: 12 }}
              withInnerLines
              showValuesOnTopOfBars
              withHorizontalLabels
              fromZero
            />
          </ScrollView>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={styles.legendText}>Score (%)</Text>
          </View>
        </View>

        {/* ── Pass/Fail Distribution (full width, matching teacher layout) ── */}
        <View style={styles.fullCard}>
          <Text style={styles.cardTitleLg}>Pass/Fail Distribution</Text>
          <View style={styles.passFailRow}>
            {/* Donut Chart */}
            <View style={styles.passFailDonut}>
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
              <View style={[styles.passFailDonutCenter, { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.card }]}>
                <Text style={styles.passFailDonutValue}>{stats.publishedCount || 0}</Text>
                <Text style={styles.passFailDonutLabel}>Total Exam</Text>
              </View>
            </View>

            {/* Legend */}
            <View style={styles.passFailLegend}>
              <View style={styles.passFailLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '600' }}>
                  {stats.publishedCount > 0 ? ((stats.passed / stats.publishedCount) * 100).toFixed(0) : 0}% Passed
                </Text>
              </View>
              <Text style={styles.passFailLegendCount}>{stats.passed} Exam</Text>
              <View style={[styles.passFailLegendItem, { marginTop: 10 }]}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>
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

        {/* ── Recent Exams (full width) ── */}
        <View style={styles.fullCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleLg}>Recent Exams</Text>
            {sortedExams.length > 4 && (
              <TouchableOpacity onPress={() => setShowRecentExamsModal(true)}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
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
            <TouchableOpacity onPress={() => navigation.navigate('Exams')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
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
                <Text style={styles.cardTitle}>Exam Toppers</Text>
                <Text style={styles.cardSubtitle}>Top performers in recent exams</Text>
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
                <View key={item.resultId} style={[styles.leaderCard, { width: 280, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.rankBadge, {
                      backgroundColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#334155',
                      marginRight: 12
                    }]}>
                      <Text style={styles.rankText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.leaderName, { textAlign: 'left', marginBottom: 2 }]} numberOfLines={1}>{item.student?.name || 'Unknown'}</Text>
                      <Text style={[styles.recentSub, { textAlign: 'left' }]} numberOfLines={1}>{item.examTitle}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.leaderScore}>{item.score?.toFixed(1)}%</Text>
                    <TouchableOpacity 
                      style={[styles.likeBtn, item.likedByMe && styles.likeBtnActive, { marginTop: 6, paddingVertical: 4, paddingHorizontal: 10, width: 'auto' }]} 
                      onPress={() => handleLike(item.resultId)}
                    >
                      <Feather name="heart" size={12} color={item.likedByMe ? "#ec4899" : "#94a3b8"} />
                      <Text style={[styles.likeText, item.likedByMe && { color: '#ec4899' }]}>
                        {item.likes?.length || 0}
                      </Text>
                    </TouchableOpacity>
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

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Sidebar Modal ── */}
      <Modal visible={isSidebarVisible} transparent animationType="fade">
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSidebarVisible(false)} />
          <View style={[styles.sidebar, { backgroundColor: colors.card }]}>
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
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllToppers(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Exam Toppers</Text>
            <TouchableOpacity onPress={() => setShowAllToppers(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={24} color="#f8fafc" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={toppers || []}
            keyExtractor={item => item.resultId}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }) => (
              <View style={[styles.leaderCard, { width: '100%', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#334155', marginRight: 12 }]}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leaderName, { marginBottom: 2, textAlign: 'left' }]} numberOfLines={1}>{item.student?.name || 'Unknown'}</Text>
                    <Text style={[styles.recentSub, { textAlign: 'left' }]}>{item.examTitle}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.leaderScore, { marginBottom: 6 }]}>{item.score?.toFixed(1)}%</Text>
                  <TouchableOpacity 
                    style={[styles.likeBtn, item.likedByMe && styles.likeBtnActive, { marginTop: 0, paddingVertical: 4, paddingHorizontal: 10, width: 'auto' }]} 
                    onPress={() => handleLike(item.resultId)}
                  >
                    <Feather name="heart" size={12} color={item.likedByMe ? "#ec4899" : "#94a3b8"} />
                    <Text style={[styles.likeText, item.likedByMe && { color: '#ec4899' }]}>
                      {item.likes?.length || 0}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Recent Exams</Text>
            <TouchableOpacity onPress={() => setShowRecentExamsModal(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={24} color="#f8fafc" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={sortedExams}
            keyExtractor={item => item._id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const status = getExamStatus(item);
              const ss = statusStyle[status] || statusStyle['Expired'];
              return (
                <View style={[styles.recentRow, { backgroundColor: colors.card, padding: 12, borderRadius: 12, marginBottom: 10 }]}>
                  <View style={[styles.examIconBox, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
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

    </View>
  );
}

const getStyles = (colors) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 32 },

  /* header */
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  menuBtn: { marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(148,163,184,0.15)', justifyContent: 'center', alignItems: 'center', marginLeft: 10, position: 'relative' },
  dotBadge: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#fb7185', borderWidth: 2, borderColor: colors.bg },
  badgeTextDot: { position: 'absolute', top: -2, right: -4, backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 4, paddingVertical: 1, minWidth: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.bg },
  badgeText: { color: colors.text, fontSize: 10, fontWeight: 'bold' },

  /* banner */
  banner: {
    backgroundColor: '#1e1145', borderRadius: 20, padding: 22,
    flexDirection: 'row', alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#2e1065',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  bannerWelcome: { color: '#c4b5fd', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  bannerName: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 6 },
  bannerSub: { color: '#a78bfa', fontSize: 12, lineHeight: 18 },
  bannerGraphic: { marginLeft: 10 },
  monitorOuter: { width: 90, height: 80, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  monitorInner: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(99,102,241,0.3)', borderRadius: 8, padding: 4,
  },

  /* stat grid (3 columns) */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  statCard: {
    width: CARD_W, backgroundColor: colors.card, borderRadius: 16,
    padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  statIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statLabel: { color: colors.subText, fontSize: 11, fontWeight: '500', marginBottom: 4 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },

  /* card common */
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  cardTitleLg: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  cardSubtitle: { color: colors.subText, fontSize: 11, marginTop: 2 },

  filterPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 12,
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
  viewAll: { color: '#6366f1', fontSize: 12, fontWeight: '600' },
  recentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, gap: 6 },
  examIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(99,102,241,0.15)', justifyContent: 'center', alignItems: 'center', marginTop: 2,
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
  },
  leaderboardBtn: {
    backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 10,
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
  leaderScore: { color: '#10b981', fontSize: 14, fontWeight: '800' },
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
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalCloseBtn: { padding: 4 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  likeBtnActive: { backgroundColor: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.4)' },
  likeText: { fontSize: 13, fontWeight: '700', color: colors.subText },
});
