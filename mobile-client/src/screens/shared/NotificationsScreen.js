import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Platform, Animated } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { getNotifications, markAsRead, markAllAsRead } from '../../redux/slices/notificationSlice';
import BouncyTouchable from '../../components/BouncyTouchable';

const AnimatedNotificationItem = ({ item, index, colors, isDarkMode, handleNotificationPress, pulseAnim }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <BouncyTouchable 
        style={[
          styles.notificationCard, 
          { backgroundColor: colors.card, borderColor: colors.border },
          !item.isRead && { borderLeftWidth: 4, borderLeftColor: colors.primary }
        ]}
        onPress={() => handleNotificationPress(item)}
        activeScale={0.97}
      >
        <Animated.View style={[
          styles.iconContainer, 
          { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.1)' : '#f3e8ff' },
          !item.isRead && { transform: [{ scale: pulseAnim }] }
        ]}>
          <Feather 
            name={item.type === 'exam_created' ? 'file-text' : item.type === 'exam_submitted' ? 'check-circle' : 'bell'} 
            size={20} 
            color={colors.primary} 
          />
        </Animated.View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: colors.text, fontWeight: item.isRead ? '500' : '700' }]}>{item.title}</Text>
          <Text style={[styles.notificationMessage, { color: colors.subText }]}>{item.message}</Text>
          <Text style={[styles.notificationTime, { color: colors.subText }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </BouncyTouchable>
    </Animated.View>
  );
};

export default function NotificationsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { notifications = [], isLoading } = useSelector(state => state.notifications);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  
  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    headerBg: isDarkMode ? '#000000' : 'white',
    text: isDarkMode ? '#f8fafc' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    primary: '#8b5cf6',
  };

  const [pulseAnim] = React.useState(new Animated.Value(1));

  useEffect(() => {
    dispatch(getNotifications());

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [dispatch]);

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
  };

  const handleNotificationPress = (notification) => {
    if (!notification.isRead) {
      dispatch(markAsRead(notification._id));
    }
  };

  const renderItem = ({ item, index }) => (
    <AnimatedNotificationItem 
      item={item} 
      index={index} 
      colors={colors} 
      isDarkMode={isDarkMode} 
      handleNotificationPress={handleNotificationPress} 
      pulseAnim={pulseAnim} 
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent={false} backgroundColor={colors.bg} />
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <BouncyTouchable onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDarkMode ? '#1e293b' : 'white', borderColor: colors.border }]} activeScale={0.8}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </BouncyTouchable>
        <Text style={[styles.headerTitle, { color: '#00f2fe', textShadowColor: 'rgba(0,242,254,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 6 }]}>Notifications</Text>
        <BouncyTouchable onPress={handleMarkAllRead} style={styles.markAllBtn} activeScale={0.9}>
          <Text style={[styles.markAllText, { color: '#b026ff', textShadowColor: 'rgba(176,38,255,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 4 }]}>Mark all read</Text>
        </BouncyTouchable>
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={notifications}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Animated.View style={[styles.emptyIconBg, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', transform: [{ scale: pulseAnim }] }]}>
                  <Feather name="bell-off" size={40} color={colors.subText} />
                </Animated.View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
                <Text style={[styles.emptySub, { color: colors.subText }]}>When you get notifications, they'll show up here</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
  },
  headerTitle: { 
    flex: 1,
    fontSize: 20, 
    fontWeight: '700',
    textAlign: 'center',
  },
  markAllBtn: { padding: 5, zIndex: 10 },
  markAllText: { fontSize: 14, fontWeight: '600' },
  listContainer: { padding: 20, paddingBottom: 100 },
  notificationCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 16, marginBottom: 4 },
  notificationMessage: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  notificationTime: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
});
