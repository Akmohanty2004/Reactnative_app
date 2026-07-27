import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, StatusBar,
  Image, Linking, Modal, Alert, Dimensions, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { io } from 'socket.io-client';
import { Audio } from 'expo-av';
import EmojiPicker from 'rn-emoji-keyboard';
import {
  getChatHistory, sendMessage, receiveMessage,
  setCurrentUserId, deleteMessage, removeMessageLocally,
} from '../../redux/slices/chatSlice';
import { BarChart } from 'react-native-chart-kit';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const getImageUrl = (path) => {
  if (!path) return null;
  if (typeof path !== 'string') return null;
  if (path.startsWith('data:') || path.startsWith('file://')) return path;
  const normalized = path.replace(/\\/g, '/');
  if (normalized.includes('uploads/')) {
    const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';
    const cleanPath = normalized.replace(/^.*(uploads\/)/, 'uploads/');
    return `${baseUrl}/${cleanPath.replace(/^\//, '')}`;
  }
  if (path.startsWith('http')) return path;
  const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';
  return `${baseUrl}/${normalized.replace(/^\//, '')}`;
};

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const isSameDay = (a, b) => {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
};

const dayLabel = (date) => {
  const d = new Date(date);
  const now = new Date();
  if (isSameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const AudioMessage = ({ uri, isMe }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playSound = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: getImageUrl(uri) },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch (err) {
      console.log('Audio playback error (old file):', err.message || err);
      Alert.alert('Audio Unavailable', 'This older audio file is not available on the server. New voice messages will work normally.');
    }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  return (
    <TouchableOpacity style={styles.audioBubbleRow} onPress={playSound}>
      <Feather name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
      <View style={styles.audioWaveform}>
        <View style={[styles.audioProgress, { width: isPlaying ? '60%' : '0%' }]} />
      </View>
      <Feather name="mic" size={16} color="rgba(255,255,255,0.7)" />
    </TouchableOpacity>
  );
};

export default function ChatRoomScreen({ route, navigation }) {
  const { user: otherUser } = route.params;
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { user } = useSelector(s => s.auth);
  const { messagesByUserId, isSending } = useSelector(s => s.chat);

  const [inputText, setInputText] = useState('');
  const [isOnline, setIsOnline] = useState(otherUser?.isOnline || false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [studentStats, setStudentStats] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // New features state
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [fullScreenImg, setFullScreenImg] = useState(null);
  const [stagedImage, setStagedImage] = useState(null);
  const [stagedAudio, setStagedAudio] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef(null);

  const flatListRef = useRef(null);

  const otherIdStr = String(otherUser._id);
  const messages = messagesByUserId[otherIdStr] || [];

  useEffect(() => {
    dispatch(setCurrentUserId(String(user._id)));
    dispatch(getChatHistory(otherIdStr));

    const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';
    const newSocket = io(baseUrl);

    const joinRoom = () => {
      if (user?._id) {
        newSocket.emit('join_room', user._id);
      }
    };
    if (newSocket.connected) {
      joinRoom();
    }
    newSocket.on('connect', joinRoom);
    newSocket.on('receive_message', (msg) => dispatch(receiveMessage(msg)));
    newSocket.on('delete_message', (msgId) =>
      dispatch(removeMessageLocally({ messageId: msgId, otherUserId: otherUser._id })));
    newSocket.on('user_online', (uid) => { if (uid === otherUser._id) setIsOnline(true); });
    newSocket.on('user_offline', (uid) => { if (uid === otherUser._id) setIsOnline(false); });

    return () => newSocket.disconnect();
  }, [dispatch, otherUser._id, user._id]);

  const handleSend = async () => {
    try {
      if (stagedAudio) {
        const res = await dispatch(sendMessage({
          receiverId: otherUser._id,
          messageType: 'audio',
          audioUrl: stagedAudio.base64,
          audio: stagedAudio
        })).unwrap();
        setStagedAudio(null);
      } else if (stagedImage) {
        const res = await dispatch(sendMessage({
          receiverId: otherUser._id,
          messageType: 'image',
          content: inputText.trim(),
          imageUrl: stagedImage.base64,
          image: stagedImage
        })).unwrap();
        setStagedImage(null);
        setInputText('');
      } else if (inputText.trim()) {
        const res = await dispatch(sendMessage({
          receiverId: otherUser._id,
          content: inputText.trim(),
          messageType: 'text'
        })).unwrap();
        setInputText('');
      }
    } catch (err) {
      Alert.alert('Send Failed', err || 'Could not send message. Please try again.');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image';
      const base64 = result.assets[0].base64 ? `data:${type};base64,${result.assets[0].base64}` : null;
      
      setStagedImage({ uri, name: filename, type, base64 });
      setStagedAudio(null);
    }
  };

  const startRecording = async () => {
    try {
      if (recordingRef.current) return;
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = newRecording;
        setRecording(newRecording);
        setIsRecording(true);
      } else {
        Alert.alert('Permission needed', 'Please grant microphone access to record voice messages.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      // Clean up ref if failed
      recordingRef.current = null;
      setIsRecording(false);
      setRecording(null);
    }
  };

  const stopRecording = async () => {
    try {
      const currentRecording = recordingRef.current;
      if (!currentRecording) return;
      
      setIsRecording(false);
      recordingRef.current = null;
      setRecording(null);
      
      await currentRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const uri = currentRecording.getURI();
      
      if (uri) {
        const filename = uri.split('/').pop() || 'audio.m4a';
        const match = /\.(\w+)$/.exec(filename);
        let type = 'audio/m4a';
        if (match) {
          const ext = match[1].toLowerCase();
          if (ext === 'mp4' || ext === 'm4a') type = 'audio/mp4';
          else if (ext === '3gp') type = 'audio/3gpp';
          else if (ext === 'caf') type = 'audio/x-caf';
          else if (ext === 'aac') type = 'audio/aac';
          else if (ext === 'mp3') type = 'audio/mpeg';
        }
        let base64 = null;
        try {
          const base64Str = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType?.Base64 || 'base64' });
          if (base64Str) {
            base64 = `data:${type};base64,${base64Str}`;
          }
        } catch (readErr) {
          console.error('Could not read audio file as base64', readErr);
        }
        setStagedAudio({ uri, name: filename, type, base64 });
        setStagedImage(null);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsRecording(false);
      recordingRef.current = null;
      setRecording(null);
    }
  };

  const handleShowReport = async () => {
    setMenuVisible(false);
    setReportVisible(true);
    if (otherUser.role === 'student') {
      setReportLoading(true);
      try {
        const res = await api.get(`/api/results/student/${otherUser._id}`);
        setStudentStats(res.data.results || []);
      } catch { } finally { setReportLoading(false); }
    }
  };

  const handleLongPress = (item, isMe) => {
    const options = [{ text: 'Cancel', style: 'cancel' }];
    if (item.messageType === 'text' && item.content) {
      options.push({ text: 'Copy', onPress: async () => await Clipboard.setStringAsync(item.content) });
    }
    if (isMe) {
      options.push({
        text: 'Delete', style: 'destructive',
        onPress: () => Alert.alert('Delete Message', 'Delete this message?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteMessage({ messageId: item._id, otherUserId: otherUser._id })) },
        ]),
      });
    }
    if (options.length > 1) Alert.alert('Message Options', 'Choose an action', options);
  };

  /* ── Build list items with date separators ── */
  const buildListData = () => {
    const sorted = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const result = [];
    let lastDate = null;
    sorted.forEach((msg) => {
      const label = dayLabel(msg.createdAt);
      if (label !== lastDate) {
        result.push({ type: 'separator', id: `sep-${msg._id}`, label });
        lastDate = label;
      }
      result.push({ type: 'message', ...msg });
    });
    return result.reverse(); // inverted FlatList
  };

  const listData = buildListData();

  const renderItem = ({ item }) => {
    if (item.type === 'separator') {
      return (
        <View style={styles.separator}>
          <Text style={styles.separatorText}>{item.label}</Text>
        </View>
      );
    }

    const senderId = typeof item.sender === 'object' ? item.sender._id : item.sender;
    const myId = user._id || user.id;
    const isMe = String(senderId) === String(myId);

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {/* Other person's avatar */}
        {!isMe && (
          <View style={styles.avatarWrap}>
            {otherUser.profileImage ? (
              <Image source={{ uri: getImageUrl(otherUser.profileImage) }} style={styles.msgAvatar} />
            ) : (
              <View style={[styles.msgAvatar, styles.msgAvatarPlaceholder]}>
                <Text style={styles.msgAvatarText}>{otherUser.name?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {isOnline && <View style={styles.msgAvatarDot} />}
          </View>
        )}

        <TouchableOpacity
          style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
          onLongPress={() => handleLongPress(item, isMe)}
          delayLongPress={500}
          activeOpacity={0.85}
        >
          {item.messageType === 'text' && (
            <Text style={styles.bubbleText}>{item.content}</Text>
          )}
          {item.messageType === 'image' && item.imageUrl && (
            <TouchableOpacity onPress={() => setFullScreenImg(getImageUrl(item.imageUrl))} activeOpacity={0.9}>
              <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.bubbleImage} resizeMode="contain" />
            </TouchableOpacity>
          )}
          {item.messageType === 'audio' && item.audioUrl && (
            <AudioMessage uri={item.audioUrl} isMe={isMe} />
          )}
          {item.messageType === 'meeting' && (
            <View style={styles.meetingCard}>
              <Feather name="video" size={24} color="#8b5cf6" />
              <Text style={styles.meetingTitle}>Live Meeting</Text>
              <TouchableOpacity style={styles.joinBtn} onPress={() => Linking.openURL(item.meetingLink)}>
                <Text style={styles.joinBtnText}>Join Now</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.bubbleMeta}>
            <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
            {isMe && (
              <Feather
                name="check"
                size={13}
                color={item.isRead ? '#34d399' : 'rgba(255,255,255,0.55)'}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 30) + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerProfile}>
          {otherUser.profileImage ? (
            <Image source={{ uri: getImageUrl(otherUser.profileImage) }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Text style={styles.headerAvatarText}>{otherUser.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {isOnline && <View style={styles.headerOnlineDot} />}
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerName}>{otherUser.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34d399' : '#94a3b8' }]} />
              <Text style={styles.headerStatus}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </View>

        {/* 3-dot menu only — no call/video */}
        <TouchableOpacity style={styles.headerMenuBtn} onPress={() => setMenuVisible(true)}>
          <Feather name="more-vertical" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={listData}
          inverted
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        {/* Preview Staged File */}
        {(stagedImage || stagedAudio) && (
          <View style={styles.previewContainer}>
            {stagedImage && (
              <Image source={{ uri: stagedImage.uri }} style={styles.previewImage} />
            )}
            {stagedAudio && (
              <View style={styles.previewAudio}>
                <Feather name="mic" size={24} color="#8b5cf6" />
                <Text style={{ color: '#fff', marginLeft: 10 }}>Voice Message Staged</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.previewCloseBtn} 
              onPress={() => { setStagedImage(null); setStagedAudio(null); }}
            >
              <Feather name="x" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input Bar ── */}
        <View style={styles.inputBar}>
          {/* image button */}
          <TouchableOpacity style={styles.plusBtn} onPress={handlePickImage}>
            <Feather name="image" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Text input with emoji icon */}
          <View style={[styles.inputWrap, isRecording && styles.inputWrapRecording]}>
            {isRecording ? (
              <View style={styles.recordingRow}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording voice message...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={() => setEmojiOpen(true)}>
                  <Feather name="smile" size={20} color="#64748b" style={{ marginLeft: 10 }} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type a message..."
                  placeholderTextColor="#64748b"
                  multiline
                />
              </>
            )}
          </View>

          {/* Conditional Mic or Send button */}
          {(inputText.trim() || stagedImage || stagedAudio) && !isRecording ? (
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSend}
              disabled={isSending}
            >
              <Feather name="send" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.micBtn, isRecording && styles.micBtnRecording]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Feather name="mic" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Emoji Keyboard */}
      <EmojiPicker 
        onEmojiSelected={(emojiObject) => setInputText(prev => prev + emojiObject.emoji)}
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        theme={{
          backdrop: 'rgba(0,0,0,0.5)',
          container: '#1e293b',
          header: '#fff',
          search: { background: '#0f172a', text: '#fff' }
        }}
      />

      {/* Fullscreen Image Viewer Modal */}
      <Modal visible={!!fullScreenImg} transparent animationType="fade">
        <View style={styles.fullScreenOverlay}>
          <TouchableOpacity style={styles.fullScreenCloseBtn} onPress={() => setFullScreenImg(null)}>
            <Feather name="x" size={30} color="#fff" />
          </TouchableOpacity>
          {fullScreenImg && (
            <Image source={{ uri: fullScreenImg }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* ── 3-dot dropdown ── */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleShowReport}>
              <Feather name="bar-chart-2" size={18} color="#fff" style={{ marginRight: 12 }} />
              <Text style={styles.menuItemText}>View Report</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Report Modal ── */}
      <Modal visible={reportVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{otherUser.name}'s Report</Text>
              <TouchableOpacity onPress={() => setReportVisible(false)}>
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Overall Performance Analysis</Text>
            {reportLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={{ color: '#94a3b8', marginTop: 10 }}>Analyzing records...</Text>
              </View>
            ) : otherUser.role !== 'student' ? (
              <View style={styles.centered}>
                <Feather name="info" size={40} color="#64748b" style={{ marginBottom: 10 }} />
                <Text style={{ color: '#94a3b8' }}>Reports only available for students.</Text>
              </View>
            ) : studentStats && studentStats.length > 0 ? (
              <View>
                <View style={styles.statsRow}>
                  {[
                    { label: 'Exams', val: studentStats.length },
                    { label: 'Avg Score', val: `${Math.round(studentStats.reduce((a, c) => a + c.percentage, 0) / studentStats.length)}%` },
                    { label: 'Passed', val: studentStats.filter(r => r.percentage >= (r.examId?.passingMarks || 40)).length },
                  ].map((s, i) => (
                    <View key={i} style={styles.statBox}>
                      <Text style={styles.statBoxLabel}>{s.label}</Text>
                      <Text style={styles.statBoxVal}>{s.val}</Text>
                    </View>
                  ))}
                </View>
                <BarChart
                  data={{
                    labels: studentStats.slice(0, 4).map(r => (r.examId?.title || 'Exam').substring(0, 5) + '..'),
                    datasets: [{ data: studentStats.slice(0, 4).map(r => Math.round(r.percentage || 0)) }],
                  }}
                  width={width - 80}
                  height={200}
                  yAxisSuffix="%"
                  chartConfig={{
                    backgroundGradientFrom: '#1e293b',
                    backgroundGradientTo: '#1e293b',
                    decimalPlaces: 0,
                    color: (op = 1) => `rgba(139,92,246,${op})`,
                    labelColor: (op = 1) => `rgba(255,255,255,${op})`,
                    barPercentage: 0.6,
                  }}
                  style={{ borderRadius: 16, marginTop: 16 }}
                />
              </View>
            ) : (
              <View style={styles.centered}>
                <Feather name="inbox" size={40} color="#64748b" style={{ marginBottom: 10 }} />
                <Text style={{ color: '#94a3b8' }}>No exam results found.</Text>
              </View>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setReportVisible(false)}>
              <Text style={styles.closeBtnText}>Close Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d1117' },

  /* header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: '#161b22', borderBottomWidth: 1, borderBottomColor: '#21262d',
  },
  backBtn: { marginRight: 8, padding: 4 },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#6366f1' },
  headerAvatarFallback: { backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerOnlineDot: {
    position: 'absolute', bottom: 0, left: 30,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#34d399', borderWidth: 2, borderColor: '#161b22',
  },
  headerName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  headerStatus: { color: '#94a3b8', fontSize: 12 },
  headerMenuBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(99,102,241,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  /* list */
  list: { paddingHorizontal: 12, paddingVertical: 12 },

  /* date separator */
  separator: { alignItems: 'center', marginVertical: 12 },
  separatorText: {
    color: '#94a3b8', fontSize: 12, fontWeight: '600',
    backgroundColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 12, overflow: 'hidden',
  },

  /* message rows */
  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },

  avatarWrap: { position: 'relative', marginRight: 8 },
  msgAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#6366f1' },
  msgAvatarPlaceholder: { backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  msgAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  msgAvatarDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#34d399', borderWidth: 2, borderColor: '#0d1117',
  },

  /* bubbles */
  bubble: { maxWidth: '72%', borderRadius: 18, padding: 12 },
  bubbleMe: { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleImage: { width: 240, height: 240, borderRadius: 10, marginBottom: 4, backgroundColor: 'rgba(0,0,0,0.15)' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  bubbleTime: { color: 'rgba(255,255,255,0.55)', fontSize: 10 },

  previewContainer: {
    backgroundColor: '#1e293b',
    padding: 10,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative'
  },
  previewImage: { width: 60, height: 60, borderRadius: 8 },
  previewAudio: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 10, borderRadius: 8, flex: 1 },
  previewCloseBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#ef4444', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 2, borderColor: '#0d1117' },

  audioBubbleRow: { flexDirection: 'row', alignItems: 'center', width: 160, paddingVertical: 4 },
  audioWaveform: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10, borderRadius: 2 },
  audioProgress: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },

  meetingCard: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 14, borderRadius: 12, alignItems: 'center', width: 200 },
  meetingTitle: { color: '#fff', fontWeight: 'bold', marginTop: 8, marginBottom: 12 },
  joinBtn: { backgroundColor: '#8b5cf6', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, width: '100%', alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: 'bold' },

  /* input bar */
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#161b22', borderTopWidth: 1, borderTopColor: '#21262d',
    gap: 8,
  },
  plusBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center',
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 22, minHeight: 44, maxHeight: 100,
    borderWidth: 1, borderColor: '#334155',
  },
  inputWrapRecording: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' },
  recordingRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginRight: 10 },
  recordingText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  input: {
    flex: 1, color: '#fff', fontSize: 15,
    paddingHorizontal: 10, paddingVertical: 10,
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center',
  },
  micBtnRecording: { backgroundColor: '#ef4444', transform: [{ scale: 1.1 }] },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center',
  },

  /* 3-dot menu */
  menuOverlay: { flex: 1 },
  menuDropdown: {
    position: 'absolute', top: 80, right: 12,
    backgroundColor: '#1e293b', borderRadius: 12,
    borderWidth: 1, borderColor: '#334155',
    paddingVertical: 6, minWidth: 160,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  menuItemText: { color: '#fff', fontSize: 15 },

  /* full screen image modal */
  fullScreenOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullScreenCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 25 },
  fullScreenImage: { width: '100%', height: '100%' },

  /* report modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', width: '100%', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalSub: { fontSize: 13, color: '#94a3b8', marginBottom: 16 },
  centered: { height: 180, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 12, width: '31%', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statBoxLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  statBoxVal: { color: '#8b5cf6', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
