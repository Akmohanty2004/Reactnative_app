import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const SkeletonLoader = ({ style, isDarkMode }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  const backgroundColor = isDarkMode ? '#475569' : '#cbd5e1';

  return (
    <Animated.View style={[styles.skeleton, { backgroundColor, opacity }, style]} />
  );
};

export const ListSkeleton = ({ isDarkMode, count = 5 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.listItem, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
          <SkeletonLoader isDarkMode={isDarkMode} style={styles.avatar} />
          <View style={styles.content}>
            <SkeletonLoader isDarkMode={isDarkMode} style={styles.title} />
            <SkeletonLoader isDarkMode={isDarkMode} style={styles.subtitle} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const CardSkeleton = ({ isDarkMode, count = 4 }) => {
  return (
    <View style={styles.cardContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.card, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
          <SkeletonLoader isDarkMode={isDarkMode} style={styles.cardHeader} />
          <SkeletonLoader isDarkMode={isDarkMode} style={styles.cardBody} />
          <SkeletonLoader isDarkMode={isDarkMode} style={styles.cardFooter} />
        </View>
      ))}
    </View>
  );
};

export const UserSkeleton = ({ isDarkMode, count = 5 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.userListItem, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
          <View style={styles.userUserInfo}>
            <SkeletonLoader isDarkMode={isDarkMode} style={styles.userAvatar} />
            <View style={styles.userContent}>
              <SkeletonLoader isDarkMode={isDarkMode} style={styles.userTitle} />
              <SkeletonLoader isDarkMode={isDarkMode} style={styles.userSubtitle} />
            </View>
          </View>
          <View style={styles.userMeta}>
            <SkeletonLoader isDarkMode={isDarkMode} style={styles.userBadge} />
            <SkeletonLoader isDarkMode={isDarkMode} style={styles.userBadge} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 8,
  },
  container: {
    padding: 15,
  },
  listItem: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    height: 16,
    width: '70%',
    marginBottom: 8,
    borderRadius: 4,
  },
  subtitle: {
    height: 12,
    width: '40%',
    borderRadius: 4,
  },
  cardContainer: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    height: 40,
    width: 40,
    borderRadius: 8,
    marginBottom: 15,
  },
  cardBody: {
    height: 16,
    width: '80%',
    marginBottom: 8,
  },
  cardFooter: {
    height: 12,
    width: '50%',
  },
  userListItem: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 18,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  userUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 18,
  },
  userContent: {
    flex: 1,
    justifyContent: 'center',
  },
  userTitle: {
    height: 18,
    width: '60%',
    marginBottom: 10,
    borderRadius: 4,
  },
  userSubtitle: {
    height: 14,
    width: '80%',
    borderRadius: 4,
  },
  userMeta: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.1)',
    paddingTop: 16,
    gap: 10,
  },
  userBadge: {
    width: 60,
    height: 28,
    borderRadius: 14,
  },
});

export default SkeletonLoader;
