import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, RefreshControl, Animated , Platform, StatusBar} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LineChart } from 'react-native-chart-kit';
import { getStudentResults } from '../../redux/slices/resultSlice';
import BouncyTouchable from '../../components/BouncyTouchable';

const { width } = Dimensions.get('window');

export default function ResultsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { results: rawResults } = useSelector(state => state.results);
  
  const [sortAscending, setSortAscending] = useState(false);
  const sortedResults = [...(rawResults || [])].sort((a, b) => {
    if (sortAscending) {
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    }
    return new Date(b.submittedAt) - new Date(a.submittedAt);
  });
  const [showAllResults, setShowAllResults] = useState(false);
  const results = showAllResults ? sortedResults : sortedResults.slice(0, 5);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const { isLoading } = useSelector(state => state.results);
  const [selectedResult, setSelectedResult] = useState(null);

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    text: isDarkMode ? 'white' : '#050505',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? 'rgba(255,255,255,0.03)' : 'white',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    primary: '#06b6d4',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
  };

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useFocusEffect(
    useCallback(() => {
      dispatch(getStudentResults());
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true })
      ]).start();
      
      return () => { fadeAnim.setValue(0); slideAnim.setValue(30); };
    }, [dispatch])
  );

  const onRefresh = useCallback(() => {
    dispatch(getStudentResults());
  }, [dispatch]);

  const allPublishedResults = rawResults?.filter(r => r.isPublished) || [];

  const stats = {
    total: rawResults?.length || 0,
    passed: allPublishedResults.filter(r => r.isPassed).length || 0,
    failed: allPublishedResults.filter(r => !r.isPassed).length || 0,
    average: allPublishedResults.length > 0 
      ? (allPublishedResults.reduce((a, b) => a + (b.percentage || 0), 0) / allPublishedResults.length).toFixed(1)
      : 0
  };

  const renderSparkline = (color) => (
    <Svg height="40" width="100%" style={{ position: 'absolute', bottom: 0, right: 0, opacity: 0.5 }}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.2" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d="M0 40 Q 20 20, 40 30 T 80 20 T 120 25 T 160 10 L 160 40 Z" fill="url(#grad)" />
      <Path d="M0 40 Q 20 20, 40 30 T 80 20 T 120 25 T 160 10" fill="none" stroke={color} strokeWidth="2" />
    </Svg>
  );

  const chartResults = [...allPublishedResults].sort((a, b) => new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt));

  const perfLabels = chartResults.length > 1
    ? chartResults.map(r => (r.examId?.title || 'Exam').substring(0, 5))
    : chartResults.length === 1
      ? ['Start', (chartResults[0].examId?.title || 'Exam').substring(0, 5)]
      : ['No Data'];

  const perfScores = chartResults.length > 1
    ? chartResults.map(r => r.percentage || 0)
    : chartResults.length === 1
      ? [0, chartResults[0].percentage || 0]
      : [0];

  const chartData = {
    labels: perfLabels,
    datasets: [{ data: perfScores, color: (opacity = 1) => `rgba(6,182,212,${opacity})`, strokeWidth: 2 }]
  };

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: colors.card,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(6,182,212,${opacity})`,
    labelColor: () => colors.subText,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 1,
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.card },
    propsForBackgroundLines: { strokeDasharray: '4', stroke: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Animated.ScrollView 
        contentContainerStyle={styles.content}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        refreshControl={
          <RefreshControl refreshing={isLoading || false} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Custom Header */}
        <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingHorizontal: 0, paddingBottom: 25, flexDirection: 'row', alignItems: 'center' }]}>
          <BouncyTouchable onPress={() => navigation.navigate('Home')} style={{ marginRight: 15 }} activeScale={0.8}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </BouncyTouchable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My <Text style={{color: '#6366f1'}}>Results</Text></Text>
            <Text style={[styles.headerSubtitle, { color: colors.subText }]} numberOfLines={2}>Track your performance and progress</Text>
          </View>
          <BouncyTouchable style={[styles.iconBtn, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : colors.border }]} activeScale={0.8}>
            <Feather name="calendar" size={20} color={colors.text} />
          </BouncyTouchable>
        </View>
        <View style={styles.statsGrid}>
          {/* Total Exams Card */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(56,189,248,0.1)' }]}>
                <Feather name="file-text" size={18} color="#38bdf8" />
              </View>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Total Exams</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statSubline, { color: colors.subText }]}>All Exams Attempted</Text>
            {renderSparkline('#38bdf8')}
          </View>

          {/* Passed Card */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                <Feather name="check-circle" size={18} color={colors.success} />
              </View>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Passed</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.passed}</Text>
            <Text style={[styles.statSubline, { color: colors.subText }]}>Exams Passed</Text>
            {renderSparkline(colors.success)}
          </View>

          {/* Failed Card */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                <Feather name="x-circle" size={18} color={colors.danger} />
              </View>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Failed</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.failed}</Text>
            <Text style={[styles.statSubline, { color: colors.subText }]}>Exams Failed</Text>
            {renderSparkline(colors.danger)}
          </View>

          {/* Average Card */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(6,182,212,0.1)' }]}>
                <Feather name="pie-chart" size={18} color="#6366f1" />
              </View>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Average Score</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.average}%</Text>
            <Text style={[styles.statSubline, { color: colors.subText }]}>Overall Average</Text>
            {renderSparkline('#6366f1')}
          </View>
        </View>

        {/* Performance Overview section */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Overview</Text>
          
          {allPublishedResults.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={chartData}
                width={Math.max(width - 48, perfLabels.length * 75)}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={{ marginVertical: 8, borderRadius: 12 }}
                withInnerLines
                withOuterLines={false}
                fromZero={true}
              />
            </ScrollView>
          ) : (
            <View style={styles.emptyOverviewBox}>
              <View style={styles.illustrationWrapper}>
                 <Feather name="bar-chart-2" size={60} color="#6366f1" />
                 <View style={styles.illustrationLines}>
                   <View style={styles.illLine1} />
                   <View style={styles.illLine2} />
                   <View style={styles.illLine3} />
                 </View>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No performance data yet!</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subText }]}>Once you take exams, your performance summary will appear here.</Text>
            </View>
          )}
        </View>

        <View style={[styles.sectionContainer, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 15 }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginRight: 10 }]}>Recent Exams</Text>
              <TouchableOpacity onPress={() => setSortAscending(!sortAscending)} style={{ padding: 4, backgroundColor: 'rgba(6,182,212,0.1)', borderRadius: 6 }}>
                <Feather name={sortAscending ? "arrow-up" : "arrow-down"} size={16} color="#6366f1" />
              </TouchableOpacity>
            </View>
          {sortedResults.length > 5 && (
            <BouncyTouchable onPress={() => setShowAllResults(!showAllResults)} activeScale={0.9}>
              <Text style={styles.viewAllText}>
                {showAllResults ? 'Show Less' : 'View All'} <Feather name={showAllResults ? "chevron-up" : "chevron-right"} size={14} />
              </Text>
            </BouncyTouchable>
          )}
        </View>
        
        {results?.map((result) => (
          <BouncyTouchable 
            key={result._id} 
            style={[styles.resultCard, { backgroundColor: isDarkMode ? isDarkMode ? '#000000' : '#f8fafc' : '#f8fafc', borderColor: colors.border }]}
            onPress={() => setSelectedResult(result)}
            activeScale={0.97}
          >
            <View style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.examTitle, { color: colors.text }]}>{result.examId?.title || 'Unknown Exam'}</Text>
                {result.isPublished && (
                  <View style={[styles.badge, result.isPassed ? styles.badgeSuccess : styles.badgeDanger]}>
                    <Text style={[styles.badgeText, result.isPassed ? styles.badgeTextSuccess : styles.badgeTextDanger]}>
                      {result.isPassed ? 'Passed' : 'Failed'}
                    </Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{result.examId?.subject || 'N/A'}</Text>
                  <View style={styles.metaItem}>
                    <Feather name="calendar" size={12} color="#818cf8" />
                    <Text style={styles.metaTextIcon}>{new Date(result.submittedAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Feather name="clock" size={12} color="#818cf8" />
                    <Text style={styles.metaTextIcon}>{result.timeTaken || 0} min</Text>
                  </View>
                </View>
              </View>

              <View style={styles.scoresContainer}>
                {result.isPublished ? (
                  <View style={styles.scoresRow}>
                    <View style={styles.scoreBox}>
                      <Text style={[styles.scoreValue, { color: colors.text }]}>{result.percentage?.toFixed(1)}%</Text>
                      <Text style={styles.scoreLabel}>Score</Text>
                    </View>
                    <View style={styles.scoreBox}>
                      <Text style={[styles.scoreValue, { color: colors.text }]}>{result.grade || 'N/A'}</Text>
                      <Text style={styles.scoreLabel}>Grade</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Result Pending</Text>
                  </View>
                )}
              </View>
            </View>
          </BouncyTouchable>
        ))}

        {(!results || results.length === 0) && (
          <View style={styles.emptyListContainer}>
            <View style={styles.folderIllustration}>
              <Feather name="folder" size={64} color="#6366f1" style={{ opacity: 0.8 }} />
              <View style={styles.folderDoc}>
                <Feather name="file-text" size={32} color="#a78bfa" />
              </View>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subText }]}>You haven't taken any exams yet.{'\n'}Start learning and take your first exam!</Text>
          </View>
        )}
      </View>
    </Animated.ScrollView>

    {/* Summary Modal */}
    <Modal visible={!!selectedResult} transparent animationType="slide">
      {selectedResult && (
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', height: '80%', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'white', borderRadius: 16, overflow: 'hidden' }}>
            {!selectedResult.isPublished ? (
              <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <Feather name="clock" size={36} color="#f59e0b" />
                  </View>
                  <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                    Result Pending Evaluation
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 }}>
                    Your exam "{selectedResult.examId?.title || 'Exam'}" was submitted successfully.
                  </Text>
                </View>

                <View style={{ width: '100%', backgroundColor: isDarkMode ? '#000000' : '#f8fafc', padding: 18, borderRadius: 14, borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>Subject</Text>
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{selectedResult.examId?.subject || 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>Status</Text>
                    <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>Under Evaluation</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>Submitted On</Text>
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{new Date(selectedResult.submittedAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>Time Taken</Text>
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{selectedResult.timeTaken || 0} minutes</Text>
                  </View>
                </View>

                <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                  Detailed analysis, score breakdown, and correct answers will be available once your teacher publishes the results.
                </Text>

                <TouchableOpacity 
                  style={{ backgroundColor: '#06b6d4', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 }}
                  onPress={() => setSelectedResult(null)}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={{ padding: 20, backgroundColor: isDarkMode ? '#000000' : '#f8fafc', alignItems: 'center', position: 'relative' }}>
                  <TouchableOpacity onPress={() => setSelectedResult(null)} style={{ position: 'absolute', top: 20, right: 20 }}>
                    <Feather name="x" size={24} color="#64748b" />
                  </TouchableOpacity>
                  <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 10 }}>{selectedResult.examId?.title}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 16, marginTop: 5 }}>Score: {selectedResult.obtainedMarks} / {selectedResult.totalMarks}</Text>
                  <View style={{ flexDirection: 'row', gap: 20, marginTop: 15 }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#10b981', fontSize: 20, fontWeight: 'bold' }}>{selectedResult.correctAnswers}</Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>Correct</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: 'bold' }}>{selectedResult.wrongAnswers}</Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>Wrong</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#f59e0b', fontSize: 20, fontWeight: 'bold' }}>{selectedResult.unattempted}</Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>Skipped</Text>
                    </View>
                  </View>
                </View>
                
                <ScrollView style={{ flex: 1, padding: 20 }}>
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 15 }}>Detailed Answers</Text>
                  {selectedResult.answers?.map((ans, idx) => {
                    const questionData = ans.questionId || {};
                    const qText = questionData.question || 'Unknown Question';
                    
                    const getAnswerText = (val) => {
                      if (val === undefined || val === null || val === '') return null;
                      const idx = parseInt(val, 10);
                      if (!isNaN(idx) && questionData.options && questionData.options[idx]) {
                        return questionData.options[idx].text || String(val);
                      }
                      return String(val);
                    };

                    const cAnswer = getAnswerText(questionData.correctAnswer) || 'N/A';
                    const sAnswer = getAnswerText(ans.selectedAnswer) || 'Not Attempted';
                    
                    return (
                      <View key={idx} style={{ marginBottom: 20, padding: 15, backgroundColor: isDarkMode ? '#000000' : '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: ans.isCorrect ? '#10b981' : (ans.selectedAnswer !== null && ans.selectedAnswer !== undefined ? '#ef4444' : '#f59e0b') }}>
                        <Text style={{ color: 'white', fontSize: 15, marginBottom: 10 }}>Q{idx + 1}. {qText}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                          <Text style={{ color: '#94a3b8', width: 80 }}>Your Answer:</Text>
                          <Text style={{ color: ans.isCorrect ? '#10b981' : (ans.selectedAnswer !== null && ans.selectedAnswer !== undefined ? '#ef4444' : '#f59e0b'), flex: 1 }}>{sAnswer}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: '#94a3b8', width: 80 }}>Correct:</Text>
                          <Text style={{ color: '#10b981', flex: 1 }}>{cAnswer}</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                
                <View style={{ padding: 20, borderTopWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}>
                  <TouchableOpacity 
                    style={{ backgroundColor: '#06b6d4', padding: 15, borderRadius: 10, alignItems: 'center' }}
                    onPress={() => setSelectedResult(null)}
                  >
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, borderBottomWidth: 0 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  iconBtn: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, backgroundColor: 'transparent' },
  
  content: { padding: 15, paddingBottom: 40 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', padding: 16, borderRadius: 16, marginBottom: 15, borderWidth: 1, overflow: 'hidden', height: 120 },
  statIconWrapper: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statSubline: { fontSize: 10 },

  sectionContainer: { borderRadius: 20, padding: 20, borderWidth: 1 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  viewAllText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
  
  emptyOverviewBox: { alignItems: 'center', paddingVertical: 20 },
  illustrationWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, padding: 20, backgroundColor: 'rgba(6,182,212,0.05)', borderRadius: 20 },
  illustrationLines: { marginLeft: 15 },
  illLine1: { width: 40, height: 6, borderRadius: 3, backgroundColor: 'rgba(6,182,212,0.5)', marginBottom: 8 },
  illLine2: { width: 60, height: 6, borderRadius: 3, backgroundColor: 'rgba(6,182,212,0.5)', marginBottom: 8 },
  illLine3: { width: 50, height: 6, borderRadius: 3, backgroundColor: 'rgba(6,182,212,0.5)' },
  
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20, paddingHorizontal: 20 },
  takeExamBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#06b6d4', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  takeExamBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },

  emptyListContainer: { alignItems: 'center', paddingVertical: 30 },
  folderIllustration: { position: 'relative', marginBottom: 20, width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  folderDoc: { position: 'absolute', top: -10, zIndex: -1 },

  resultCard: { borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  examTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  badgeSuccess: { backgroundColor: 'rgba(16,185,129,0.2)' },
  badgeDanger: { backgroundColor: 'rgba(239,68,68,0.2)' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  badgeTextSuccess: { color: '#10b981' },
  badgeTextDanger: { color: '#ef4444' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 15 },
  metaText: { color: '#94a3b8', fontSize: 12, marginRight: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
  metaTextIcon: { color: '#94a3b8', fontSize: 12, marginLeft: 4 },
  scoresContainer: { alignItems: 'flex-end', justifyContent: 'center' },
  scoresRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  scoreBox: { alignItems: 'center', marginLeft: 20 },
  scoreValue: { fontSize: 22, fontWeight: 'bold' },
  scoreLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  pendingBadge: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  pendingText: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' }
});
