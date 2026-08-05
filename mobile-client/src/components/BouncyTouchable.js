import React, { useRef } from 'react';
import { Pressable, Animated } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BouncyTouchable = ({ children, style, onPress, activeScale = 0.95, ...props }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
  };

  return (
    <AnimatedPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={[style, { transform: [{ scale }] }]} {...props}>
      {children}
    </AnimatedPressable>
  );
};

export default BouncyTouchable;
