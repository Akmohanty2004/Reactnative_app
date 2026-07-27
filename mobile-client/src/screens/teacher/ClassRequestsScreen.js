import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

export default function ClassRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const isDarkMode = theme === 'dark';

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    border: isDarkMode ? '#334155' : '#e2e8f0',
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/users/class-requests/pending');
      setRequests(res.data.requests || []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to fetch class requests' });
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const handleVerify = async (studentId, status) => {
    try {
      await api.put(`/api/users/verify-class-change/${studentId}`, { status });
      Toast.show({ type: 'success', text1: `Request ${status} successfully` });
      fetchRequests();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Verification failed' });
    }
  };

  const renderRequest = ({ item }) => (
    <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.requestInfo}>
        <View style={styles.avatar}>
          <Feather name="user" size={20} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.studentName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.email, { color: colors.subText }]}>{item.email}</Text>
          <View style={styles.classChangeInfo}>
            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>{item.classGroup}</Text>
            <Feather name="arrow-right" size={14} color={colors.subText} style={{ marginHorizontal: 5 }} />
            <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{item.pendingClassGroup}</Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleVerify(item._id, 'rejected')}>
          <Feather name="x" size={18} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleVerify(item._id, 'approved')}>
          <Feather name="check" size={18} color="#10b981" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <TouchableOpacity 
            onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation?.navigate('Home')}
            style={{ marginRight: 10, padding: 4 }}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Class Verification</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.subText }]}>Approve or reject student class change requests.</Text>
      </View>
      
      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="check-circle" size={50} color={colors.subText} style={{ marginBottom: 15 }} />
          <Text style={{ color: colors.subText, fontSize: 16 }}>No pending requests!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item._id}
          renderItem={renderRequest}
          contentContainerStyle={{ padding: 15 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 60, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 5 },
  requestCard: { padding: 15, borderRadius: 16, marginBottom: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requestInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  studentName: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 12, marginBottom: 8 },
  classChangeInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', padding: 5, borderRadius: 8, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row' },
  actionBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10, borderWidth: 1 },
  rejectBtn: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)' },
  approveBtn: { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.1)' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
