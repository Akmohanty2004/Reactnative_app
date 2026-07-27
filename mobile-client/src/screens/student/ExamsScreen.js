import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, Modal, ActivityIndicator 
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { getStudentExams } from '../../redux/slices/examSlice';
import { getStudentResults } from '../../redux/slices/resultSlice';

export default function ExamsScreen({ navigation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedExam, setSelectedExam] = useState(null);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showExamInfo, setShowExamInfo] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [showAllExams, setShowAllExams] = useState(false);
  
  const dispatch = useDispatch();
  const { exams } = useSelector(state => state.exams);
  const { results } = useSelector(state => state.results);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });

  useFocusEffect(
    useCallback(() => {
      dispatch(getStudentExams());
      dispatch(getStudentResults());
    }, [dispatch])
  );

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    primary: '#6366f1',
    primaryBg: 'rgba(99,102,241,0.1)',
    info: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    modalBg: isDarkMode ? '#1e293b' : 'white',
    inputBg: isDarkMode ? '#0f172a' : '#f1f5f9',
  };

  const filteredExams = (exams || []).filter(exam => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (exam.title?.toLowerCase() || '').includes(term) ||
                          (exam.subject?.toLowerCase() || '').includes(term);
    const matchesFilter = filter === 'all' || 
                         (filter === 'upcoming' && exam.isUpcoming) ||
                         (filter === 'available' && exam.isAvailable && !exam.isTaken) ||
                         (filter === 'completed' && exam.isTaken);
    return matchesSearch && matchesFilter;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const displayedExams = showAllExams ? filteredExams : filteredExams.slice(0, 5);

  const handleStartExam = (exam) => {
    if (!exam.isAvailable) {
      if (exam.isUpcoming) {
        Toast.show({
          type: 'info',
          text1: 'Upcoming Exam',
          text2: `Starts at ${exam.startTime} on ${new Date(exam.date).toLocaleDateString()}`
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Too Late',
          text2: 'Exam entry time has ended.'
        });
      }
      return;
    }
    setSelectedExam(exam);
    setPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    try {
      setVerifying(true);
      const response = await api.post(`/api/exams/${selectedExam._id}/verify-password`, { password });
      
      if (response.data.valid) {
        setShowPasswordModal(false);
        navigation.navigate('Exam', { examId: selectedExam._id });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Incorrect password!'
      });
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (exam) => {
    if (exam.isTaken) {
      const result = results?.find(r => r.examId?._id === exam._id);
      if (result?.isPublished) {
        return { label: result.isPassed ? 'Passed' : 'Failed', color: result.isPassed ? colors.success : colors.danger };
      }
      return { label: 'Result Pending', color: colors.warning };
    }
    if (exam.isAvailable) return { label: 'Available', color: colors.warning };
    if (exam.isUpcoming) return { label: 'Upcoming', color: colors.info };
    return { label: 'Expired', color: colors.danger };
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Custom Header */}
        <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingHorizontal: 0, paddingBottom: 25 }]}>
          <View style={{ flex: 1, paddingRight: 10, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation?.navigate('Dashboard')}
              style={{ marginRight: 10, padding: 4 }}
            >
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Available <Text style={{color: '#8b5cf6'}}>Exams</Text></Text>
              <Text style={[styles.headerSubtitle, { color: colors.subText }]} numberOfLines={2}>Find and take your examinations</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : colors.border }]}>
            <Feather name="filter" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={20} color={colors.subText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search exams..."
            placeholderTextColor={colors.subText}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ paddingRight: 20 }}>
          {['all', 'available', 'upcoming', 'completed'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterButton, 
                { backgroundColor: colors.card, borderColor: colors.border },
                filter === option && { backgroundColor: '#6366f1', borderColor: '#6366f1' }
              ]}
              onPress={() => setFilter(option)}
            >
              <Text style={[
                styles.filterText, 
                { color: colors.subText },
                filter === option && { color: 'white' }
              ]}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <View style={styles.promoBadge}>
              <Feather name="star" size={14} color="white" />
            </View>
            <Text style={styles.promoTitle}>Ready to test your <Text style={{color: '#c4b5fd'}}>knowledge</Text>?</Text>
            <Text style={styles.promoSubtitle}>Take an exam and track your performance.</Text>
          </View>
          <View style={styles.promoGraphic}>
            <Feather name="edit-3" size={60} color="#a78bfa" style={{ opacity: 0.8 }} />
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Now</Text>
          {filteredExams.length > 5 && (
            <TouchableOpacity onPress={() => setShowAllExams(!showAllExams)}>
              <Text style={styles.viewAllText}>
                {showAllExams ? 'Show Less' : 'View All'} <Feather name={showAllExams ? "chevron-up" : "chevron-right"} size={14} />
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Exams List */}
        <View style={styles.listContainer}>
          {displayedExams.map((exam, index) => {
            const status = getStatusBadge(exam);
            
            let difficulty = 'Medium';
            let diffColor = '#10b981';
            let iconName = 'code';
            let iconColor = '#38bdf8';
            let badgeBg = 'rgba(56,189,248,0.1)';
            let badgeText = '#38bdf8';
            if (index % 3 === 0) { difficulty = 'Easy'; diffColor = '#38bdf8'; iconName = 'code'; iconColor = '#38bdf8'; }
            else if (index % 3 === 1) { difficulty = 'Medium'; diffColor = '#10b981'; iconName = 'database'; iconColor = '#10b981'; badgeBg = 'rgba(16,185,129,0.1)'; badgeText = '#10b981'; }
            else { difficulty = 'Hard'; diffColor = '#a78bfa'; iconName = 'cpu'; iconColor = '#a78bfa'; badgeBg = 'rgba(139,92,246,0.1)'; badgeText = '#a78bfa'; }
            
            return (
              <View key={exam._id} style={[styles.examCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.examCardLeft}>
                  <View style={[styles.examIconContainer, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', borderColor: colors.border }]}>
                     <Feather name={iconName} size={28} color={iconColor} />
                  </View>
                </View>

                <View style={styles.examCardCenter}>
                  <View style={[styles.cardBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.cardBadgeText, { color: badgeText }]}>{status.label}</Text>
                  </View>
                  <Text style={[styles.examCardTitle, { color: colors.text }]} numberOfLines={1}>{exam.title}</Text>
                  <View style={styles.examMetaRow}>
                    <Feather name="clock" size={12} color={colors.subText} />
                    <Text style={[styles.examMetaText, { color: colors.subText }]}>{exam.duration} min</Text>
                    <Text style={[styles.examMetaText, { color: colors.subText, marginHorizontal: 6 }]}>•</Text>
                    <Feather name="help-circle" size={12} color={colors.subText} />
                    <Text style={[styles.examMetaText, { color: colors.subText }]}>{exam.maxMarks} Qs</Text>
                  </View>
                </View>

                <View style={styles.examCardRight}>
                  {/* Difficulty Dial */}
                  <View style={styles.difficultyDialWrapper}>
                    <View style={[styles.difficultyDialBackground, { borderColor: isDarkMode ? '#0f172a' : '#f1f5f9' }]} />
                    <View style={[styles.difficultyDialArc, { borderTopColor: diffColor, borderRightColor: diffColor }]} />
                    <Text style={[styles.difficultyText, { color: diffColor }]}>{difficulty}</Text>
                  </View>

                  <TouchableOpacity 
                    onPress={() => handleStartExam(exam)} 
                    style={[
                      styles.startBtn,
                      status.label !== 'Available' && { backgroundColor: isDarkMode ? '#334155' : '#cbd5e1' }
                    ]}
                    disabled={status.label !== 'Available' && status.label !== 'Upcoming'}
                  >
                    <Text style={[
                      styles.startBtnText, 
                      { color: status.label === 'Available' ? 'white' : (isDarkMode ? '#94a3b8' : '#64748b') }
                    ]}>
                      {status.label === 'Available' ? 'Start Exam' : status.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.endOfListContainer, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.5)' : '#f8fafc', borderColor: colors.border }]}>
          <View style={styles.boxIllustration}>
            <Feather name="package" size={48} color="#a78bfa" style={{ opacity: 0.6 }} />
            <View style={styles.planeDoc}>
              <Feather name="send" size={24} color="#8b5cf6" />
            </View>
          </View>
          <Text style={[styles.endOfListTitle, { color: colors.text }]}>No more exams here!</Text>
          <Text style={[styles.endOfListSubtitle, { color: colors.subText }]}>Check back later for new{'\n'}examinations.</Text>
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal visible={!!showExamInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{showExamInfo?.title}</Text>
            <ScrollView style={styles.infoScroll}>
              <Text style={[styles.infoText, { color: colors.subText }]}><Text style={[styles.bold, { color: colors.text }]}>Subject:</Text> {showExamInfo?.subject}</Text>
              <Text style={[styles.infoText, { color: colors.subText }]}><Text style={[styles.bold, { color: colors.text }]}>Teacher:</Text> {showExamInfo?.createdBy?.name}</Text>
              <Text style={[styles.infoText, { color: colors.subText }]}><Text style={[styles.bold, { color: colors.text }]}>Date:</Text> {showExamInfo?.date && new Date(showExamInfo.date).toLocaleDateString()}</Text>
              <Text style={[styles.infoText, { color: colors.subText }]}><Text style={[styles.bold, { color: colors.text }]}>Time:</Text> {formatTime(showExamInfo?.startTime)} - {formatTime(showExamInfo?.endTime)}</Text>
              <Text style={[styles.infoText, { color: colors.subText }]}><Text style={[styles.bold, { color: colors.text }]}>Duration:</Text> {showExamInfo?.duration} minutes</Text>
              <Text style={[styles.infoText, { color: colors.subText }]}><Text style={[styles.bold, { color: colors.text }]}>Max Marks:</Text> {showExamInfo?.maxMarks}</Text>
              <Text style={[styles.infoText, { color: colors.subText }]}><Text style={[styles.bold, { color: colors.text }]}>Passing Marks:</Text> {showExamInfo?.passingMarks}</Text>
              <Text style={[styles.infoText, { color: colors.subText }]}><Text style={[styles.bold, { color: colors.text }]}>Description:</Text> {showExamInfo?.description}</Text>
              <Text style={[styles.infoText, { color: colors.subText }]}><Text style={[styles.bold, { color: colors.text }]}>Instructions:</Text> {showExamInfo?.instructions}</Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setShowExamInfo(null)} style={[styles.primaryBtn, { width: '100%', marginTop: 15 }]}>
              <Text style={[styles.btnText, { color: 'white' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Enter Password</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subText }]}>This exam is protected. Enter password to continue.</Text>
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Exam password"
              placeholderTextColor={colors.subText}
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={[styles.secondaryBtn, { flex: 1, marginRight: 10, backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
                <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePasswordSubmit} style={[styles.primaryBtn, { flex: 1 }]} disabled={verifying}>
                {verifying ? <ActivityIndicator color="white" size="small" /> : <Text style={[styles.btnText, { color: 'white' }]}>Start Exam</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, borderBottomWidth: 0 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  iconBtn: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, backgroundColor: 'transparent' },

  contentContainer: { padding: 20, paddingBottom: 40 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, height: 50, marginBottom: 20, borderWidth: 1 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  
  filtersScroll: { flexDirection: 'row', marginBottom: 25 },
  filterButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  
  promoBanner: { backgroundColor: '#1e1b4b', borderRadius: 20, padding: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 25, overflow: 'hidden' },
  promoContent: { flex: 1, zIndex: 2, paddingRight: 40 },
  promoBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(139,92,246,0.4)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  promoTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  promoSubtitle: { color: '#a78bfa', fontSize: 13, lineHeight: 20 },
  promoGraphic: { position: 'absolute', right: -15, top: '50%', transform: [{ translateY: -20 }], opacity: 0.8 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  viewAllText: { color: '#8b5cf6', fontSize: 13, fontWeight: '600' },

  listContainer: { paddingBottom: 20 },
  
  examCard: { flexDirection: 'row', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1 },
  examCardLeft: { marginRight: 15 },
  examIconContainer: { width: 64, height: 64, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  
  examCardCenter: { flex: 1, justifyContent: 'center' },
  cardBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 6 },
  cardBadgeText: { fontSize: 10, fontWeight: 'bold' },
  examCardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  examMetaRow: { flexDirection: 'row', alignItems: 'center' },
  examMetaText: { fontSize: 12, marginLeft: 4, fontWeight: '500' },

  examCardRight: { justifyContent: 'space-between', alignItems: 'flex-end', marginLeft: 10, width: 80 },
  difficultyDialWrapper: { position: 'relative', width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  difficultyDialBackground: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  difficultyDialArc: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderLeftColor: 'transparent', borderBottomColor: 'transparent', transform: [{ rotate: '45deg' }] },
  difficultyText: { fontSize: 9, fontWeight: 'bold' },
  
  startBtn: { backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, width: '100%', alignItems: 'center' },
  startBtnText: { fontSize: 12, fontWeight: 'bold' },

  endOfListContainer: { alignItems: 'center', paddingVertical: 30, borderRadius: 20, marginTop: 10, borderWidth: 1 },
  boxIllustration: { position: 'relative', marginBottom: 15, width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  planeDoc: { position: 'absolute', top: -5, right: -10, zIndex: 1 },
  endOfListTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  endOfListSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 20, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  infoScroll: { maxHeight: 300 },
  infoText: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  bold: { fontWeight: '700' },
  modalInput: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 15, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' }
});
