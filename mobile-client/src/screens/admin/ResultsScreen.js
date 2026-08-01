import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList, LayoutAnimation, UIManager, Platform , StatusBar} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { getAdminExams } from '../../redux/slices/adminSlice';
import api from '../../services/api';
import { getTeacherResults, clearResults } from '../../redux/slices/resultSlice';



export default function ResultsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { exams } = useSelector(state => state.admin);
  const { results: rawResults, isLoading } = useSelector(state => state.results);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const results = Array.isArray(rawResults) ? rawResults : [];
  
  const initialExamId = route?.params?.initialExamId || '';
  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [modalVisible, setModalVisible] = useState(false);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [isFetchingClasses, setIsFetchingClasses] = useState(false);

  useEffect(() => {
    if (route?.params?.initialExamId) {
      dispatch(clearResults());
      setSelectedExamId(route.params.initialExamId);
    }
  }, [route?.params?.initialExamId, dispatch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(getAdminExams());
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

  const filteredExams = React.useMemo(() => {
    if (!exams) return [];
    if (selectedClass === 'All') return exams;
    return exams.filter(exam => {
      if (!exam.classGroup) return false;
      const groups = exam.classGroup.split(',').map(s => s.trim());
      return groups.includes(selectedClass);
    });
  }, [exams, selectedClass]);

  useEffect(() => {
    if (selectedExamId) {
      dispatch(clearResults());
      dispatch(getTeacherResults(selectedExamId));
    }
  }, [dispatch, selectedExamId]);

  const selectedExamDetails = exams?.find(e => e._id === selectedExamId);

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    cardBg: isDarkMode ? '#1e293b' : 'white',
    cardBorder: isDarkMode ? '#334155' : '#e2e8f0',
    headerTitle: isDarkMode ? 'white' : '#1e293b',
    btnBg: isDarkMode ? '#334155' : '#f1f5f9',
    btnText: isDarkMode ? 'white' : '#475569',
    primary: '#3b82f6',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {!selectedExamId ? (
        <View style={{ flex: 1 }}>
          <View style={styles.headerRowOverview}>
            <TouchableOpacity onPress={() => navigation.navigate('AdminTabs', {screen: 'Home'})} style={styles.backBtnOverview}>
              <Feather name="arrow-left" size={24} color={colors.headerTitle} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.title, { color: colors.headerTitle }]}>Results Overview</Text>
              <Text style={[styles.subtitle, { color: colors.subText }]}>View all results across the platform</Text>
            </View>
          </View>

          <View style={styles.selectorContainer}>
            <Text style={[styles.label, { color: colors.subText }]}>Select Exam:</Text>
            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} onPress={() => setModalVisible(true)}>
              <Text style={[styles.selectorText, { color: colors.text }]}>Select an exam...</Text>
              <Feather name="chevron-down" size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>All Exams Overview</Text>

            {/* Class Filter */}
            <View style={styles.filterWrapper}>
              {isFetchingClasses ? (
                <ActivityIndicator size="small" color="#3b82f6" style={{ margin: 10 }} />
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

            {filteredExams?.length > 0 ? filteredExams.map(exam => (
              <TouchableOpacity 
                key={exam._id} 
                style={[styles.overviewCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSelectedExamId(exam._id);
                }}
              >
                <View style={styles.overviewHeader}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.overviewTitle, { color: colors.text }]}>{exam.title}</Text>
                    <Text style={{ color: colors.subText, fontSize: 12 }}>{exam.subject} • {exam.createdBy?.name || 'Unknown'}</Text>
                  </View>
                  <View style={[styles.badge, exam.status === 'published' ? styles.badgeInfo : exam.status === 'completed' ? styles.badgeSuccess : styles.badgeSec]}>
                    <Text style={[styles.badgeText, exam.status === 'published' ? styles.badgeTextInfo : exam.status === 'completed' ? styles.badgeTextSuccess : styles.badgeTextSec]}>
                      {exam.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.overviewStatsRow}>
                  <View style={styles.overviewStat}>
                    <Text style={[styles.overviewStatVal, { color: colors.text }]}>{exam.totalSubmitted || 0}</Text>
                    <Text style={[styles.overviewStatLbl, { color: colors.subText }]}>Submissions</Text>
                  </View>
                  <View style={styles.overviewStat}>
                    <Text style={[styles.overviewStatVal, { color: colors.text }]}>
                      {exam.totalSubmitted > 0 ? Math.round((exam.totalPassed / exam.totalSubmitted) * 100) + '%' : '-'}
                    </Text>
                    <Text style={[styles.overviewStatLbl, { color: colors.subText }]}>Pass Rate</Text>
                  </View>
                  <View style={styles.overviewStat}>
                    <Text style={[styles.overviewStatVal, { color: colors.text }]}>
                      {exam.totalSubmitted > 0 ? Math.round(((exam.averageScore || 0) / (exam.totalQuestions || exam.maxMarks || 100)) * 100) + '%' : '-'}
                    </Text>
                    <Text style={[styles.overviewStatLbl, { color: colors.subText }]}>Avg Score</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconBg, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
                  <Feather name="pie-chart" size={32} color={colors.subText} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No exams available</Text>
                <Text style={[styles.emptySubText, { color: colors.subText }]}>Exams and their results will appear here once they are created.</Text>
              </View>
            )}
          </ScrollView>

          <Modal visible={modalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Exam</Text>
                <FlatList
                  data={filteredExams}
                  keyExtractor={item => item._id}
                  renderItem={({item}) => (
                    <TouchableOpacity 
                      style={[styles.modalItem, { borderBottomColor: colors.cardBorder }]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setSelectedExamId(item._id);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={[styles.modalItemText, { color: colors.text }]}>{item.title}</Text>
                      <Text style={{ color: colors.subText, fontSize: 12 }}>By {item.createdBy?.name || 'Unknown'}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.btnBg }]} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.closeBtnText, { color: colors.btnText }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.headerDetails, { backgroundColor: colors.cardBg, borderBottomColor: colors.cardBorder }]}>
            <View style={styles.headerRow}>
              <TouchableOpacity 
                onPress={() => {
                  if (route?.params?.initialExamId) {
                    navigation.goBack();
                  } else {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedExamId('');
                  }
                }} 
                style={styles.backBtn}
              >
                <Feather name="arrow-left" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.titleDetails, { color: colors.text }]} numberOfLines={1}>{selectedExamDetails?.title}</Text>
            </View>
            
            <View style={styles.actionRow}>
              <View style={styles.subBadge}>
                <Text style={styles.subBadgeText}>Submissions: {results.length}</Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
            {isLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 }}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={{ marginTop: 15, color: colors.subText, fontSize: 16 }}>Loading results...</Text>
              </View>
            ) : results && results.length > 0 ? (
              <>
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.statLabel, { color: colors.subText }]}>Passed</Text>
                    <Text style={[styles.statValue, { color: colors.success }]}>{results.filter(r => r.isPassed).length}</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.statLabel, { color: colors.subText }]}>Failed</Text>
                    <Text style={[styles.statValue, { color: colors.danger }]}>{results.filter(r => !r.isPassed).length}</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.statLabel, { color: colors.subText }]}>Cheating Flag</Text>
                    <Text style={[styles.statValue, { color: colors.warning }]}>{results.filter(r => r.tabSwitches > 0).length}</Text>
                  </View>
                </View>

                <View style={[styles.listContainerDetails, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.sectionTitle, { color: colors.success }]}>✅ Passing Students</Text>
                  {results.filter(r => r.isPassed).map((r, i) => (
                    <View key={r._id} style={[styles.studentRow, i !== results.filter(v => v.isPassed).length - 1 && { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                      <View>
                        <Text style={[styles.studentName, { color: colors.text }]}>{r.studentId?.name || 'Unknown'}</Text>
                        <Text style={[styles.studentEmail, { color: colors.subText }]}>{r.studentId?.email}</Text>
                      </View>
                      <Text style={[styles.studentScore, { color: colors.success }]}>{r.percentage?.toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.listContainerDetails, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.sectionTitle, { color: colors.danger }]}>❌ Failing Students</Text>
                  {results.filter(r => !r.isPassed).map((r, i) => (
                    <View key={r._id} style={[styles.studentRow, i !== results.filter(v => !v.isPassed).length - 1 && { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                      <View>
                        <Text style={[styles.studentName, { color: colors.text }]}>{r.studentId?.name || 'Unknown'}</Text>
                        <Text style={[styles.studentEmail, { color: colors.subText }]}>{r.studentId?.email}</Text>
                      </View>
                      <Text style={[styles.studentScore, { color: colors.danger }]}>{r.percentage?.toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>

                {results.some(r => r.tabSwitches > 0) && (
                  <View style={[styles.listContainerDetails, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.sectionTitle, { color: colors.warning }]}>⚠️ Flagged for Cheating</Text>
                    {results.filter(r => r.tabSwitches > 0).map((r, i) => (
                      <View key={r._id} style={[styles.studentRow, i !== results.filter(v => v.tabSwitches > 0).length - 1 && { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <View>
                          <Text style={[styles.studentName, { color: colors.text }]}>{r.studentId?.name || 'Unknown'}</Text>
                          <Text style={[styles.studentEmail, { color: colors.subText }]}>{r.studentId?.email || '—'}</Text>
                          <Text style={[styles.studentEmail, { color: colors.warning, fontSize: 11, marginTop: 2 }]}>Switched Tabs / Left Window</Text>
                        </View>
                        <Text style={[styles.studentScore, { color: colors.warning }]}>{r.tabSwitches} times</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconBg, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
                  <Feather name="users" size={32} color={colors.subText} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No submissions yet</Text>
                <Text style={[styles.emptySubText, { color: colors.subText }]}>Students have not submitted this exam yet.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15 },
  headerRowOverview: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15 },
  backBtnOverview: { marginRight: 15, padding: 5 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  
  headerDetails: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, borderBottomWidth: 1 },
  titleDetails: { fontSize: 22, fontWeight: 'bold', flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backBtn: { marginRight: 15, padding: 5 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  subBadge: { backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  subBadgeText: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold' },

  selectorContainer: { paddingHorizontal: 20, marginBottom: 15 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '500' },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, padding: 15 },
  selectorText: { fontSize: 16 },

  content: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 15, marginTop: 10 },
  
  overviewCard: { marginHorizontal: 20, marginBottom: 15, borderRadius: 16, padding: 20, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  overviewTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeInfo: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  badgeSec: { backgroundColor: 'rgba(100, 116, 139, 0.1)' },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeTextInfo: { color: '#3b82f6' },
  badgeTextSuccess: { color: '#10b981' },
  badgeTextSec: { color: '#64748b' },
  
  overviewStatsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 12 },
  overviewStat: { alignItems: 'center' },
  overviewStatVal: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  overviewStatLbl: { fontSize: 12 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
  statCard: { width: '31%', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  statLabel: { fontSize: 12, marginBottom: 8, fontWeight: '500' },
  statValue: { fontSize: 24, fontWeight: 'bold' },

  listContainerDetails: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20, borderWidth: 1 },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  studentName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  studentEmail: { fontSize: 12 },
  studentScore: { fontSize: 18, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 20 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  emptySubText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%', borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1 },
  modalItemText: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  closeBtn: { marginTop: 20, padding: 15, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 16, fontWeight: 'bold' },

  filterWrapper: { marginBottom: 15 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  filterPillActive: { backgroundColor: '#3b82f6' },
  filterPillText: { fontSize: 13, fontWeight: '600' },
  filterPillTextActive: { color: 'white' },
});
