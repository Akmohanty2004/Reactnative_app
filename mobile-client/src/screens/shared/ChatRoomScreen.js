import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, StatusBar,
  Image, Linking, Modal, Alert, Dimensions, ActivityIndicator,
  ImageBackground, PanResponder, Animated, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { Audio } from 'expo-av';
import EmojiPicker from 'rn-emoji-keyboard';
import {
  getChatHistory, sendMessage, receiveMessage,
  setCurrentUserId, deleteMessage, removeMessageLocally, addOptimisticMessage
} from '../../redux/slices/chatSlice';
import { toggleTheme } from '../../redux/slices/uiSlice';
import { BarChart } from 'react-native-chart-kit';
import api from '../../services/api';

const { width, height } = Dimensions.get('window');

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

const ZoomableImage = ({ uri, width, height, onZoomChange }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const initialDist = useRef(null);
  const lastTap = useRef(0);

  const getDistance = (touches) => {
    if (!touches || touches.length < 2) return 0;
    const [t1, t2] = touches;
    const x1 = t1.pageX ?? t1.locationX ?? t1.screenX ?? 0;
    const y1 = t1.pageY ?? t1.locationY ?? t1.screenY ?? 0;
    const x2 = t2.pageX ?? t2.locationX ?? t2.screenX ?? 0;
    const y2 = t2.pageY ?? t2.locationY ?? t2.screenY ?? 0;
    return Math.hypot(x2 - x1, y2 - y1);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt, gestureState) => {
        return evt.nativeEvent.touches.length >= 2 || (gestureState && gestureState.numberActiveTouches >= 2) || lastScale.current > 1;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return evt.nativeEvent.touches.length >= 2 || (gestureState && gestureState.numberActiveTouches >= 2) || lastScale.current > 1;
      },
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          if (lastScale.current > 1) {
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
            lastScale.current = 1;
            if (onZoomChange) onZoomChange(false);
          } else {
            Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start();
            lastScale.current = 2.5;
            if (onZoomChange) onZoomChange(true);
          }
          lastTap.current = 0;
          return;
        }
        lastTap.current = now;

        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          initialDist.current = getDistance(touches);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        const activeCount = (gestureState && gestureState.numberActiveTouches) || (touches && touches.length) || 0;
        if (activeCount >= 2 && touches && touches.length >= 2) {
          const currentDist = getDistance(touches);
          if (currentDist === 0) return;
          if (!initialDist.current) {
            initialDist.current = currentDist;
            return;
          }
          const ratio = currentDist / initialDist.current;
          let newScale = lastScale.current * ratio;
          newScale = Math.max(1, Math.min(newScale, 4));
          scale.setValue(newScale);
          if (newScale > 1.05 && onZoomChange) onZoomChange(true);
          else if (newScale <= 1.05 && onZoomChange) onZoomChange(false);
        }
      },
      onPanResponderRelease: () => {
        scale.stopAnimation((value) => {
          lastScale.current = Math.max(1, Math.min(value, 4));
          if (lastScale.current <= 1.05) {
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
            lastScale.current = 1;
            if (onZoomChange) onZoomChange(false);
          } else {
            if (onZoomChange) onZoomChange(true);
          }
        });
        initialDist.current = null;
      },
      onPanResponderTerminate: () => {
        initialDist.current = null;
      },
    })
  ).current;

  return (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }} {...panResponder.panHandlers}>
      <Animated.Image
        source={{ uri }}
        style={{
          width,
          height,
          transform: [{ scale }],
        }}
        resizeMode="contain"
      />
    </View>
  );
};

const formatSecs = (sec) => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const AudioMessage = ({ uri, isMe, onLongPress }) => {
  const { theme } = useSelector(s => s.ui || { theme: 'dark' });
  const isDarkMode = theme === 'dark';
  const useDarkTheme = !isMe && !isDarkMode;

  const iconColor = useDarkTheme ? '#1f2937' : '#fff';
  const textColor = useDarkTheme ? '#1f2937' : 'rgba(255,255,255,0.9)';
  const micColor = useDarkTheme ? 'rgba(31,41,55,0.7)' : 'rgba(255,255,255,0.7)';
  const waveformBg = useDarkTheme ? 'rgba(31,41,55,0.2)' : 'rgba(255,255,255,0.3)';
  const progressBg = useDarkTheme ? '#8b5cf6' : '#fff';

  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    let mounted = true;
    let s = null;
    const loadMetadata = async () => {
      try {
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: getImageUrl(uri) },
          { shouldPlay: false }
        );
        if (!mounted) {
          newSound.unloadAsync();
          return;
        }
        s = newSound;
        setSound(newSound);
        if (status && status.durationMillis) {
          setDuration(Math.round(status.durationMillis / 1000));
        }
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (!mounted) return;
          if (status.isLoaded) {
            if (status.durationMillis) {
              setDuration(Math.round(status.durationMillis / 1000));
            }
            if (status.positionMillis !== undefined) {
              setPosition(Math.round(status.positionMillis / 1000));
            }
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        });
      } catch (err) {
        // ignore preload error
      }
    };
    loadMetadata();
    return () => {
      mounted = false;
      if (s) s.unloadAsync();
    };
  }, [uri]);

  const playSound = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playFromPositionAsync(position * 1000 || 0);
          setIsPlaying(true);
        }
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: getImageUrl(uri) },
          { shouldPlay: true }
        );
        setSound(newSound);
        if (status && status.durationMillis) {
          setDuration(Math.round(status.durationMillis / 1000));
        }
        setIsPlaying(true);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.durationMillis) {
              setDuration(Math.round(status.durationMillis / 1000));
            }
            if (status.positionMillis !== undefined) {
              setPosition(Math.round(status.positionMillis / 1000));
            }
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        });
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      Alert.alert('Audio Unavailable', 'This audio file is not available on the server. Please record and send a new voice message.');
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <TouchableOpacity style={styles.audioBubbleRow} onPress={playSound} onLongPress={onLongPress}>
      <Feather name={isPlaying ? "pause" : "play"} size={22} color={iconColor} />
      <View style={{ flex: 1, marginLeft: 10, marginRight: 10 }}>
        <View style={[styles.audioWaveform, { backgroundColor: waveformBg }]}>
          <View style={[styles.audioProgress, { backgroundColor: progressBg, width: `${isPlaying || position > 0 ? progressPercent : 0}%` }]} />
        </View>
        <Text style={{ color: textColor, fontSize: 11, marginTop: 4, fontWeight: '600' }}>
          {isPlaying || position > 0 ? `${formatSecs(position)} / ${formatSecs(duration)}` : `${formatSecs(duration)}`}
        </Text>
      </View>
      <Feather name="mic" size={16} color={micColor} />
    </TouchableOpacity>
  );
};

export default function ChatRoomScreen({ route, navigation }) {
  const { user: otherUser } = route.params;
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { user } = useSelector(s => s.auth);
  const { messagesByUserId, isSending } = useSelector(s => s.chat);
  const { theme } = useSelector(s => s.ui || { theme: 'dark' });

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#0d1117' : '#f4f6f9',
    headerBg: isDarkMode ? '#161b22' : '#ffffff',
    headerText: isDarkMode ? '#ffffff' : '#1f2937',
    inputBg: isDarkMode ? '#1e293b' : '#ffffff',
    inputBorder: isDarkMode ? '#334155' : '#e5e7eb',
    inputText: isDarkMode ? '#ffffff' : '#1f2937',
    bubbleMe: '#6366f1',
    bubbleThem: isDarkMode ? '#1e293b' : '#ffffff',
    bubbleThemText: isDarkMode ? '#ffffff' : '#1f2937',
    bubbleTime: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
    inputBarBg: isDarkMode ? '#161b22' : '#ffffff',
    inputBarBorder: isDarkMode ? '#21262d' : '#e5e7eb',
    statusText: isDarkMode ? '#94a3b8' : '#6b7280',
    avatarBorder: isDarkMode ? '#161b22' : '#ffffff',
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
    setMenuVisible(false);
  };

  const handleSetBackground = async () => {
    setMenuVisible(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCustomBg(uri);
        await AsyncStorage.setItem(`chat_bg_${otherIdStr}`, uri);
        Toast.show({ type: 'success', text1: 'Background Set', text2: 'Chat background updated successfully!' });
      }
    } catch (error) {
      console.error('Set background error:', error);
      Alert.alert('Error', 'Failed to set chat background.');
    }
  };

  const handleRemoveBackground = async () => {
    setMenuVisible(false);
    try {
      setCustomBg(null);
      await AsyncStorage.removeItem(`chat_bg_${otherIdStr}`);
      Toast.show({ type: 'success', text1: 'Background Removed', text2: 'Chat background reset to default.' });
    } catch (error) {
      console.error('Remove background error:', error);
      Alert.alert('Error', 'Failed to reset chat background.');
    }
  };

  const [inputText, setInputText] = useState('');
  const [isOnline, setIsOnline] = useState(otherUser?.isOnline || false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [studentStats, setStudentStats] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // New features state
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [fullScreenImgIndex, setFullScreenImgIndex] = useState(null);
  const [modalToast, setModalToast] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [stagedImages, setStagedImages] = useState([]);
  const [stagedAudio, setStagedAudio] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef(null);

  const flatListRef = useRef(null);

  const otherIdStr = String(otherUser._id || otherUser.id);
  const messages = messagesByUserId[otherIdStr] || [];

  const [customBg, setCustomBg] = useState(null);

  useEffect(() => {
    const loadBackground = async () => {
      try {
        const bg = await AsyncStorage.getItem(`chat_bg_${otherIdStr}`);
        if (bg) setCustomBg(bg);
      } catch (e) {
        console.error('Failed to load background:', e);
      }
    };
    loadBackground();
  }, [otherIdStr]);

  const chatImages = React.useMemo(() => {
    return [...messages]
      .filter(m => m.messageType === 'image' && m.imageUrl)
      .map(m => getImageUrl(m.imageUrl));
  }, [messages]);

  useEffect(() => {
    dispatch(setCurrentUserId(String(user._id || user.id)));
    dispatch(getChatHistory(otherIdStr));

    const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';
    const newSocket = io(baseUrl);

    const targetId = String(otherUser._id || otherUser.id);
    const currentId = String(user._id || user.id);

    const joinRoom = () => {
      if (currentId && currentId !== 'undefined') {
        newSocket.emit('join_room', currentId);
        newSocket.emit('check_online_status', targetId);
      }
    };
    if (newSocket.connected) {
      joinRoom();
    }
    newSocket.on('connect', joinRoom);
    newSocket.on('receive_message', (msg) => dispatch(receiveMessage(msg)));
    newSocket.on('delete_message', (msgId) =>
      dispatch(removeMessageLocally({ messageId: msgId, otherUserId: targetId })));
    newSocket.on('user_online', (uid) => { if (String(uid) === targetId) setIsOnline(true); });
    newSocket.on('user_offline', (uid) => { if (String(uid) === targetId) setIsOnline(false); });
    newSocket.on('user_status_response', (data) => {
      if (String(data.userId) === targetId) {
        setIsOnline(data.isOnline);
      }
    });

    const statusInterval = setInterval(() => {
      if (newSocket.connected && targetId && targetId !== 'undefined') {
        newSocket.emit('check_online_status', targetId);
      }
    }, 2000);

    return () => {
      clearInterval(statusInterval);
      newSocket.disconnect();
    };
  }, [dispatch, otherUser._id, otherUser.id, user._id, user.id]);

  const handleSend = async () => {
    try {
      const tempId = `temp-${Date.now()}`;
      if (stagedAudio) {
        const audioToSend = stagedAudio;
        setStagedAudio(null);
        dispatch(addOptimisticMessage({
          _id: tempId,
          content: 'Audio message',
          messageType: 'audio',
          sender: String(user._id || user.id),
          receiver: otherIdStr,
          createdAt: new Date().toISOString(),
          tempId
        }));
        await dispatch(sendMessage({
          tempId,
          receiverId: otherIdStr,
          messageType: 'audio',
          audio: audioToSend
        })).unwrap();
      } else if (stagedImages.length > 0) {
        const imagesToSend = [...stagedImages];
        const textToSend = inputText.trim();
        setStagedImages([]);
        setInputText('');
        
        for (let i = 0; i < imagesToSend.length; i++) {
          const imgTempId = `temp-${Date.now()}-${i}`;
          dispatch(addOptimisticMessage({
            _id: imgTempId,
            content: i === 0 ? textToSend : '',
            messageType: 'image',
            imageUrl: imagesToSend[i].uri,
            sender: String(user._id || user.id),
            receiver: otherIdStr,
            createdAt: new Date().toISOString(),
            tempId: imgTempId
          }));
          await dispatch(sendMessage({
            tempId: imgTempId,
            receiverId: otherIdStr,
            messageType: 'image',
            content: i === 0 ? textToSend : '',
            image: imagesToSend[i]
          })).unwrap();
        }
      } else if (inputText.trim()) {
        const textToSend = inputText.trim();
        setInputText('');
        dispatch(addOptimisticMessage({
          _id: tempId,
          content: textToSend,
          messageType: 'text',
          sender: String(user._id || user.id),
          receiver: otherIdStr,
          createdAt: new Date().toISOString(),
          tempId
        }));
        await dispatch(sendMessage({
          tempId,
          receiverId: otherIdStr,
          content: textToSend,
          messageType: 'text'
        })).unwrap();
      }
    } catch (err) {
      Alert.alert('Send Failed', err || 'Could not send message. Please try again.');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.5,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map(asset => {
        const uri = asset.uri;
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';
        return { uri, name: filename, type };
      });
      setStagedImages(newImages);
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
        setStagedAudio({ uri, name: filename, type });
        setStagedImages([]);
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
        const res = await api.get(`/api/results/student/${otherIdStr}`);
        setStudentStats(res.data.results || []);
      } catch { } finally { setReportLoading(false); }
    }
  };

  const saveImageToGalleryOrShare = async (uri) => {
    let savedToGallery = false;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status === 'granted') {
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('ExamHub', asset, false).catch(() => {});
        savedToGallery = true;
      }
    } catch (libErr) {
      console.log('MediaLibrary save fallback:', libErr.message);
    }

    if (fullScreenImgIndex !== null) {
      setModalToast({
        title: savedToGallery ? 'Saved to Gallery!' : 'Downloaded!',
        message: savedToGallery
          ? 'Image saved as PNG to your Photos / Gallery.'
          : 'Image downloaded! Choose "Save Image" to store as PNG.'
      });
      setTimeout(() => setModalToast(null), 4500);
    } else {
      Toast.show({
        type: 'success',
        text1: savedToGallery ? 'Saved to Gallery!' : 'Downloaded!',
        text2: savedToGallery
          ? 'Image saved as PNG to your Photos / Gallery.'
          : 'Image downloaded! Choose "Save Image" to store as PNG.'
      });
    }

    if (!savedToGallery) {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Error', 'Saving is not available on this device');
      }
    }
  };

  const handleDownload = async (url, type) => {
    try {
      Toast.show({ type: 'info', text1: 'Downloading...', text2: 'Saving file to your device.' });
      
      const extension = type === 'audio' ? 'm4a' : 'png';
      const filename = `file_${Date.now()}.${extension}`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      if (url.startsWith('data:')) {
        const base64Data = url.split(';base64,').pop();
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
        
        if (type === 'image') {
          await saveImageToGalleryOrShare(fileUri);
          return;
        }
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri);
          Toast.show({ type: 'success', text1: 'Success!', text2: 'File saved successfully.' });
        } else {
          Alert.alert('Error', 'Saving is not available on this device');
        }
      } else {
        const downloadResult = await FileSystem.downloadAsync(url, fileUri);
        if (downloadResult.status === 200) {
          if (type === 'image') {
            await saveImageToGalleryOrShare(downloadResult.uri);
            return;
          }

          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(downloadResult.uri);
            Toast.show({ type: 'success', text1: 'Success!', text2: 'File saved successfully.' });
          } else {
            Alert.alert('Error', 'Saving is not available on this device');
          }
        } else {
          throw new Error(`Download failed with status: ${downloadResult.status}`);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Could not download and save file.');
    }
  };

  const handleLongPress = (item, isMe) => {
    const options = [{ text: 'Cancel', style: 'cancel' }];
    
    if (item.messageType === 'text' && item.content) {
      options.push({ 
        text: 'Copy Text', 
        onPress: async () => {
          await Clipboard.setStringAsync(item.content);
          Toast.show({ type: 'success', text1: 'Copied', text2: 'Message copied to clipboard.' });
        } 
      });
    }
    
    if (item.messageType === 'image' && item.imageUrl) {
      options.push({
        text: 'Download Image',
        onPress: () => handleDownload(getImageUrl(item.imageUrl), 'image')
      });
    } else if (item.messageType === 'audio' && item.audioUrl) {
      options.push({
        text: 'Download Audio',
        onPress: () => handleDownload(item.audioUrl, 'audio')
      });
    }
    
    if (isMe) {
      options.push({
        text: 'Delete', style: 'destructive',
        onPress: () => Alert.alert('Delete Message', 'Delete this message?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteMessage({ messageId: item._id, otherUserId: otherIdStr })) },
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
          <Text style={[styles.separatorText, { backgroundColor: colors.inputBg, color: colors.statusText }]}>{item.label}</Text>
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
          style={[styles.bubble, isMe ? styles.bubbleMe : { backgroundColor: colors.bubbleThem, borderBottomLeftRadius: 4 }]}
          onLongPress={() => handleLongPress(item, isMe)}
          delayLongPress={500}
          activeOpacity={0.85}
        >
          {item.messageType === 'text' && (
            <Text style={[styles.bubbleText, { color: isMe ? '#fff' : colors.bubbleThemText }]}>{item.content}</Text>
          )}
          {item.messageType === 'image' && item.imageUrl && (
            <TouchableOpacity 
              onPress={() => {
                const targetUrl = getImageUrl(item.imageUrl);
                const idx = chatImages.findIndex(url => url === targetUrl);
                setFullScreenImgIndex(idx !== -1 ? idx : 0);
              }} 
              onLongPress={() => handleLongPress(item, isMe)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.bubbleImage} resizeMode="cover" />
            </TouchableOpacity>
          )}
          {item.messageType === 'audio' && item.audioUrl && (
            <AudioMessage uri={item.audioUrl} isMe={isMe} onLongPress={() => handleLongPress(item, isMe)} />
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
            <Text style={[styles.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.65)' : colors.bubbleTime }]}>{formatTime(item.createdAt)}</Text>
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
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 30) + 8, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.inputBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.headerText} />
        </TouchableOpacity>

        <View style={styles.headerProfile}>
          {otherUser.profileImage ? (
            <Image source={{ uri: getImageUrl(otherUser.profileImage) }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback, { backgroundColor: '#6366f1' }]}>
              <Text style={styles.headerAvatarText}>{otherUser.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {isOnline && <View style={styles.headerOnlineDot} />}
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.headerName, { color: colors.headerText }]}>{otherUser.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34d399' : '#94a3b8' }]} />
              <Text style={[styles.headerStatus, { color: colors.statusText }]}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </View>

        {/* 3-dot menu only — no call/video */}
        <TouchableOpacity style={styles.headerMenuBtn} onPress={() => setMenuVisible(true)}>
          <Feather name="more-vertical" size={22} color={colors.headerText} />
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {customBg ? (
          <ImageBackground source={{ uri: customBg }} style={{ flex: 1 }} resizeMode="cover">
            <FlatList
              ref={flatListRef}
              data={listData}
              inverted
              keyExtractor={(item) => item.id || item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </ImageBackground>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listData}
            inverted
            keyExtractor={(item) => item.id || item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Preview Staged File */}
        {(stagedImages.length > 0 || stagedAudio) && (
          <View style={[
            styles.previewContainer, 
            { 
              backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff', 
              borderColor: isDarkMode ? '#334155' : '#bae6fd',
              borderWidth: 1.5,
              shadowColor: '#38bdf8',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDarkMode ? 0 : 0.15,
              shadowRadius: 8,
              elevation: 4
            }
          ]}>
            {stagedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, paddingRight: 20 }}>
                {stagedImages.map((img, idx) => (
                  <Image key={idx} source={{ uri: img.uri }} style={[styles.previewImage, { marginRight: 8 }]} />
                ))}
              </ScrollView>
            )}
            {stagedAudio && (
              <View style={[styles.previewAudio, { backgroundColor: isDarkMode ? '#0f172a' : '#e0f2fe' }]}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#38bdf8', justifyContent: 'center', alignItems: 'center' }}>
                  <Feather name="mic" size={20} color="#fff" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ color: isDarkMode ? '#f8fafc' : '#0369a1', fontWeight: 'bold', fontSize: 15 }}>Voice Message</Text>
                  <Text style={{ color: isDarkMode ? '#94a3b8' : '#38bdf8', fontSize: 12, marginTop: 2, fontWeight: '500' }}>Ready to send...</Text>
                </View>
              </View>
            )}
            <TouchableOpacity 
              style={[styles.previewCloseBtn, { borderColor: colors.bg, backgroundColor: '#ef4444' }]} 
              onPress={() => { setStagedImages([]); setStagedAudio(null); }}
            >
              <Feather name="x" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input Bar ── */}
        <View style={[styles.inputBar, { backgroundColor: colors.inputBarBg, borderTopColor: colors.inputBarBorder }]}>
          {/* image button */}
          <TouchableOpacity style={styles.plusBtn} onPress={handlePickImage}>
            <Feather name="image" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Text input with emoji icon */}
          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }, isRecording && styles.inputWrapRecording]}>
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
                  style={[styles.input, { color: colors.inputText }]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type a message..."
                  placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'}
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
          container: colors.inputBg,
          header: colors.headerText,
          search: { background: colors.bg, text: colors.headerText }
        }}
      />

      {/* Fullscreen Image Viewer Modal */}
      <Modal visible={fullScreenImgIndex !== null} transparent animationType="fade" statusBarTranslucent={true}>
        <View style={styles.fullScreenOverlay}>
          {fullScreenImgIndex !== null && chatImages.length > 0 && (
            <FlatList
              data={chatImages}
              horizontal
              pagingEnabled
              scrollEnabled={!isZoomed}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => String(index)}
              initialScrollIndex={fullScreenImgIndex}
              onScrollToIndexFailed={() => {}}
              getItemLayout={(data, index) => (
                { length: width, offset: width * index, index }
              )}
              renderItem={({ item }) => (
                <View style={{ width: width, height: height, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                  <ZoomableImage uri={item} width={width} height={height} onZoomChange={(zoomed) => setIsZoomed(zoomed)} />
                </View>
              )}
            />
          )}

          {/* Sleek Glassmorphic Top Media Header */}
          <View style={[styles.mediaHeaderBar, { paddingTop: Platform.OS === 'ios' ? 52 : 36 }]}>
            <TouchableOpacity style={styles.mediaHeaderBtn} onPress={() => setFullScreenImgIndex(null)}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.mediaHeaderTitle}>Photo Viewer</Text>
            <TouchableOpacity 
              style={styles.mediaHeaderBtn} 
              onPress={() => {
                if (fullScreenImgIndex !== null && chatImages[fullScreenImgIndex]) {
                  handleDownload(chatImages[fullScreenImgIndex], 'image');
                }
              }}
            >
              <Feather name="download" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Premium Bottom Floating Pill Action Button */}
          <TouchableOpacity 
            style={styles.mediaBottomPill}
            activeOpacity={0.85}
            onPress={() => {
              if (fullScreenImgIndex !== null && chatImages[fullScreenImgIndex]) {
                handleDownload(chatImages[fullScreenImgIndex], 'image');
              }
            }}
          >
            <Feather name="download" size={18} color="#fff" />
            <Text style={styles.mediaBottomPillText}>Save to Gallery</Text>
          </TouchableOpacity>

          {/* Toast Message rendered LAST so it is ALWAYS on FRONT of the image */}
          {modalToast && (
            <View style={styles.modalToastBanner}>
              <Feather name="check-circle" size={20} color="#fff" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.modalToastTitle}>{modalToast.title}</Text>
                <Text style={styles.modalToastMsg}>{modalToast.message}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ── 3-dot dropdown ── */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuDropdown, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleToggleTheme}>
              <Feather name={isDarkMode ? "sun" : "moon"} size={18} color={colors.headerText} style={{ marginRight: 12 }} />
              <Text style={[styles.menuItemText, { color: colors.headerText }]}>
                {isDarkMode ? 'Day Mode' : 'Night Mode'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleSetBackground}>
              <Feather name="image" size={18} color={colors.headerText} style={{ marginRight: 12 }} />
              <Text style={[styles.menuItemText, { color: colors.headerText }]}>Set Background</Text>
            </TouchableOpacity>
            {customBg && (
              <TouchableOpacity style={styles.menuItem} onPress={handleRemoveBackground}>
                <Feather name="trash-2" size={18} color="#ef4444" style={{ marginRight: 12 }} />
                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Remove Background</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Report Modal ── */}
      <Modal visible={reportVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.headerText }]}>{otherUser.name}'s Report</Text>
              <TouchableOpacity onPress={() => setReportVisible(false)}>
                <Feather name="x" size={24} color={colors.headerText} />
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
                    <View key={i} style={[styles.statBox, { backgroundColor: colors.bg, borderColor: colors.inputBorder }]}>
                      <Text style={styles.statBoxLabel}>{s.label}</Text>
                      <Text style={styles.statBoxVal}>{s.val}</Text>
                    </View>
                  ))}
                </View>
                <BarChart
                  data={{
                    labels: studentStats.slice(0, 4).map(r => (r.examId?.title || 'Exam').substring(0, 5) + '..'),
                    datasets: [{ data: studentStats.slice(0, 4).map(r => Math.round(r.percentage)) }],
                  }}
                  width={width - 80}
                  height={200}
                  yAxisSuffix="%"
                  chartConfig={{
                    backgroundGradientFrom: colors.inputBg,
                    backgroundGradientTo: colors.inputBg,
                    decimalPlaces: 0,
                    color: (op = 1) => `rgba(139,92,246,${op})`,
                    labelColor: (op = 1) => colors.headerText,
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
  bubbleImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 4 },
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
  modalToastBanner: {
    position: 'absolute', top: 50, left: 20, right: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.98)', paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center', zIndex: 99999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 20,
  },
  modalToastTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalToastMsg: { color: 'rgba(255,255,255,0.95)', fontSize: 13, marginTop: 2 },
  mediaHeaderBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 10,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  mediaHeaderBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  mediaHeaderTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  mediaBottomPill: {
    position: 'absolute', bottom: 36,
    backgroundColor: 'rgba(99, 102, 241, 0.95)',
    paddingVertical: 14, paddingHorizontal: 26,
    borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 10,
    zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 15,
  },
  mediaBottomPillText: { color: '#fff', fontSize: 15, fontWeight: '700' },

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
