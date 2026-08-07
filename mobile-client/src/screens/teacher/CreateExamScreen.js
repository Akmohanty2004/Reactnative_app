import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  StatusBar
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { createExam, getTeacherExams } from '../../redux/slices/examSlice';

const CreateExamScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const theme = useSelector((state) => state.ui?.theme || 'dark');
  const { isLoading } = useSelector((state) => state.exams || { isLoading: false });

  const isDark = theme === 'dark';
  const colors = {
    background: isDark ? '#000000' : '#f8fafc',
    card: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '#334155' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    subtext: isDark ? '#94a3b8' : '#64748b',
    primary: '#8b5cf6',
    primaryDark: '#6366f1',
    danger: '#ef4444',
    success: '#10b981',
  };

  const [examData, setExamData] = useState({
    title: '',
    subject: '',
    classGroup: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: '',
    entryTime: '',
    password: '',
    plannedQuestions: '',
    allowCalculator: false,
    fullscreenMode: true,
    enableCamera: false,
    enableMicrophone: false,
    maxMarks: '',
    passingMarks: '',
  });

  const [availableClasses, setAvailableClasses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { default: api } = await import('../../services/api');
        const res = await api.get('/api/classes');
        setAvailableClasses(res.data.classes || []);
      } catch (err) {
        console.log('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, []);

  const [questions, setQuestions] = useState([
    {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      marks: '1',
      image: '',
    },
  ]);

  const handleAddQuestion = () => {
    if (examData.plannedQuestions && questions.length >= Number(examData.plannedQuestions)) {
      Toast.show({
        type: 'error',
        text1: 'Limit Reached',
        text2: `You can only add up to ${examData.plannedQuestions} questions.`,
      });
      return;
    }
    setQuestions([
      ...questions,
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        marks: '1',
        image: '',
      },
    ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length === 1) {
      Toast.show({
        type: 'error',
        text1: 'Cannot delete',
        text2: 'An exam must have at least one question.',
      });
      return;
    }
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const handleQuestionChange = (text, index, field) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = text;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (text, qIndex, optIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = text;
    setQuestions(newQuestions);
  };

  const handleCorrectAnswerSelect = (qIndex, optIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].correctAnswer = optIndex;
    setQuestions(newQuestions);
  };

  const handleTimeChange = (text, field) => {
    let cleaned = text.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    let numbers = cleaned.replace(/[^0-9]/g, '');
    let letters = cleaned.replace(/[^A-Z]/g, '');

    if (numbers.length > 4) numbers = numbers.substring(0, 4);

    let formatted = '';
    if (numbers.length > 0) {
      let hours = numbers.substring(0, 2);
      if (hours.length === 1 && parseInt(hours, 10) > 1) {
        hours = '0' + hours;
        numbers = hours + numbers.substring(1);
      }
      if (hours.length === 2) {
        let hrInt = parseInt(hours, 10);
        if (hrInt > 12) hours = '12';
        if (hrInt === 0) hours = '12';
      }

      let minutes = numbers.substring(2, 4);
      if (minutes.length === 2) {
        let minInt = parseInt(minutes, 10);
        if (minInt > 59) minutes = '59';
      }

      formatted = hours;
      if (numbers.length > 2) {
        formatted += ':' + minutes;
      }
    }

    if (letters.includes('P')) {
      formatted += ' PM';
    } else if (letters.includes('A')) {
      formatted += ' AM';
    }

    setExamData({ ...examData, [field]: formatted });
  };
  const handleDateChange = (text) => {
    let numbers = text.replace(/[^0-9]/g, '');
    if (numbers.length > 8) numbers = numbers.substring(0, 8);
    
    let formatted = '';
    if (numbers.length > 0) {
      formatted = numbers.substring(0, 4);
    }
    if (numbers.length > 4) {
      formatted += '-' + numbers.substring(4, 6);
    }
    if (numbers.length > 6) {
      formatted += '-' + numbers.substring(6, 8);
    }
    setExamData({ ...examData, date: formatted });
  };

  const convertTo24Hour = (time12h) => {
    if (!time12h) return '';
    const match = time12h.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return time12h;
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const modifier = match[3].toUpperCase();

    if (hours === 12) {
      hours = modifier === 'AM' ? 0 : 12;
    } else if (modifier === 'PM') {
      hours += 12;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  const validateForm = () => {
    if (
      !examData.title ||
      !examData.subject ||
      !examData.duration ||
      !examData.maxMarks ||
      !examData.passingMarks ||
      !examData.startTime ||
      !examData.endTime ||
      !examData.password ||
      !examData.date
    ) {
      Toast.show({
        type: 'error',
        text1: 'Missing fields',
        text2: 'Please fill all required exam details.',
      });
      return false;
    }

    if (questions.length < Number(examData.plannedQuestions)) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Questions',
        text2: `You planned for ${examData.plannedQuestions} questions, but only added ${questions.length}.`,
      });
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question) {
        Toast.show({
          type: 'error',
          text1: 'Missing question',
          text2: `Question ${i + 1} is empty.`,
        });
        return false;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j]) {
          Toast.show({
            type: 'error',
            text1: 'Missing option',
            text2: `Option ${['A', 'B', 'C', 'D'][j]} for question ${i + 1} is empty.`,
          });
          return false;
        }
      }
      if (!q.marks) {
        Toast.show({
          type: 'error',
          text1: 'Missing marks',
          text2: `Marks for question ${i + 1} are missing.`,
        });
        return false;
      }
    }
    return true;
  };

  const handleCreateExam = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    const formattedQuestions = questions.map((q) => ({
      ...q,
      marks: Number(q.marks),
      options: q.options.map(opt => ({ text: opt })),
    }));

    const payload = {
      ...examData,
      startTime: convertTo24Hour(examData.startTime),
      endTime: convertTo24Hour(examData.endTime),
      duration: Number(examData.duration),
      maxMarks: Number(examData.maxMarks),
      passingMarks: Number(examData.passingMarks),
      entryTime: Number(examData.entryTime),
      plannedQuestions: Number(examData.plannedQuestions),
      questions: formattedQuestions,
    };

    try {
      await dispatch(createExam(payload)).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Exam created successfully!',
      });
      dispatch(getTeacherExams());
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.message || 'Failed to create exam',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent={true} backgroundColor="transparent" />
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Exam</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Exam Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.subtext }]}>Title</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. Midterm Mathematics"
              placeholderTextColor={colors.subtext}
              value={examData.title}
              onChangeText={(text) => setExamData({ ...examData, title: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.subtext }]}>Subject</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. Math 101"
              placeholderTextColor={colors.subtext}
              value={examData.subject}
              onChangeText={(text) => setExamData({ ...examData, subject: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.label, { color: colors.subtext, marginBottom: 0 }]}>Available to All Classes (General)</Text>
              <Switch
                value={examData.classGroup === 'General' || !examData.classGroup}
                onValueChange={(val) => {
                  if (val) {
                    setExamData({ ...examData, classGroup: 'General' });
                  } else {
                    setExamData({ ...examData, classGroup: availableClasses.length > 0 ? availableClasses[0].name : '' });
                  }
                }}
                trackColor={{ false: '#334155', true: colors.primaryDark }}
                thumbColor={colors.primary}
              />
            </View>
            
            {examData.classGroup !== 'General' && (
              <>
                <Text style={[styles.label, { color: colors.subtext, marginTop: 8 }]}>Select Specific Classes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 5 }}>
                  {availableClasses.map(c => {
                    const selectedClasses = examData.classGroup ? examData.classGroup.split(',').map(s => s.trim()) : [];
                    const isSelected = selectedClasses.includes(c.name);
                    return (
                      <TouchableOpacity
                        key={c._id || c.name}
                        style={[
                          { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 10, borderColor: colors.border, backgroundColor: colors.card },
                          isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryDark + '33' }
                        ]}
                        onPress={() => {
                          let newClasses = [...selectedClasses];
                          if (newClasses.includes(c.name)) {
                            newClasses = newClasses.filter(n => n !== c.name);
                          } else {
                            newClasses.push(c.name);
                          }
                          setExamData({ ...examData, classGroup: newClasses.join(', ') });
                        }}
                      >
                        <Text style={{ color: isSelected ? colors.primary : colors.subtext, fontWeight: '600' }}>{c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.subtext }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Brief instructions or topics..."
              placeholderTextColor={colors.subtext}
              multiline
              numberOfLines={3}
              value={examData.description}
              onChangeText={(text) => setExamData({ ...examData, description: text })}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.subtext}
                keyboardType="numeric"
                value={examData.date}
                onChangeText={handleDateChange}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Duration (mins)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="60"
                placeholderTextColor={colors.subtext}
                keyboardType="numeric"
                value={examData.duration}
                onChangeText={(text) => setExamData({ ...examData, duration: text })}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Start Time (HH:MM AM/PM)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="10:00 AM"
                placeholderTextColor={colors.subtext}
                value={examData.startTime}
                onChangeText={(text) => handleTimeChange(text, 'startTime')}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>End Time (HH:MM AM/PM)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="11:00 AM"
                placeholderTextColor={colors.subtext}
                value={examData.endTime}
                onChangeText={(text) => handleTimeChange(text, 'endTime')}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Last Entry Time (mins)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="15"
                placeholderTextColor={colors.subtext}
                keyboardType="numeric"
                value={examData.entryTime}
                onChangeText={(text) => setExamData({ ...examData, entryTime: text })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Exam Password</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Secret123"
                placeholderTextColor={colors.subtext}
                secureTextEntry
                value={examData.password}
                onChangeText={(text) => setExamData({ ...examData, password: text })}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Max Marks</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="100"
                placeholderTextColor={colors.subtext}
                keyboardType="numeric"
                value={examData.maxMarks}
                onChangeText={(text) => setExamData({ ...examData, maxMarks: text })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Passing Marks</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="40"
                placeholderTextColor={colors.subtext}
                keyboardType="numeric"
                value={examData.passingMarks}
                onChangeText={(text) => setExamData({ ...examData, passingMarks: text })}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Planned Questions</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="10"
                placeholderTextColor={colors.subtext}
                keyboardType="numeric"
                value={examData.plannedQuestions}
                onChangeText={(text) => setExamData({ ...examData, plannedQuestions: text })}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }} />
          </View>

          {/* Advanced Features Toggles */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10, fontSize: 16 }]}>Advanced Options</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, width: '48%' }}>
              <Switch
                value={examData.allowCalculator}
                onValueChange={(val) => setExamData({ ...examData, allowCalculator: val })}
                trackColor={{ false: '#334155', true: '#8b5cf6' }}
              />
              <Text style={{ color: colors.text, marginLeft: 8 }}>Calculator</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, width: '48%' }}>
              <Switch
                value={examData.fullscreenMode}
                onValueChange={(val) => setExamData({ ...examData, fullscreenMode: val })}
                trackColor={{ false: '#334155', true: '#8b5cf6' }}
              />
              <Text style={{ color: colors.text, marginLeft: 8 }}>Full Screen</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, width: '48%' }}>
              <Switch
                value={examData.enableCamera}
                onValueChange={(val) => setExamData({ ...examData, enableCamera: val })}
                trackColor={{ false: '#334155', true: '#8b5cf6' }}
              />
              <Text style={{ color: colors.text, marginLeft: 8 }}>Req. Camera</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, width: '48%' }}>
              <Switch
                value={examData.enableMicrophone}
                onValueChange={(val) => setExamData({ ...examData, enableMicrophone: val })}
                trackColor={{ false: '#334155', true: '#8b5cf6' }}
              />
              <Text style={{ color: colors.text, marginLeft: 8 }}>Req. Mic</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Questions</Text>
          <Text style={{ color: colors.subtext, fontSize: 14 }}>
            Current: {questions.length} / Planned: {examData.plannedQuestions || '0'}
          </Text>
        </View>

        {questions.map((q, qIndex) => (
          <View key={qIndex} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <Text style={[styles.questionTitle, { color: colors.text }]}>Question {qIndex + 1}</Text>
              <TouchableOpacity onPress={() => handleRemoveQuestion(qIndex)} style={styles.deleteButton}>
                <Feather name="trash-2" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 16 }]}
              placeholder="Type question here..."
              placeholderTextColor={colors.subtext}
              multiline
              numberOfLines={3}
              value={q.question}
              onChangeText={(text) => handleQuestionChange(text, qIndex, 'question')}
            />

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.subtext }]}>Question Image URL (Optional)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 16 }]}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={colors.subtext}
                value={q.image}
                onChangeText={(text) => handleQuestionChange(text, qIndex, 'image')}
              />
            </View>

            <View style={styles.optionsContainer}>
              {q.options.map((opt, optIndex) => (
                <View key={optIndex} style={styles.optionRow}>
                  <TouchableOpacity
                    style={[
                      styles.radioCircle,
                      { borderColor: q.correctAnswer === optIndex ? colors.primary : colors.border },
                    ]}
                    onPress={() => handleCorrectAnswerSelect(qIndex, optIndex)}
                  >
                    {q.correctAnswer === optIndex && (
                      <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.optionLabel, { color: colors.subtext }]}>
                    {['A', 'B', 'C', 'D'][optIndex]}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.optionInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder={`Option ${['A', 'B', 'C', 'D'][optIndex]}`}
                    placeholderTextColor={colors.subtext}
                    value={opt}
                    onChangeText={(text) => handleOptionChange(text, qIndex, optIndex)}
                  />
                </View>
              ))}
            </View>

            <View style={[styles.inputGroup, { marginTop: 16, width: '50%' }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Marks</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="1"
                placeholderTextColor={colors.subtext}
                keyboardType="numeric"
                value={q.marks}
                onChangeText={(text) => handleQuestionChange(text, qIndex, 'marks')}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 }]}
          onPress={handleAddQuestion}
        >
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Another Question</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateExam}
          disabled={isLoading || isSubmitting}
        >
          {(isLoading || isSubmitting) ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check-circle" size={20} color="#ffffff" style={styles.submitIcon} />
              <Text style={styles.submitButtonText}>Create Exam</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  optionsContainer: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioDot: {
    height: 12,
    width: 12,
    borderRadius: 6,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    width: 24,
  },
  optionInput: {
    flex: 1,
    paddingVertical: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default CreateExamScreen;
