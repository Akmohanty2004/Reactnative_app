import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getStudentsPerformance } from '../../redux/slices/resultSlice';
import Skeleton from '../../components/Skeleton';

export default function StudentsListScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const { studentsPerformance = [], isLoading } = useSelector((state) => state.results);
  const { theme } = useSelector((state) => state.ui || { theme: 'dark' });
  const isDarkMode = theme === 'dark';
  const colors = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    text: isDarkMode ? 'white' : '#0f172a',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    card: isDarkMode ? '#1e293b' : 'white',
    cardAlt: isDarkMode ? '#151e2d' : '#f8fafc',
    border: isDarkMode ? '#334155' : '#e2e8f0',
  };

  useEffect(() => {
    dispatch(getStudentsPerformance());
  }, [dispatch]);

  const groupedStudents = useMemo(() => {
    const groups = {
      'Unassigned': [],
    };
    
    studentsPerformance.forEach(student => {
      let groupName = student.classGroup;
      if (!groupName || groupName === 'General') {
        groupName = 'Unassigned';
      }
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(student);
    });

    return groups;
  }, [studentsPerformance]);

  const renderStudent = (student) => (
    <View key={student._id} style={styles.studentCard}>
      <View style={styles.studentAvatar}>
        {student.profileImage ? (
          <Image source={{ uri: student.profileImage }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.studentAvatarText}>
            {(student.name || 'U')[0].toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.name || 'Unknown'}</Text>
        <Text style={styles.studentEmail}>{student.email || '—'}</Text>
      </View>
      <View style={styles.scoreBox}>
        <Text style={[styles.scoreText, { color: student.averageScore >= 50 ? '#10b981' : (student.averageScore > 0 ? '#ef4444' : '#64748b') }]}>
          {student.averageScore.toFixed(1)}%
        </Text>
        <Text style={styles.scoreSub}>Avg Score</Text>
      </View>
    </View>
  );

  const styles = getStyles(colors);

  return (
    <View style={styles.safe}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={false} backgroundColor={colors.bg} />
      
      <View style={[styles.headerContainer, { paddingTop: topPadding + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginRight: 15 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Student <Text style={{ color: '#b026ff', textShadowColor: 'rgba(176,38,255,0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 6 }}>Directory</Text>
          </Text>
          <TouchableOpacity 
            style={[styles.requestsBtn, { backgroundColor: 'rgba(176,38,255,0.15)', borderColor: 'rgba(176,38,255,0.4)', borderWidth: 1 }]}
            onPress={() => navigation.navigate('Requests')}
          >
            <Feather name="user-plus" size={18} color="#b026ff" />
            <Text style={[styles.requestsBtnText, { color: '#b026ff' }]}>Requests</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>Manage your students and view their performance</Text>
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} width="100%" height={70} borderRadius={16} style={{ marginBottom: 15 }} />
          ))}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {Object.keys(groupedStudents).sort((a, b) => {
            // Put Unassigned at the very top, then alphabetical
            if (a === 'Unassigned') return -1;
            if (b === 'Unassigned') return 1;
            return a.localeCompare(b);
          }).map(group => {
            const studentsInGroup = groupedStudents[group];
            if (studentsInGroup.length === 0) return null;

            return (
              <View key={group} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: group === 'Unassigned' ? '#ef4444' : '#8b5cf6' }]} />
                  <Text style={[styles.sectionTitle, { color: group === 'Unassigned' ? '#ef4444' : '#8b5cf6' }]}>
                    {group === 'Unassigned' ? 'Not Joined Any Class' : `Class: ${group}`}
                  </Text>
                  <Text style={styles.sectionCount}>{studentsInGroup.length}</Text>
                </View>
                
                {studentsInGroup.map(renderStudent)}
              </View>
            );
          })}

          {studentsPerformance.length === 0 && (
            <View style={styles.emptyBox}>
              <Feather name="users" size={36} color="#8b5cf6" />
              <Text style={styles.emptyTitle}>No Students Yet</Text>
              <Text style={styles.emptySub}>When students register, they will appear here.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (colors) => ({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  headerSub: {
    fontSize: 14,
    color: colors.subText,
    marginBottom: 8,
  },
  requestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  requestsBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.subText,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b5cf620',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8b5cf6',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  studentEmail: {
    fontSize: 12,
    color: colors.subText,
  },
  scoreBox: {
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreSub: {
    fontSize: 10,
    color: colors.subText,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 10 : 20,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.subText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
