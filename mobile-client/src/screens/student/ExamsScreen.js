import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, Modal, ActivityIndicator, Animated
, Platform, StatusBar} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { getStudentExams } from '../../redux/slices/examSlice';
import { getStudentResults } from '../../redux/slices/resultSlice';
import BouncyTouchable from '../../components/BouncyTouchable';

export default function ExamsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
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

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [floatAnim] = useState(new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      dispatch(getStudentExams());
      dispatch(getStudentResults());
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true })
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: -8, duration: 2500, useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true })
        ])
      ).start();
      
      return () => { fadeAnim.setValue(0); slideAnim.setValue(30); floatAnim.setValue(0); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch])
  );

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    text: isDarkMode ? 'white' : '#050505',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? 'rgba(255,255,255,0.03)' : 'white',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    primary: '#06b6d4',
    primaryBg: 'rgba(6,182,212,0.1)',
    info: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    modalBg: isDarkMode ? isDarkMode ? 'rgba(255,255,255,0.03)' : 'white' : 'white',
    inputBg: isDarkMode ? isDarkMode ? '#000000' : '#f8fafc' : '#f1f5f9',
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
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={true} backgroundColor="transparent" />
      <Animated.ScrollView 
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Custom Header */}
        <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingHorizontal: 0, paddingBottom: 25, paddingTop: topPadding + 10, flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginRight: 15 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Available <Text style={{color: '#6366f1'}}>Exams</Text></Text>
            <Text style={[styles.headerSubtitle, { color: colors.subText }]} numberOfLines={2}>Find and take your examinations</Text>
          </View>
          <TouchableOpacity 
            style={[styles.iconBtn, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : colors.border }]}
            onPress={() => {
              const options = ['all', 'available', 'upcoming', 'completed'];
              const currentIndex = options.indexOf(filter);
              const nextIndex = (currentIndex + 1) % options.length;
              const nextFilter = options[nextIndex];
              setFilter(nextFilter);
              Toast.show({
                type: 'info',
                text1: 'Filter Applied',
                text2: `Showing ${nextFilter.charAt(0).toUpperCase() + nextFilter.slice(1)} Exams`
              });
            }}
          >
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
            <BouncyTouchable
              key={option}
              style={[
                styles.filterButton, 
                { backgroundColor: colors.card, borderColor: colors.border },
                filter === option && { backgroundColor: '#06b6d4', borderColor: '#06b6d4' }
              ]}
              onPress={() => setFilter(option)}
              activeScale={0.9}
            >
              <Text style={[
                styles.filterText, 
                { color: colors.subText },
                filter === option && { color: 'white' }
              ]}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </BouncyTouchable>
          ))}
        </ScrollView>

        {/* Promo Banner */}
        <Animated.View style={[styles.promoBanner, { transform: [{ translateY: floatAnim }], backgroundColor: isDarkMode ? '#1e1b4b' : '#ede9fe' }]}>
          <View style={styles.promoContent}>
            <View style={[styles.promoBadge, { backgroundColor: isDarkMode ? 'rgba(6,182,212,0.4)' : '#c4b5fd' }]}>
              <Feather name="star" size={14} color="white" />
            </View>
            <Text style={[styles.promoTitle, { color: isDarkMode ? 'white' : '#4c1d95' }]}>Ready to test your <Text style={{color: isDarkMode ? '#c4b5fd' : '#6366f1'}}>knowledge</Text>?</Text>
            <Text style={[styles.promoSubtitle, { color: isDarkMode ? '#a78bfa' : '#6d28d9' }]}>Take an exam and track your performance.</Text>
          </View>
          <View style={styles.promoGraphic}>
            <Feather name="edit-3" size={60} color={isDarkMode ? '#a78bfa' : '#6366f1'} style={{ opacity: 0.8 }} />
          </View>
        </Animated.View>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Now</Text>
          {filteredExams.length > 5 && (
            <BouncyTouchable onPress={() => setShowAllExams(!showAllExams)} activeScale={0.9}>
              <Text style={styles.viewAllText}>
                {showAllExams ? 'Show Less' : 'View All'} <Feather name={showAllExams ? "chevron-up" : "chevron-right"} size={14} />
              </Text>
            </BouncyTouchable>
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
            else { difficulty = 'Hard'; diffColor = '#a78bfa'; iconName = 'cpu'; iconColor = '#a78bfa'; badgeBg = 'rgba(6,182,212,0.1)'; badgeText = '#a78bfa'; }
            
            return (
              <View key={exam._id} style={[styles.examCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.examCardLeft}>
                  <View style={[styles.examIconContainer, { backgroundColor: isDarkMode ? isDarkMode ? '#000000' : '#f8fafc' : '#f8fafc', borderColor: colors.border }]}>
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
                    <View style={[styles.difficultyDialBackground, { borderColor: isDarkMode ? isDarkMode ? '#000000' : '#f8fafc' : '#f1f5f9' }]} />
                    <View style={[styles.difficultyDialArc, { borderTopColor: diffColor, borderRightColor: diffColor }]} />
                    <Text style={[styles.difficultyText, { color: diffColor }]}>{difficulty}</Text>
                  </View>

                  <BouncyTouchable 
                    onPress={() => handleStartExam(exam)} 
                    style={[
                      styles.startBtn,
                      status.label !== 'Available' && { backgroundColor: isDarkMode ? isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' : '#cbd5e1' }
                    ]}
                    disabled={status.label !== 'Available' && status.label !== 'Upcoming'}
                    activeScale={0.95}
                  >
                    <Text style={[
                      styles.startBtnText, 
                      { color: status.label === 'Available' ? 'white' : (isDarkMode ? '#94a3b8' : '#64748b') }
                    ]}>
                      {status.label === 'Available' ? 'Start Exam' : status.label}
                    </Text>
                  </BouncyTouchable>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.endOfListContainer, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.5)' : '#f8fafc', borderColor: colors.border }]}>
          <View style={styles.boxIllustration}>
            <Feather name="package" size={48} color="#a78bfa" style={{ opacity: 0.6 }} />
            <View style={styles.planeDoc}>
              <Feather name="send" size={24} color="#6366f1" />
            </View>
          </View>
          <Text style={[styles.endOfListTitle, { color: colors.text }]}>No more exams here!</Text>
          <Text style={[styles.endOfListSubtitle, { color: colors.subText }]}>Check back later for new{'\n'}examinations.</Text>
        </View>
      </Animated.ScrollView>

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
            <View style={styles.modalHeaderIcon}>
              <Feather name="lock" size={26} color="#6366f1" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Protected Exam</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subText }]}>This exam is password protected. Enter the code provided by your teacher to continue.</Text>
            
            <View style={[styles.passwordInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Feather name="key" size={18} color="#6366f1" style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: 16 }}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter exam password..."
                placeholderTextColor={colors.subText}
                secureTextEntry
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setShowPasswordModal(false)} 
                style={[styles.secondaryBtn, { flex: 1, marginRight: 12, backgroundColor: isDarkMode ? isDarkMode ? 'rgba(255,255,255,0.03)' : 'white' : '#f1f5f9', borderColor: colors.border }]}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handlePasswordSubmit} 
                style={[styles.primaryBtn, { flex: 1, backgroundColor: '#06b6d4' }]} 
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={[styles.btnText, { color: 'white', marginRight: 8 }]}>Start Exam</Text>
                    <Feather name="arrow-right" size={18} color="white" />
                  </>
                )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, borderBottomWidth: 0 },
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
  promoBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(6,182,212,0.4)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  promoTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  promoSubtitle: { color: '#a78bfa', fontSize: 13, lineHeight: 20 },
  promoGraphic: { position: 'absolute', right: -15, top: '50%', transform: [{ translateY: -20 }], opacity: 0.8 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  viewAllText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },

  listContainer: { paddingBottom: 20 },
  
  examCard: { flexDirection: 'row', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
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
  
  startBtn: { backgroundColor: '#06b6d4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, width: '100%', alignItems: 'center' },
  startBtnText: { fontSize: 12, fontWeight: 'bold' },

  endOfListContainer: { alignItems: 'center', paddingVertical: 30, borderRadius: 20, marginTop: 10, borderWidth: 1 },
  boxIllustration: { position: 'relative', marginBottom: 15, width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  planeDoc: { position: 'absolute', top: -5, right: -10, zIndex: 1 },
  endOfListTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  endOfListSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 24, borderWidth: 1 },
  modalHeaderIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(6,182,212,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, marginBottom: 20, lineHeight: 20 },
  passwordInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, height: 54, marginBottom: 24 },
  infoScroll: { maxHeight: 300 },
  infoText: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  bold: { fontWeight: '700' },
  modalInput: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 15, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primaryBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  secondaryBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  btnText: { fontSize: 15, fontWeight: '700' }
});
