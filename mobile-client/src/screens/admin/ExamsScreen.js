import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, StatusBar, RefreshControl, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAdminExams } from '../../redux/slices/adminSlice';
import { ListSkeleton } from '../../components/SkeletonLoader';
import api from '../../services/api';
import { playRefreshSound } from '../../utils/SoundManager';

export default function ExamsScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const { exams, isLoading } = useSelector(state => state.admin);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });

  const [classes, setClasses] = React.useState([]);
  const [selectedClass, setSelectedClass] = React.useState('All');
  const [isFetchingClasses, setIsFetchingClasses] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  useFocusEffect(
    useCallback(() => {
      dispatch(getAdminExams());
      fetchClasses();
    }, [dispatch])
  );

  const handleRefresh = async () => {
    playRefreshSound();
    setRefreshing(true);
    await dispatch(getAdminExams());
    await fetchClasses();
    setRefreshing(false);
  };

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

  const filteredExams = React.useMemo(() => {
    if (!exams) return [];
    
    return exams.filter(exam => {
      // 1. Search Query filter
      if (searchQuery && !exam.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // 2. Class Group filter
      if (selectedClass !== 'All') {
        if (!exam.classGroup) return false;
        const groups = exam.classGroup.split(',').map(s => s.trim());
        if (!groups.includes(selectedClass)) return false;
      }
      
      return true;
    });
  }, [exams, selectedClass, searchQuery]);

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    cardBg: isDarkMode ? '#1e293b' : 'white',
    cardBorder: isDarkMode ? '#334155' : '#e2e8f0',
    headerTitle: isDarkMode ? 'white' : '#1e293b',
    btnBg: isDarkMode ? '#334155' : '#f1f5f9',
    btnText: isDarkMode ? 'white' : '#475569',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: topPadding + 10, flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginRight: 15 }}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.headerTitle, marginBottom: 0 }]}>All Exams</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>View and manage all exams on the platform</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.btnBg, borderColor: colors.cardBorder }]}>
        <Feather name="search" size={20} color={colors.subText} style={styles.searchIcon} />
        <TextInput 
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search exams by title..."
          placeholderTextColor={colors.subText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x-circle" size={18} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Class Filter */}
      <View style={styles.filterWrapper}>
        {isFetchingClasses ? (
          <ActivityIndicator size="small" color="#6366f1" style={{ margin: 10 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterPill, selectedClass === 'All' ? styles.filterPillActive : { backgroundColor: colors.btnBg }]}
              onPress={() => setSelectedClass('All')}
            >
              <Text style={[styles.filterPillText, selectedClass === 'All' ? styles.filterPillTextActive : { color: colors.subText }]}>All Classes</Text>
            </TouchableOpacity>
            {classes.map(c => (
              <TouchableOpacity
                key={c._id}
                style={[styles.filterPill, selectedClass === c.name ? styles.filterPillActive : { backgroundColor: colors.btnBg }]}
                onPress={() => setSelectedClass(c.name)}
              >
                <Text style={[styles.filterPillText, selectedClass === c.name ? styles.filterPillTextActive : { color: colors.subText }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView 
        style={styles.listContainer} 
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor="#6366f1" 
            colors={['#6366f1', '#4f46e5']} 
          />
        }
      >
        {(isLoading || refreshing) ? (
          <ListSkeleton isDarkMode={isDarkMode} count={4} />
        ) : (
          <>
            {filteredExams?.map(exam => (
          <View key={exam._id} style={[styles.examCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.examHeader}>
              <View style={styles.titleWrapper}>
                <Text style={[styles.examTitle, { color: colors.text }]}>{exam.title}</Text>
                <Text style={[styles.creatorText, { color: colors.subText }]}>By: {exam.createdBy?.name || 'Unknown'}</Text>
              </View>
              <View style={[styles.badge, 
                exam.status === 'published' ? styles.badgeInfo :
                exam.status === 'ongoing' ? styles.badgeWarn :
                exam.status === 'completed' ? styles.badgeSuccess :
                styles.badgeSec
              ]}>
                <Text style={[styles.badgeText, 
                  exam.status === 'published' ? styles.badgeTextInfo :
                  exam.status === 'ongoing' ? styles.badgeTextWarn :
                  exam.status === 'completed' ? styles.badgeTextSuccess :
                  styles.badgeTextSec
                ]}>{exam.status}</Text>
              </View>
            </View>
            
            <View style={styles.examMeta}>
              <View style={styles.metaItem}>
                <Feather name="book" size={14} color={colors.subText} style={{ marginRight: 6 }} />
                <Text style={[styles.metaText, { color: colors.subText }]}>{exam.subject}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="users" size={14} color={colors.subText} style={{ marginRight: 6 }} />
                <Text style={[styles.metaText, { color: colors.subText }]}>{exam.totalSubmitted || 0} Submissions</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('Results', { initialExamId: exam._id })}
            >
              <LinearGradient
                colors={isDarkMode ? ['#4f46e5', '#3730a3'] : ['#6366f1', '#4f46e5']}
                style={styles.actionBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="bar-chart-2" size={16} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>View Results</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}
        {(!filteredExams || filteredExams.length === 0) && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBg, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <Feather name="file-text" size={32} color={colors.subText} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No exams found</Text>
            <Text style={[styles.emptySubText, { color: colors.subText }]}>There are currently no exams available on the platform.</Text>
          </View>
        )}
        </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  listContainer: { paddingHorizontal: 20 },
  examCard: { borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 1, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  examHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  titleWrapper: { flex: 1, marginRight: 15 },
  examTitle: { fontSize: 19, fontWeight: '800', marginBottom: 6, letterSpacing: 0.2 },
  creatorText: { fontSize: 13 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeInfo: { backgroundColor: 'rgba(59,130,246,0.1)' },
  badgeTextInfo: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeWarn: { backgroundColor: 'rgba(245,158,11,0.1)' },
  badgeTextWarn: { color: '#f59e0b', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeSuccess: { backgroundColor: 'rgba(16,185,129,0.1)' },
  badgeTextSuccess: { color: '#10b981', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeSec: { backgroundColor: 'rgba(148,163,184,0.1)' },
  badgeTextSec: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  examMeta: { marginBottom: 18, flexDirection: 'row', gap: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, fontWeight: '500' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, alignSelf: 'flex-start', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  actionBtnText: { fontWeight: 'bold', fontSize: 14, color: 'white' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  filterWrapper: { marginBottom: 15 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  filterPillActive: { backgroundColor: '#6366f1' },
  filterPillText: { fontSize: 13, fontWeight: '600' },
  filterPillTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    paddingHorizontal: 15,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
});
