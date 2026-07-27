import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

const Skeleton = ({ width, height, style, borderRadius = 8 }) => {
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

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#334155', // Slate 700 - matches dark theme
          opacity,
        },
        style,
      ]}
    />
  );
};

export default Skeleton;
