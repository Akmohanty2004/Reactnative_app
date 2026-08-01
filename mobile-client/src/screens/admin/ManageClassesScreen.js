import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert , Platform, StatusBar} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

export default function ManageClassesScreen({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const isDarkMode = theme === 'dark';

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    inputBg: isDarkMode ? '#0f172a' : '#f1f5f9',
  };

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data.classes || []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to fetch classes' });
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClasses();
    }, [])
  );

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    setIsAdding(true);
    try {
      await api.post('/api/classes', { name: newClassName.trim() });
      Toast.show({ type: 'success', text1: 'Class added successfully' });
      setNewClassName('');
      fetchClasses();
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
            fetchClasses();
          } catch (error) {
            Toast.show({ type: 'error', text1: 'Failed to delete class' });
          }
        }
      }
    ]);
  };

  const renderClass = ({ item }) => (
    <View style={[styles.classCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Feather name="layers" size={20} color="#8b5cf6" style={{ marginRight: 15 }} />
        <Text style={[styles.className, { color: colors.text }]}>{item.name}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteClass(item._id)} style={{ padding: 8 }}>
        <Feather name="trash-2" size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
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
        <TouchableOpacity style={styles.addBtn} onPress={handleAddClass} disabled={isAdding}>
          {isAdding ? <ActivityIndicator color="white" size="small" /> : <Feather name="plus" size={20} color="white" />}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={item => item._id}
          renderItem={renderClass}
          contentContainerStyle={{ padding: 15 }}
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
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 10 : 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 5 },
  addSection: { flexDirection: 'row', padding: 15, marginHorizontal: 15, borderRadius: 16, borderWidth: 1, marginBottom: 15, alignItems: 'center' },
  input: { flex: 1, height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 15, marginRight: 10 },
  addBtn: { width: 45, height: 45, borderRadius: 10, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  classCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  className: { fontSize: 16, fontWeight: '600' }
});
