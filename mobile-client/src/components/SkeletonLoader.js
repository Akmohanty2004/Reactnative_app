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
    outputRange: [0.3, 0.7],
  });

  const backgroundColor = isDarkMode ? '#334155' : '#e2e8f0';

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
});

export default SkeletonLoader;
