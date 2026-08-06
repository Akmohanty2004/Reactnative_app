import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, Platform, StatusBar, Animated, Easing, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import Toast from 'react-native-toast-message';
import { ListSkeleton } from '../../components/SkeletonLoader';
import { playRefreshSound } from '../../utils/SoundManager';

const AnimatedClassCard = ({ item, index, handleDeleteClass, colors, isDarkMode }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100, // Stagger effect
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      })
    ]).start();
  }, [slideAnim, fadeAnim, index]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.classCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LinearGradient
            colors={isDarkMode ? ['#3b82f6', '#1d4ed8'] : ['#60a5fa', '#3b82f6']}
            style={{ width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="folder" size={20} color="white" />
          </LinearGradient>
          <View>
            <Text style={[styles.className, { color: colors.text }]}>{item.name}</Text>
            <Text style={{ fontSize: 13, color: colors.subText, marginTop: 4, fontWeight: '500' }}>{item.studentCount || 0} Students</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDeleteClass(item._id)} style={styles.deleteBtn}>
          <Feather name="trash-2" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function ManageClassesScreen({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const isDarkMode = theme === 'dark';
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    inputBg: isDarkMode ? '#0f172a' : '#f1f5f9',
  };

  const fetchClassesAndUsers = async (isRefreshing = false) => {
    if (isRefreshing) {
      playRefreshSound();
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [resClasses, resUsers] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/admin/users?limit=1000&role=student')
      ]);
      const classesData = resClasses.data.classes || [];
      const usersData = resUsers.data.users || [];
      
      const updatedClasses = classesData.map(cls => {
        const regex = new RegExp(`(^|,)\\s*${cls.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*(,|$)`, 'i');
        const count = usersData.filter(u => u.classGroup && regex.test(u.classGroup)).length;
        return { ...cls, studentCount: count };
      });
      setClasses(updatedClasses);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to fetch data' });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClassesAndUsers();
    }, [])
  );

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    setIsAdding(true);
    try {
      await api.post('/api/classes', { name: newClassName.trim() });
      Toast.show({ type: 'success', text1: 'Class added successfully' });
      setNewClassName('');
      fetchClassesAndUsers();
    } catch (error) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to add class' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClass = (id) => {
    Alert.alert('Delete Class', 'Are you sure you want to delete this class?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/classes/${id}`);
            Toast.show({ type: 'success', text1: 'Class deleted successfully' });
            fetchClassesAndUsers();
          } catch (error) {
            Toast.show({ type: 'error', text1: 'Failed to delete class' });
          }
        }
      }
    ]);
  };

  const renderClass = ({ item, index }) => (
    <AnimatedClassCard 
      item={item} 
      index={index} 
      handleDeleteClass={handleDeleteClass} 
      colors={colors} 
      isDarkMode={isDarkMode} 
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: topPadding + 10, flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginRight: 15 }}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Manage Classes</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>Create and organize class groups</Text>
        </View>
      </View>
      
      <View style={[styles.addSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="New class name (e.g. MERN, Java)"
          placeholderTextColor={colors.subText}
          value={newClassName}
          onChangeText={setNewClassName}
        />
        <TouchableOpacity onPress={handleAddClass} disabled={isAdding}>
          <LinearGradient
            colors={['#8b5cf6', '#6d28d9']}
            style={styles.addBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isAdding ? <ActivityIndicator color="white" size="small" /> : <Feather name="plus" size={20} color="white" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {(isLoading && !refreshing) ? (
        <ListSkeleton isDarkMode={isDarkMode} count={5} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={item => item._id}
          renderItem={renderClass}
          contentContainerStyle={{ padding: 15 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchClassesAndUsers(true)}
              tintColor="#8b5cf6"
              colors={['#8b5cf6', '#6d28d9']}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Feather name="folder-minus" size={40} color={colors.subText} style={{ marginBottom: 10 }} />
              <Text style={{ color: colors.subText }}>No classes created yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 5 },
  addSection: { flexDirection: 'row', padding: 15, marginHorizontal: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  input: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, marginRight: 12, fontSize: 15 },
  addBtn: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  classCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 16, marginBottom: 12, borderWidth: 1, marginHorizontal: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  className: { fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  deleteBtn: { padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 }
});
