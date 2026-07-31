import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, BackHandler, AppState, Dimensions, ActivityIndicator,
  StatusBar, Image, Modal
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, CameraView } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getStudentExam } from '../../redux/slices/examSlice';
import { submitExam } from '../../redux/slices/resultSlice';

const { width } = Dimensions.get('window');

export default function ExamScreen({ route, navigation }) {
  const { examId } = route.params || {};
  const dispatch = useDispatch();
  
  const { currentExam, error, isLoading } = useSelector(state => state.exams);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [hasPermission, setHasPermission] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examSummary, setExamSummary] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');

  const handleCalcPress = (val) => {
    if (val === 'C') {
      setCalcInput('');
    } else if (val === '=') {
      try {
        setCalcInput(eval(calcInput).toString());
      } catch (e) {
        setCalcInput('Error');
      }
    } else if (val === 'DEL') {
      setCalcInput(prev => prev === 'Error' ? '' : prev.slice(0, -1));
    } else {
      setCalcInput(prev => prev === 'Error' ? val : prev + val);
    }
  };

  const answersRef = useRef(answers);
  const isSubmittedRef = useRef(isSubmitted);
  const timerRef = useRef(null);
  const tabSwitchCountRef = useRef(tabSwitchCount);
  const appState = useRef(AppState.currentState);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { isSubmittedRef.current = isSubmitted; }, [isSubmitted]);
  useEffect(() => { tabSwitchCountRef.current = tabSwitchCount; }, [tabSwitchCount]);

  useEffect(() => {
    dispatch(getStudentExam(examId));
  }, [dispatch, examId]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    const examObject = currentExam?.exam || currentExam;
    if (!examObject || !isStarted || Object.keys(examObject).length === 0) return;

    if (examObject.fullscreenMode !== false) {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (
          appState.current.match(/active/) &&
          nextAppState.match(/inactive|background/) &&
          !isSubmittedRef.current
        ) {
          const newCount = tabSwitchCountRef.current + 1;
          tabSwitchCountRef.current = newCount;
          setTabSwitchCount(newCount);
          
          if (newCount >= 1) {
            isSubmittedRef.current = true;
            Toast.show({ type: 'error', text1: 'Exam Failed', text2: 'App switched! Exam auto-submitted for cheating.' });
            forceSubmitExam(true);
          }
        }
        appState.current = nextAppState;
      });

      return () => { subscription.remove(); };
    }
  }, [currentExam, isStarted]);

  useEffect(() => {
    const examObject = currentExam?.exam || currentExam;
    if (examObject && Object.keys(examObject).length > 0 && isStarted) {
      const now = new Date();
      const examDate = new Date(examObject.date);
      const [hours, minutes] = examObject.startTime.split(':');
      examDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const hardEndDateTime = new Date(examObject.date);
      const [endHours, endMinutes] = examObject.endTime.split(':');
      hardEndDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      const personalDurationSeconds = examObject.duration * 60;
      const timeUntilHardEnd = Math.max(0, Math.floor((hardEndDateTime - now) / 1000));
      const remaining = Math.min(personalDurationSeconds, timeUntilHardEnd);
      setTimeLeft(remaining);

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (!isSubmittedRef.current) {
              Toast.show({ type: 'info', text1: 'Time is up!', text2: 'Submitting your exam...' });
              forceSubmitExam();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [currentExam, isStarted]);

  useEffect(() => {
    const backAction = () => {
      if (!isStarted || isSubmitted) return false;
      Toast.show({ type: 'error', text1: 'Warning', text2: 'Exited exam! Exam auto-submitted.' });
      forceSubmitExam(true);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isStarted, isSubmitted]);

  const handleAnswerSelect = (answer) => {
    const questionsList = currentExam?.questions || [];
    setAnswers(prev => ({ ...prev, [questionsList[currentQuestion]?._id]: answer }));
  };

  const forceSubmitExam = async (isCheated = false) => {
    setIsSubmitted(true);
    isSubmittedRef.current = true;
    clearInterval(timerRef.current);

    const formattedAnswers = Object.entries(answersRef.current).map(([questionId, selectedAnswer]) => ({
      questionId, selectedAnswer
    }));

    const examObject = currentExam?.exam || currentExam;
    const timeTaken = Math.floor((examObject.duration * 60 - timeLeft) / 60);
    
    try {
      const response = await dispatch(submitExam({
        examId,
        answers: formattedAnswers,
        timeTaken,
        tabSwitches: isCheated ? Math.max(1, tabSwitchCountRef.current) : tabSwitchCountRef.current,
        isCheated
      })).unwrap();

      Toast.show({ type: 'success', text1: 'Success', text2: 'Exam submitted successfully!' });
      setExamSummary(response.result);
    } catch (err) {
      // If error, just go back
      navigation.reset({ index: 0, routes: [{ name: 'StudentTabs' }] });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading exam...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Feather name="clock" size={48} color="#f59e0b" style={{ marginBottom: 20 }} />
        <Text style={styles.errorTitle}>Exam Unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const exam = currentExam?.exam || currentExam;
  const questions = currentExam?.questions || [];

  if (!exam || Object.keys(exam).length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading exam details...</Text>
      </View>
    );
  }

  if (!isStarted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar hidden={false} barStyle="light-content" />
        <View style={styles.startCard}>
          <Text style={styles.startTitle}>Ready to Start?</Text>
          <Text style={styles.startSubtitle}>
            {exam?.enableCamera !== false ? 'Camera monitoring is ENABLED. ' : ''}
            {exam?.enableMicrophone !== false ? 'Mic monitoring is ENABLED. ' : ''}
            Click the button below to begin.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsStarted(true)}>
            <Text style={styles.btnText}>Begin Exam</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentQ = questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;

  return (
    <View style={styles.container}>
      <StatusBar hidden={exam?.fullscreenMode !== false} barStyle="light-content" backgroundColor="#0f172a" />
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.examTitle} numberOfLines={1}>{exam.title}</Text>
          <Text style={styles.examSubject}>{exam.subject}</Text>
        </View>
        <View style={styles.headerRight}>
          <Feather name="clock" size={18} color="#818cf8" />
          <Text style={[styles.timeText, timeLeft < 300 && { color: '#ef4444' }]}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      {/* End Header */}

      {/* Summary Modal */}
      {examSummary && (
        <Modal visible={true} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '90%', height: 250, backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ padding: 30, backgroundColor: '#0f172a', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                <Feather name="check-circle" size={60} color="#10b981" style={{ marginBottom: 15 }} />
                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Exam Submitted!</Text>
                <Text style={{ color: '#94a3b8', fontSize: 16, marginTop: 10 }}>
                  You attempted {(questions.length - (examSummary.unattempted || 0))} out of {questions.length} questions.
                </Text>
              </View>
              <View style={{ padding: 20, borderTopWidth: 1, borderColor: '#334155' }}>
                <TouchableOpacity 
                  style={{ backgroundColor: '#6366f1', padding: 15, borderRadius: 10, alignItems: 'center' }}
                  onPress={() => navigation.reset({ index: 0, routes: [{ name: 'StudentTabs' }] })}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Return to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>Answered: {answeredCount} / {questions.length}</Text>
        <TouchableOpacity 
          style={styles.submitBtnHeader}
          onPress={() => {
            Alert.alert('Submit', 'Are you sure you want to submit?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Submit', onPress: forceSubmitExam }
            ]);
          }}
        >
          <Text style={styles.submitBtnText}>Submit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {questions.length === 0 ? (
          <Text style={styles.loadingText}>No questions found.</Text>
        ) : (
          <View style={styles.questionCard}>
            {currentQ.image ? (
              <Image 
                source={{ uri: currentQ.image }} 
                style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 15 }} 
                resizeMode="contain" 
              />
            ) : null}
            <Text style={styles.questionText}>
              <Text style={{ color: '#818cf8' }}>{currentQuestion + 1}. </Text>
              {currentQ.question}
            </Text>

            {currentQ.type === 'mcq' && currentQ.options?.map((option, idx) => {
              const isSelected = answers[currentQ._id] === option.text;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                  onPress={() => handleAnswerSelect(option.text)}
                >
                  <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                    <Text style={[styles.optionLetterText, isSelected && { color: 'white' }]}>
                      {String.fromCharCode(65 + idx)}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, isSelected && { color: 'white' }]}>{option.text}</Text>
                </TouchableOpacity>
              );
            })}

            {currentQ.type === 'truefalse' && ['true', 'false'].map((val) => {
              const isSelected = answers[currentQ._id] === val;
              return (
                <TouchableOpacity 
                  key={val} 
                  style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                  onPress={() => handleAnswerSelect(val)}
                >
                  <Text style={[styles.optionText, { textTransform: 'capitalize' }, isSelected && { color: 'white' }]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.navButtons}>
          <TouchableOpacity 
            style={[styles.navBtn, currentQuestion === 0 && { opacity: 0.5 }]} 
            disabled={currentQuestion === 0}
            onPress={() => setCurrentQuestion(p => Math.max(0, p - 1))}
          >
            <Feather name="chevron-left" size={20} color="white" />
            <Text style={styles.btnText}>Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navBtn, currentQuestion === questions.length - 1 && { opacity: 0.5 }]} 
            disabled={currentQuestion === questions.length - 1}
            onPress={() => setCurrentQuestion(p => Math.min(questions.length - 1, p + 1))}
          >
            <Text style={styles.btnText}>Next</Text>
            <Feather name="chevron-right" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Question Palette */}
        <View style={styles.paletteContainer}>
          <Text style={styles.paletteTitle}>Question Palette</Text>
          <View style={styles.paletteGrid}>
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q._id];
              const isCurrent = currentQuestion === idx;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.paletteBtn,
                    isAnswered && styles.paletteBtnAnswered,
                    isCurrent && styles.paletteBtnCurrent
                  ]}
                  onPress={() => setCurrentQuestion(idx)}
                >
                  <Text style={[
                    styles.paletteBtnText,
                    isAnswered && { color: '#10b981' },
                    isCurrent && { color: 'white' }
                  ]}>{idx + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {exam?.enableCamera !== false && hasPermission && (
        <View style={styles.cameraContainer}>
          {isCameraOn ? (
            <CameraView style={styles.camera} facing="front" />
          ) : (
            <View style={styles.cameraOff}>
              <Feather name="camera-off" size={24} color="#64748b" />
            </View>
          )}
          <TouchableOpacity 
            style={styles.cameraToggle} 
            onPress={() => setIsCameraOn(!isCameraOn)}
          >
            <Feather name={isCameraOn ? "camera" : "camera-off"} size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Calculator Button */}
      {exam?.allowCalculator && (
        <TouchableOpacity 
          style={styles.calcBtn} 
          onPress={() => setShowCalculator(true)}
        >
          <Feather name="cpu" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Calculator Modal Placeholder */}
      <Modal visible={showCalculator} transparent animationType="fade">
        <View style={styles.calcModalOverlay}>
          <View style={styles.calcModalContainer}>
            <Text style={{ color: 'white', fontSize: 18, marginBottom: 15 }}>Basic Calculator</Text>
            
            <View style={{ width: '100%', backgroundColor: '#0f172a', padding: 15, borderRadius: 10, marginBottom: 15 }}>
              <Text style={{ color: 'white', fontSize: 24, textAlign: 'right' }}>{calcInput || '0'}</Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
              {['C', 'DEL', '/', '*', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.', '(', ')'].map((btn) => (
                <TouchableOpacity 
                  key={btn}
                  style={{ width: '22%', backgroundColor: '#334155', paddingVertical: 15, borderRadius: 8, marginBottom: 10, alignItems: 'center' }}
                  onPress={() => handleCalcPress(btn)}
                >
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{btn}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.primaryBtn, { width: '100%', justifyContent: 'center' }]} 
              onPress={() => setShowCalculator(false)}
            >
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { color: '#94a3b8', fontSize: 16, marginTop: 12 },
  errorTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  errorText: { color: '#94a3b8', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  startCard: { backgroundColor: '#1e293b', padding: 30, borderRadius: 20, alignItems: 'center', width: '100%', maxWidth: 400 },
  startTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  startSubtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  primaryBtn: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  header: { backgroundColor: '#1e293b', padding: 15, paddingTop: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#334155' },
  examTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  examSubject: { color: '#94a3b8', fontSize: 13 },
  headerRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timeText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#1e293b' },
  progressText: { color: '#94a3b8', fontSize: 14 },
  submitBtnHeader: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)' },
  submitBtnText: { color: '#f87171', fontWeight: 'bold', fontSize: 14 },
  content: { flex: 1, padding: 15 },
  questionCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  questionText: { color: 'white', fontSize: 18, fontWeight: '500', lineHeight: 26, marginBottom: 20 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  optionBtnSelected: { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: '#6366f1' },
  optionLetter: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  optionLetterSelected: { backgroundColor: '#6366f1' },
  optionLetterText: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold' },
  optionText: { flex: 1, color: '#cbd5e1', fontSize: 15 },
  navButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  navBtn: { backgroundColor: '#6366f1', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  paletteContainer: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 40, borderWidth: 1, borderColor: '#334155' },
  paletteTitle: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', marginBottom: 12, fontWeight: 'bold' },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  paletteBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', margin: 4 },
  paletteBtnAnswered: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.5)' },
  paletteBtnCurrent: { backgroundColor: '#6366f1', borderWidth: 1, borderColor: '#818cf8' },
  paletteBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  cameraContainer: { position: 'absolute', bottom: 20, right: 20, width: 120, height: 160, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(99,102,241,0.5)', zIndex: 1000 },
  camera: { flex: 1 },
  cameraOff: { flex: 1, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  cameraToggle: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 },
  calcBtn: { position: 'absolute', bottom: 20, left: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 1000 },
  calcModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  calcModalContainer: { width: 300, backgroundColor: '#1e293b', padding: 25, borderRadius: 20, alignItems: 'center' }
});
