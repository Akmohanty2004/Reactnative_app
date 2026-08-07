import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Easing,
  PanResponder
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { GEMINI_API_KEY } from '../config/keys';

const { height, width } = Dimensions.get('window');

const PREDEFINED_RESPONSES = {
  greetings: ['hi', 'hello', 'hey', 'good morning', 'good evening'],
  student: {
    exam: ['When is my next exam?', 'Check my upcoming exams in the Home dashboard.', 'What if I miss an exam?', 'Please contact your teacher for rescheduling.'],
    grade: ['How do I check my grade?', 'Navigate to the Results section to see your published grades.', 'Why is my grade pending?', 'The teacher might be evaluating descriptive answers.'],
    cheat: ['Give me the answers', 'I cannot provide exam answers.', 'What is the answer for question 1?', 'I am not allowed to assist you with active test questions.', 'Can you solve this for me?', 'As a student, you must complete your own work.']
  },
  teacher: {
    create: ['How do I make a test?', 'Go to the Create Exam section from your dashboard.', 'Can I add an image to a question?', 'Yes, click the camera icon when adding a question.'],
    evaluate: ['How do I grade students?', 'Go to Results, and click on an exam that requires manual evaluation.', 'Where are the student requests?', 'Check Class Requests in the side menu.']
  },
  admin: {
    users: ['How do I add a user?', 'Go to the Users section in the Admin panel.', 'How do I check logs?', 'Activity Logs are available in the dashboard.'],
    system: ['Is the system healthy?', 'All systems are operational.', 'How many active exams are there?', 'Check the main metrics on your admin dashboard.']
  },
  privacy: ['password', 'phone number', 'email address', 'address', 'personal information']
};

export default function GlobalChatbot({ currentRouteName }) {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.ui || { theme: 'dark' });
  const isDarkMode = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef();

  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        // If finger barely moved, treat it as a tap!
        if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
          setIsOpen(true);
        }
      }
    })
  ).current;

  // Hide the chatbot entirely if the user is on the 'Exam' route
  const isExamActive = currentRouteName === 'Exam' || currentRouteName === 'ExamScreen';

  useEffect(() => {
    if (isAuthenticated && !isExamActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -10, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    }
  }, [isAuthenticated, isExamActive]);

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
      
      if (messages.length === 0) {
        setMessages([
          { id: '1', text: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your AI Assistant. How can I help you today?`, sender: 'bot', timestamp: new Date() }
        ]);
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true, easing: Easing.in(Easing.exp) }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    }
  }, [isOpen]);

  const generateResponse = async (text) => {
    const role = user?.role || 'student';
    const userName = user?.name?.split(' ')[0] || 'User';

    if (GEMINI_API_KEY === 'PASTE_YOUR_GEMINI_API_KEY_HERE' || !GEMINI_API_KEY) {
      return "Please configure your GEMINI_API_KEY in src/config/keys.js to activate the Real AI!";
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpful AI assistant for an online exam platform.
The user you are speaking to is named ${userName} and their role is: ${role}.
Always keep your answers very short, concise, and friendly. Do not use markdown since it won't render well in this simple chat.

STRICT RULES:
1. If the user is a student, you must NEVER give them answers to exam questions, even if they beg.
2. If the user asks for passwords, phone numbers, or personal info, refuse due to privacy policies.
3. Guide the user based on their role (Students take exams and view grades, Teachers create exams and evaluate, Admins manage users and logs).

User message: "${text}"`
            }]
          }]
        })
      });

      const data = await response.json();
      if (data.error) {
        console.warn('API Error:', data.error.message);
        if (data.error.message && data.error.message.toLowerCase().includes('api key')) {
          return "Error: Your Gemini API Key is invalid! Please update it in src/config/keys.js";
        }
        if (data.error.code === 503) {
          return "The AI is currently experiencing very high demand. Please try again in a few moments!";
        }
        return `API Error: ${data.error.message || 'Unknown error occurred.'}`;
      }
      if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
      }
      return "I'm sorry, I encountered an error understanding that.";
    } catch (error) {
      console.error('AI Error:', error);
      return "I'm having trouble connecting to the AI server. Please check your internet connection.";
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const newUserMsg = { id: Date.now().toString(), text: inputText.trim(), sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    const responseText = await generateResponse(newUserMsg.text);
    
    const newBotMsg = { id: (Date.now() + 1).toString(), text: responseText, sender: 'bot', timestamp: new Date() };
    setMessages(prev => [...prev, newBotMsg]);
    setIsTyping(false);
  };

  if (!isAuthenticated || isExamActive) return null;

  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    card: isDarkMode ? '#000000' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    primary: '#6366f1',
    botMsgBg: isDarkMode ? '#1e293b' : '#e2e8f0',
    userMsgBg: '#6366f1',
    border: isDarkMode ? '#334155' : '#e2e8f0',
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <Animated.View 
          {...panResponder.panHandlers}
          style={[
            styles.fabContainer, 
            { 
              transform: [
                { translateX: pan.x }, 
                { translateY: Animated.add(pan.y, bounceAnim) }
              ] 
            }
          ]}
        >
          <View style={[styles.fab, { shadowColor: colors.primary }]}>
            <Feather name="message-circle" size={32} color="#ffffff" />
            <View style={styles.fabDot} />
          </View>
        </Animated.View>
      )}

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.modalOverlayBg, { opacity: fadeAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsOpen(false)} />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.chatContainer, 
              { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Header */}
            <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={styles.botAvatar}>
                  <Feather name="cpu" size={20} color="#ffffff" />
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
                  <Text style={[styles.headerSub, { color: colors.subText }]}>Always here to help</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView 
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              style={styles.messagesList}
              contentContainerStyle={{ padding: 15 }}
            >
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <View key={msg.id} style={[styles.messageBubbleWrapper, isUser ? styles.msgRight : styles.msgLeft]}>
                    {!isUser && (
                      <View style={[styles.smallBotAvatar, { backgroundColor: colors.primary }]}>
                        <Feather name="cpu" size={12} color="#fff" />
                      </View>
                    )}
                    <View style={[
                      styles.messageBubble, 
                      isUser ? { backgroundColor: colors.userMsgBg, borderBottomRightRadius: 4 } : { backgroundColor: colors.botMsgBg, borderBottomLeftRadius: 4 }
                    ]}>
                      <Text style={[styles.messageText, { color: isUser ? '#ffffff' : colors.text }]}>{msg.text}</Text>
                    </View>
                  </View>
                );
              })}
              {isTyping && (
                <View style={[styles.messageBubbleWrapper, styles.msgLeft]}>
                  <View style={[styles.smallBotAvatar, { backgroundColor: colors.primary }]}>
                    <Feather name="cpu" size={12} color="#fff" />
                  </View>
                  <View style={[styles.messageBubble, { backgroundColor: colors.botMsgBg, borderBottomLeftRadius: 4, width: 60, alignItems: 'center' }]}>
                     <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.input, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', color: colors.text }]}
                placeholder="Ask me anything..."
                placeholderTextColor={colors.subText}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity 
                style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.subText }]}
                onPress={handleSend}
                disabled={!inputText.trim()}
              >
                <Feather name="send" size={18} color="#ffffff" style={{ marginLeft: -2 }} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 9999,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fabDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#6366f1'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  chatContainer: {
    flex: 1,
    maxHeight: height * 0.8,
    marginTop: height * 0.1, // Ensures a gap at the top so it doesn't cover the whole screen
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 5,
  },
  messagesList: {
    flex: 1,
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  msgLeft: {
    justifyContent: 'flex-start',
    paddingRight: 50,
  },
  msgRight: {
    justifyContent: 'flex-end',
    paddingLeft: 50,
  },
  smallBotAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    fontSize: 15,
    marginRight: 12,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
