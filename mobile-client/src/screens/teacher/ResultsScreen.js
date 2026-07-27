import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import Skeleton from '../../components/Skeleton';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { getTeacherExams } from '../../redux/slices/examSlice';
import { getTeacherResults, publishResults } from '../../redux/slices/resultSlice';
import api from '../../services/api';

const STATUS_CONFIG = {
  published: { label: 'Published', color: '#10b981' },
  ongoing:   { label: 'Ongoing',   color: '#f59e0b' },
  completed: { label: 'Completed', color: '#22c55e' },
  draft:     { label: 'Draft',     color: '#94a3b8' },
};

const ICON_COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e'];

export default function ResultsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { theme } = useSelector(s => s.ui || { theme: 'dark' });
  const { exams = [] }                          = useSelector((s) => s.exams);
  const { results: rawResults, isLoading }      = useSelector((s) => s.results);
  const results                                  = Array.isArray(rawResults) ? rawResults : [];

  
  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    cardAlt: isDarkMode ? '#151e2d' : '#f1f5f9',
    border: isDarkMode ? '#334155' : '#e2e8f0',
  };
  const styles = getStyles(colors);
  
  const [selectedExamId, setSelectedExamId]     = useState('');
  const [modalVisible, setModalVisible]         = useState(false);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [isFetchingClasses, setIsFetchingClasses] = useState(false);

  useEffect(() => { 
    dispatch(getTeacherExams()); 
    fetchClasses();
  }, [dispatch]);

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

  useEffect(() => {
    if (selectedExamId) dispatch(getTeacherResults(selectedExamId));
  }, [dispatch, selectedExamId]);

  const filteredExams = React.useMemo(() => {
    if (!exams) return [];
    if (selectedClass === 'All Classes') return exams;
    return exams.filter(exam => {
      if (!exam.classGroup) return false;
      const groups = exam.classGroup.split(',').map(s => s.trim());
      return groups.includes(selectedClass);
    });
  }, [exams, selectedClass]);

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  const formatDate = (raw) => {
    if (!raw) return 'N/A';
    const d  = new Date(raw);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = d.toLocaleString('en-US', { month: 'long' });
    return `${dd} ${mm} ${d.getFullYear()}`;
  };

  const passCount  = results.filter((r) => r.isPassed).length;
  const failCount  = results.filter((r) => !r.isPassed).length;
  const flagCount  = results.filter((r) => r.isCheated || r.tabSwitches > 0).length;
  const passRate   = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;

  /* ────────────────────────────────────────────────────────────────
     VIEW 1 – Exam overview list (no exam selected)
  ──────────────────────────────────────────────────────────────── */
  if (!selectedExamId) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation?.navigate('Home')}
                style={{ marginRight: 10, padding: 4 }}
              >
                <Feather name="arrow-left" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                Exam <Text style={{ color: '#a78bfa' }}>Results</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <Feather name="filter" size={18} color={colors.subText} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSub}>Select an exam to view student results</Text>
        </View>

        {/* Select Exam Button */}
        <TouchableOpacity
          style={styles.selectorBtn}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.selectorBtnLeft}>
            <View style={styles.selectorIcon}>
              <Feather name="book-open" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.selectorText}>
              {selectedExam ? selectedExam.title : 'Select an exam…'}
            </Text>
          </View>
          <Feather name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>

        {/* ── Class Filter Tabs ── */}
        <View style={{ marginBottom: 15 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            <TouchableOpacity
              style={[styles.tab, { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }, selectedClass === 'All Classes' && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
              onPress={() => setSelectedClass('All Classes')}
            >
              <Text style={[{ color: '#cbd5e1', fontSize: 13, fontWeight: '600' }, selectedClass === 'All Classes' && { color: 'white' }]}>All Classes</Text>
            </TouchableOpacity>
            {classes.map((cls) => (
              <TouchableOpacity
                key={cls._id}
                style={[styles.tab, { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }, selectedClass === cls.name && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
                onPress={() => setSelectedClass(cls.name)}
              >
                <Text style={[{ color: '#cbd5e1', fontSize: 13, fontWeight: '600' }, selectedClass === cls.name && { color: 'white' }]}>{cls.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Exam Cards */}
        <FlatList
          data={filteredExams}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={36} color="#8b5cf6" />
              <Text style={styles.emptyTitle}>No exams yet</Text>
              <Text style={styles.emptySub}>Create an exam to start seeing student results.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const cfg   = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
            const color = ICON_COLORS[index % ICON_COLORS.length];
            return (
              <TouchableOpacity
                style={styles.examCard}
                activeOpacity={0.75}
                onPress={() => setSelectedExamId(item._id)}
              >
                <View style={[styles.examCardIcon, { borderColor: color + '60', backgroundColor: color + '18' }]}>
                  <Feather name="file-text" size={24} color={color} />
                </View>

                <View style={styles.examCardBody}>
                  <View style={styles.examCardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.examCardTitle} numberOfLines={1}>{item.title}</Text>
                    </View>
                    <Text style={[styles.examCardStatus, { color: cfg.color }]}>
                      {item.status === 'completed' && !item.isResultPublished ? 'Publish Pending' : cfg.label}
                    </Text>
                  </View>

                  <View style={styles.examCardStats}>
                    <View style={styles.examStat}>
                      <Text style={styles.examStatVal}>{item.totalSubmitted || 0}</Text>
                      <Text style={styles.examStatLbl}>Submissions</Text>
                    </View>
                    <View style={styles.examStatDivider} />
                    <View style={styles.examStat}>
                      <Text style={[styles.examStatVal, { color: '#10b981' }]}>
                        {item.totalSubmitted > 0
                          ? Math.round((item.totalPassed / item.totalSubmitted) * 100) + '%'
                          : '—'}
                      </Text>
                      <Text style={styles.examStatLbl}>Pass Rate</Text>
                    </View>
                    <View style={styles.examStatDivider} />
                    <View style={styles.examStat}>
                      <Text style={[styles.examStatVal, { color: '#a78bfa' }]}>
                        {item.totalSubmitted > 0
                          ? ((item.averageScore || 0) / (item.maxMarks || 100) * 100).toFixed(0) + '%'
                          : '—'}
                      </Text>
                      <Text style={styles.examStatLbl}>Avg Score</Text>
                    </View>
                  </View>

                  <Text style={styles.examCardDate}>Created on {formatDate(item.createdAt || item.date)}</Text>
                </View>

                <Feather name="chevron-right" size={20} color="#334155" />
              </TouchableOpacity>
            );
          }}
        />

        {/* Exam picker modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Select Exam</Text>
              <FlatList
                data={filteredExams}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => { setSelectedExamId(item._id); setModalVisible(false); }}
                  >
                    <View style={styles.modalItemIcon}>
                      <Feather name="file-text" size={18} color="#8b5cf6" />
                    </View>
                    <Text style={styles.modalItemText}>{item.title}</Text>
                    <Feather name="chevron-right" size={16} color="#334155" />
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  /* ────────────────────────────────────────────────────────────────
     VIEW 2 – Student results for selected exam
  ──────────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setSelectedExamId('')}
          >
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedExam?.title}</Text>
          </View>
          
          {!selectedExam?.isResultPublished ? (
            <TouchableOpacity
              style={styles.publishBtn}
              onPress={() => {
                dispatch(publishResults(selectedExamId)).then((res) => {
                  if (!res.error) dispatch(getTeacherExams());
                });
              }}
            >
              <Text style={styles.publishBtnText}>Publish</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.publishedBadge}>
              <Feather name="check-circle" size={14} color="#10b981" />
              <Text style={styles.publishedText}>Published</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSub}>{results.length} student{results.length !== 1 ? 's' : ''} submitted</Text>
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={100} borderRadius={16} style={{ marginBottom: 15 }} />
          ))}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>

          {/* ── Stat Cards ── */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderColor: '#10b98130' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#10b98118' }]}>
                <Feather name="check-circle" size={20} color="#10b981" />
              </View>
              <Text style={styles.statVal}>{passCount}</Text>
              <Text style={styles.statLbl}>Passed</Text>
            </View>
            <View style={[styles.statCard, { borderColor: '#ef444430' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#ef444418' }]}>
                <Feather name="x-circle" size={20} color="#ef4444" />
              </View>
              <Text style={styles.statVal}>{failCount}</Text>
              <Text style={styles.statLbl}>Failed</Text>
            </View>
            <View style={[styles.statCard, { borderColor: '#f59e0b30' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#f59e0b18' }]}>
                <Feather name="alert-triangle" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.statVal}>{flagCount}</Text>
              <Text style={styles.statLbl}>Flagged</Text>
            </View>
            <View style={[styles.statCard, { borderColor: '#8b5cf630' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#8b5cf618' }]}>
                <Feather name="percent" size={20} color="#8b5cf6" />
              </View>
              <Text style={styles.statVal}>{passRate}%</Text>
              <Text style={styles.statLbl}>Pass Rate</Text>
            </View>
          </View>

          {results.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="users" size={36} color="#8b5cf6" />
              <Text style={styles.emptyTitle}>No submissions yet</Text>
              <Text style={styles.emptySub}>No students have submitted this exam yet.</Text>
            </View>
          ) : (
            <>
              {/* ── Passing Students ── */}
              {passCount > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionDot, { backgroundColor: '#10b981' }]} />
                    <Text style={[styles.sectionTitle, { color: '#10b981' }]}>Passing Students</Text>
                    <Text style={styles.sectionCount}>{passCount}</Text>
                  </View>
                  {results.filter((r) => r.isPassed).map((r) => (
                    <View key={r._id} style={styles.studentCard}>
                      <View style={styles.studentAvatar}>
                        <Text style={styles.studentAvatarText}>
                          {(r.studentId?.name || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{r.studentId?.name || 'Unknown'}</Text>
                        <Text style={styles.studentEmail}>{r.studentId?.email || '—'}</Text>
                      </View>
                      <View style={styles.scoreBox}>
                        <Text style={[styles.scoreText, { color: '#10b981' }]}>
                          {r.percentage?.toFixed(1)}%
                        </Text>
                        <View style={[styles.scorePill, { backgroundColor: '#10b98118' }]}>
                          <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700' }}>PASS</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* ── Failing Students ── */}
              {failCount > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Failing Students</Text>
                    <Text style={styles.sectionCount}>{failCount}</Text>
                  </View>
                  {results.filter((r) => !r.isPassed).map((r) => (
                    <View key={r._id} style={styles.studentCard}>
                      <View style={[styles.studentAvatar, { backgroundColor: '#ef444420' }]}>
                        <Text style={[styles.studentAvatarText, { color: '#ef4444' }]}>
                          {(r.studentId?.name || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{r.studentId?.name || 'Unknown'}</Text>
                        <Text style={styles.studentEmail}>{r.studentId?.email || '—'}</Text>
                      </View>
                      <View style={styles.scoreBox}>
                        <Text style={[styles.scoreText, { color: '#ef4444' }]}>
                          {r.percentage?.toFixed(1)}%
                        </Text>
                        <View style={[styles.scorePill, { backgroundColor: '#ef444418' }]}>
                          <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>FAIL</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* ── Flagged ── */}
              {flagCount > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>Flagged for Cheating</Text>
                    <Text style={styles.sectionCount}>{flagCount}</Text>
                  </View>
                  {results.filter((r) => r.isCheated || r.tabSwitches > 0).map((r) => (
                    <View key={r._id} style={styles.studentCard}>
                      <View style={[styles.studentAvatar, { backgroundColor: '#f59e0b20' }]}>
                        <Text style={[styles.studentAvatarText, { color: '#f59e0b' }]}>
                          {(r.studentId?.name || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{r.studentId?.name || 'Unknown'}</Text>
                        <Text style={styles.studentEmail}>Switched tabs / left window</Text>
                      </View>
                      <View style={styles.scoreBox}>
                        <Text style={[styles.scoreText, { color: '#f59e0b' }]}>
                          {r.isCheated ? 'Cheated' : `${r.tabSwitches}×`}
                        </Text>
                        <View style={[styles.scorePill, { backgroundColor: '#f59e0b18' }]}>
                          <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '700' }}>FLAG</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Header */
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  headerSub: {
    fontSize: 14,
    color: colors.subText,
    marginBottom: 8,
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
  publishBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  publishBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  publishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98115',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  publishedText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Selector */
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardAlt,
    marginHorizontal: 18,
    marginBottom: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectorIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: colors.subText,
    fontWeight: '500',
  },

  /* List */
  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  /* Exam Card (overview) */
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  examCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  examCardBody: {
    flex: 1,
  },
  examCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  examCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  examCardStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  examCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  examStat: {
    alignItems: 'center',
    flex: 1,
  },
  examStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  examStatLbl: {
    fontSize: 11,
    color: colors.subText,
  },
  examStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.card,
  },
  examCardDate: {
    fontSize: 12,
    color: '#475569',
  },

  /* Empty */
  emptyBox: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.subText,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  statLbl: {
    fontSize: 10,
    color: colors.subText,
    fontWeight: '500',
    textAlign: 'center',
  },

  /* Section */
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.subText,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },

  /* Student Card */
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b5cf620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8b5cf6',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  studentEmail: {
    fontSize: 12,
    color: colors.subText,
  },
  scoreBox: {
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.cardAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  modalItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalCancel: {
    marginTop: 16,
    padding: 14,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
  },
  modalCancelText: {
    color: colors.subText,
    fontWeight: '700',
    fontSize: 15,
  },
});
