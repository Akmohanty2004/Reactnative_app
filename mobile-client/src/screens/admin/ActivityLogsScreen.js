import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity , Platform, StatusBar} from 'react-native';
import { useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ActivityLogsScreen() {
  const { stats } = useSelector(state => state.admin);
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const navigation = useNavigation();

  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    border: isDarkMode ? '#334155' : '#e2e8f0',
  };

  const recentExams = stats?.recentExams || [];
  const recentResults = stats?.recentResults || [];
  
  const combinedActivities = [
    ...recentExams.map(ex => ({
      id: `ex-${ex._id}`,
      title: 'Exam Created',
      desc: ex.title || 'A new exam was added',
      time: new Date(ex.createdAt).toLocaleString(),
      timestamp: new Date(ex.createdAt).getTime(),
      icon: 'file-text',
      color: '#8b5cf6'
    })),
    ...recentResults.map(r => ({
      id: `res-${r._id}`,
      title: 'Result Published',
      desc: `${r.studentId?.name || 'A student'} completed an exam`,
      time: new Date(r.createdAt).toLocaleString(),
      timestamp: new Date(r.createdAt).getTime(),
      icon: 'check-circle',
      color: '#10b981'
    }))
  ];
  
  const activities = combinedActivities.sort((a, b) => b.timestamp - a.timestamp);

  const renderItem = ({ item }) => (
    <View style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.activityIconWrapper, { backgroundColor: item.color + '22' }]}>
        <Feather name={item.icon} size={20} color={item.color} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.activityDesc, { color: colors.subText }]}>{item.desc}</Text>
        <Text style={styles.activityTime}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Activity Logs</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>All recent activities on the platform</Text>
        </View>
      </View>

      <FlatList
        data={activities}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="clock" size={48} color={colors.subText} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No recent activity found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 10 : 20, paddingBottom: 15 },
  backBtn: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  listContainer: { padding: 15, paddingBottom: 40 },
  activityItem: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, alignItems: 'center' },
  activityIconWrapper: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  activityDesc: { fontSize: 13, marginBottom: 4 },
  activityTime: { color: '#818cf8', fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, fontWeight: '600' }
});
