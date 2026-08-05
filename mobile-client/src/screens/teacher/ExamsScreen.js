import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getTeacherExams } from '../../redux/slices/examSlice';
import Skeleton from '../../components/Skeleton';
import api from '../../services/api';
import { playRefreshSound } from '../../utils/SoundManager';

const FILTERS = ['All', 'Published', 'Ongoing', 'Completed'];

const STATUS_CONFIG = {
  published: { label: 'Published', color: '#10b981' },
  ongoing:   { label: 'Ongoing',   color: '#f59e0b' },
  completed: { label: 'Completed', color: '#22c55e' },
  draft:     { label: 'Draft',     color: '#64748b' },
};

const ICON_COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#06b6d4'];

export default function ExamsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { theme } = useSelector((state) => state.ui || { theme: 'dark' });
  const { exams = [], isLoading } = useSelector((state) => state.exams);

  const [searchQuery, setSearchQuery]   = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing, setRefreshing]     = useState(false);
  const [showFilters, setShowFilters]   = useState(true);
  
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [isFetchingClasses, setIsFetchingClasses] = useState(false);

  
  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    cardAlt: isDarkMode ? '#151e2d' : '#f1f5f9',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    bannerBg: isDarkMode ? '#13102b' : '#f1f5f9',
  };
  const styles = getStyles(colors);
  useFocusEffect(
    useCallback(() => {
      dispatch(getTeacherExams());
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

  const onRefresh = async () => {
    playRefreshSound();
    setRefreshing(true);
    await dispatch(getTeacherExams());
    await fetchClasses();
    setRefreshing(false);
  };

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchSearch = exam.title?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const dbStatus = exam.status?.toLowerCase() || '';
      const st = dbStatus === 'published' ? 'Published' : dbStatus === 'completed' ? 'Completed' : dbStatus === 'ongoing' ? 'Ongoing' : 'Draft';
      const matchFilter = activeFilter === 'All' || st === activeFilter;
        
      let matchClass = true;
      if (selectedClass !== 'All Classes') {
        if (!exam.classGroup) {
          matchClass = false;
        } else {
          const groups = exam.classGroup.split(',').map(s => s.trim().toLowerCase());
          matchClass = groups.includes(selectedClass.toLowerCase());
        }
      }
      return matchSearch && matchFilter && matchClass;
    });
  }, [exams, searchQuery, activeFilter, selectedClass]);

  const formatDate = (raw) => {
    if (!raw) return 'N/A';
    const d = new Date(raw);
    const dd  = String(d.getDate()).padStart(2, '0');
    const mm  = d.toLocaleString('en-US', { month: 'long' });
    const yr  = d.getFullYear();
    return `${dd} ${mm} ${yr}`;
  };

  /* ── Exam Card ─────────────────────────────────────────────────── */
  const renderCard = ({ item, index }) => {
    const cfg   = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
    const color = ICON_COLORS[index % ICON_COLORS.length];
    const icon  = item.status === 'completed' ? 'check-circle' : 'file-text';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('ExamDetails', { examId: item._id })}
      >
        {/* Icon box */}
        <View style={[styles.cardIcon, { borderColor: color + '60', backgroundColor: color + '18' }]}>
          <Feather name={icon} size={26} color={color} />
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.cardStatus, { color: cfg.color }]}>
              {item.status === 'completed' && !item.isResultPublished ? 'Publish Pending' : cfg.label}
            </Text>
          </View>

          <View style={styles.cardMeta}>
            <Feather name="clock" size={13} color="#64748b" />
            <Text style={styles.cardMetaText}>
              {item.totalQuestions || item.questions?.length || 0} Questions{'  •  '}{item.duration || 0} Min
            </Text>
          </View>

          <View style={[styles.cardRow, { marginTop: 4 }]}>
            <Text style={styles.cardDate}>Created on {formatDate(item.createdAt || item.date)}</Text>
          </View>
        </View>

        <Feather name="chevron-right" size={20} color="#334155" />
      </TouchableOpacity>
    );
  };

  /* ── Empty State ───────────────────────────────────────────────── */
  const renderEmpty = () => (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Feather name="inbox" size={36} color="#8b5cf6" />
      </View>
      <Text style={styles.emptyTitle}>No exams found!</Text>
      <Text style={styles.emptySub}>Looks like you haven't created any exams yet.</Text>
    </View>
  );

  /* ── Bottom Banner ─────────────────────────────────────────────── */
  const renderFooter = () => (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>Can't find your exam?</Text>
        <Text style={styles.bannerSub}>Check back later or create a new exam.</Text>
      </View>
      <View style={styles.bannerGraphic}>
        <Feather name="clipboard" size={40} color="#8b5cf6" />
        <View style={styles.bannerStar1}><Feather name="star" size={10} color="#a78bfa" /></View>
        <View style={styles.bannerStar2}><Feather name="star" size={14} color="#a78bfa" /></View>
      </View>
    </View>
  );

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" />
      
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          All <Text style={{ color: '#b026ff', textShadowColor: 'rgba(176,38,255,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 6 }}>Exams</Text>
        </Text>

        <TouchableOpacity 
          style={[styles.filterBtn, !showFilters && { backgroundColor: 'rgba(176,38,255,0.15)', borderColor: 'rgba(176,38,255,0.4)', borderWidth: 1 }]} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Feather name="filter" size={18} color={!showFilters ? '#b026ff' : colors.subText} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Select an exam to view detailed results</Text>

      {showFilters && (
        <>
          {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exams..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.tab, activeFilter === f && styles.tabActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.tabText, activeFilter === f && styles.tabTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* ── Class Filter Tabs ── */}
      <View style={[styles.tabsWrap, { marginTop: 0, marginBottom: 15 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, { backgroundColor: colors.card, borderColor: colors.border }, selectedClass === 'All Classes' && { backgroundColor: 'rgba(0,242,254,0.15)', borderColor: 'rgba(0,242,254,0.4)', borderWidth: 1 }]}
              onPress={() => setSelectedClass('All Classes')}
            >
              <Text style={[styles.tabText, selectedClass === 'All Classes' && { color: '#00f2fe', textShadowColor: 'rgba(0,242,254,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 4 }]}>All Classes</Text>
            </TouchableOpacity>
            {classes.map((cls) => (
              <TouchableOpacity
                key={cls._id}
                style={[styles.tab, { backgroundColor: colors.card, borderColor: colors.border }, selectedClass === cls.name && { backgroundColor: 'rgba(0,242,254,0.15)', borderColor: 'rgba(0,242,254,0.4)', borderWidth: 1 }]}
                onPress={() => setSelectedClass(cls.name)}
              >
                <Text style={[styles.tabText, selectedClass === cls.name && { color: '#00f2fe', textShadowColor: 'rgba(0,242,254,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 4 }]}>{cls.name}</Text>
              </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      </>
      )}

      {/* ── List ── */}
      {(isLoading || refreshing) ? (
        <View style={styles.list}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} width="100%" height={90} borderRadius={16} style={{ marginBottom: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredExams}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={filteredExams.length > 0 ? renderFooter : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
          }
        />
      )}
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('CreateExam')}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={28} color={colors.text} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════ */
const getStyles = (colors) => ({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginLeft: 2,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },

  subtitle: {
    fontSize: 14,
    color: colors.subText,
    paddingHorizontal: 20,
    marginBottom: 18,
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: colors.cardAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#e2e8f0',
  },

  /* Tabs */
  tabsWrap: {
    marginBottom: 18,
  },
  tabs: {
    paddingHorizontal: 18,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: colors.cardAlt,
  },
  tabActive: {
    backgroundColor: 'rgba(0,242,254,0.15)',
    borderColor: 'rgba(0,242,254,0.4)',
  },
  tabText: {
    color: colors.subText,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00f2fe',
    textShadowColor: 'rgba(0,242,254,0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 4,
  },

  /* List */
  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Card */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  cardIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardMetaText: {
    fontSize: 12,
    color: colors.subText,
    marginLeft: 5,
  },
  cardDate: {
    fontSize: 12,
    color: '#475569',
  },

  /* Empty */
  emptyBox: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 10 : 20,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(139,92,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.subText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  emptyBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },

  /* Banner */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bannerBg,
    borderRadius: 20,
    padding: 22,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 5,
  },
  bannerSub: {
    fontSize: 13,
    color: colors.subText,
    lineHeight: 19,
  },
  bannerGraphic: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  bannerStar1: {
    position: 'absolute',
    top: -4,
    left: -8,
  },
  bannerStar2: {
    position: 'absolute',
    bottom: -4,
    right: -12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 999
  }
});
