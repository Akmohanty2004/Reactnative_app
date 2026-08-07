import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

export default function CustomSplashScreen({ onFinish }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // We do NOT hide the splash screen immediately here.
    // We wait until the image is fully loaded in memory!
  }, []);

  const onImageLoaded = async () => {
    // Hide the native splash screen smoothly now that our image is fully rendered
    await SplashScreen.hideAsync().catch(() => {});

    // Start the animation sequence
    Animated.sequence([
      // 1. Quick anticipation bounce (shrink slightly)
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // 2. Massive zoom in and fade out
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 20, // Zoom into the screen massively
          duration: 700,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 400,
          delay: 300, // Start fading out halfway through the zoom
          useNativeDriver: true,
        }),
      ])
    ]).start(() => {
      // Animation complete, notify parent to unmount and show app
      if (onFinish) onFinish();
    });
  };

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/Applogo.png')}
        onLoadEnd={onImageLoaded}
        style={[
          styles.logo,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#208AEF', // Matches the app.json native splash screen color perfectly
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999, // Ensure it covers everything
  },
  logo: {
    width: 200, // Matches imageWidth in app.json
    height: 200,
  },
});
