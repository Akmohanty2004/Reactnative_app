import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExamById, publishExamResults } from '../../redux/slices/examSlice';
import { getTeacherResults } from '../../redux/slices/resultSlice';
import Toast from 'react-native-toast-message';

export default function ExamDetailsScreen({ route, navigation }) {
  const { examId } = route.params;
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  
  const { currentExam } = useSelector(state => state.exams);
  const { results: rawResults } = useSelector(state => state.results);
  const results = Array.isArray(rawResults) ? rawResults : [];

  useEffect(() => {
    if (examId) {
      dispatch(getExamById(examId));
      dispatch(getTeacherResults(examId));
    }
  }, [dispatch, examId]);

  const handlePublishResults = () => {
    dispatch(publishExamResults(examId)).then((res) => {
      if (!res.error) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Results published successfully!' });
      }
    });
  };

  if (!currentExam) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  const exam = currentExam;
  const now = new Date();
  const examDate = new Date(exam.date);
  const [endHours, endMinutes] = (exam.endTime || '23:59').split(':');
  examDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
  const isExamEnded = now >= examDate;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{exam.title}</Text>
          <Text style={styles.subtitle}>{exam.subject} • {exam.status}</Text>
        </View>
      </View>

      <View style={styles.actionCard}>
        {exam.status !== 'draft' && !exam.isResultPublished ? (
          <TouchableOpacity 
            style={[styles.primaryBtn, !isExamEnded && { opacity: 0.5 }]} 
            onPress={isExamEnded ? handlePublishResults : null}
            disabled={!isExamEnded}
          >
            <Text style={styles.primaryBtnText}>Publish Results</Text>
          </TouchableOpacity>
        ) : exam.isResultPublished ? (
          <View style={styles.badgeSuccess}>
            <Text style={styles.badgeSuccessText}>Results Published</Text>
          </View>
        ) : (
          <Text style={styles.draftText}>This exam is still a draft.</Text>
        )}
        {!isExamEnded && exam.status !== 'draft' && !exam.isResultPublished && (
          <Text style={styles.helperText}>Results can be published after the exam ends.</Text>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Questions</Text>
          <Text style={styles.statValue}>{exam.totalQuestions || 0}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>{exam.duration} min</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Students</Text>
          <Text style={styles.statValue}>{exam.totalSubmitted || 0}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Passing Marks</Text>
          <Text style={styles.statValue}>{exam.passingMarks || 0}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exam Details</Text>
        <Text style={styles.detailRow}><Text style={styles.bold}>Date:</Text> {new Date(exam.date).toLocaleDateString()}</Text>
        <Text style={styles.detailRow}><Text style={styles.bold}>Time:</Text> {exam.startTime} - {exam.endTime}</Text>
        <Text style={styles.detailRow}><Text style={styles.bold}>Description:</Text> {exam.description || 'N/A'}</Text>
        <Text style={styles.detailRow}><Text style={styles.bold}>Instructions:</Text> {exam.instructions || 'N/A'}</Text>
      </View>

      {results && results.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Results Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Passed</Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>{results.filter(r => r.isPassed).length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Failed</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{results.filter(r => !r.isPassed).length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cheating</Text>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{results.filter(r => r.tabSwitches > 0).length}</Text>
            </View>
          </View>
        </View>
      )}

      {results && results.some(r => r.tabSwitches > 0) && (
        <View style={[styles.card, { borderColor: '#f59e0b', borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>⚠️ Flagged for Cheating</Text>
          {results.filter(r => r.tabSwitches > 0).map(r => (
            <View key={r._id} style={styles.studentRow}>
              <View>
                <Text style={styles.studentName}>{r.studentId?.name || 'Unknown'}</Text>
                <Text style={styles.studentEmail}>{r.studentId?.email || '—'}</Text>
                <Text style={[styles.studentEmail, { color: '#f59e0b', fontSize: 11, marginTop: 2 }]}>Switched Tabs / Left Window</Text>
              </View>
              <Text style={[styles.studentScore, { color: '#f59e0b' }]}>{r.tabSwitches} times</Text>
            </View>
          ))}
        </View>
      )}

      {results && results.length > 0 && (
        <>
          <View style={[styles.card, { borderColor: '#10b981', borderWidth: 1 }]}>
            <Text style={[styles.cardTitle, { color: '#10b981' }]}>✅ Passing Students</Text>
            {results.filter(r => r.isPassed).length > 0 ? (
              results.filter(r => r.isPassed).map(r => (
                <View key={r._id} style={styles.studentRow}>
                  <Text style={styles.studentName}>{r.studentId?.name || 'Unknown'}</Text>
                  <Text style={[styles.studentScore, { color: '#10b981' }]}>{r.percentage?.toFixed(1)}%</Text>
                </View>
              ))
            ) : <Text style={styles.emptyText}>No students passed.</Text>}
          </View>

          <View style={[styles.card, { borderColor: '#ef4444', borderWidth: 1 }]}>
            <Text style={[styles.cardTitle, { color: '#ef4444' }]}>❌ Failing Students</Text>
            {results.filter(r => !r.isPassed).length > 0 ? (
              results.filter(r => !r.isPassed).map(r => (
                <View key={r._id} style={styles.studentRow}>
                  <Text style={styles.studentName}>{r.studentId?.name || 'Unknown'}</Text>
                  <Text style={[styles.studentScore, { color: '#ef4444' }]}>{r.percentage?.toFixed(1)}%</Text>
                </View>
              ))
            ) : <Text style={styles.emptyText}>No students failed.</Text>}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 20, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { marginRight: 15 },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#94a3b8', textTransform: 'capitalize' },
  actionCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  primaryBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  badgeSuccess: { backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  badgeSuccessText: { color: '#10b981', fontWeight: 'bold', fontSize: 16 },
  draftText: { color: '#94a3b8', fontSize: 15 },
  helperText: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 15 },
  detailRow: { color: '#cbd5e1', fontSize: 14, marginBottom: 8, lineHeight: 22 },
  bold: { color: '#94a3b8', fontWeight: 'bold' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4, textTransform: 'uppercase' },
  summaryValue: { fontSize: 24, fontWeight: 'bold' },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  studentName: { color: 'white', fontSize: 15 },
  studentEmail: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  studentScore: { fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic' },
  loadingText: { color: '#94a3b8', marginTop: 10 }
});
