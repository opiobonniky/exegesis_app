import { StyleSheet, Text, View, Image, Animated, Easing } from 'react-native';
import React, { useContext, useEffect, useRef } from 'react';
import { getColors } from '../constants/theme';
import { AppContext } from './AppContext';
import logoImage from '../assets/logos/exegesis_bg_rm.png';

const LoadingCard = ({ message = 'Loading...' }) => {
  const { isDark }: any = useContext(AppContext) || {};
  const COLORS = getColors(isDark);

  // Animation values
  const outerSpin = useRef(new Animated.Value(0)).current;
  const innerSpin = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Outer ring (slow)
    Animated.loop(
      Animated.timing(outerSpin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Inner ring (faster, opposite direction)
    Animated.loop(
      Animated.timing(innerSpin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.9,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const outerRotate = outerSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const innerRotate = innerSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          backgroundColor: isDark
            ? 'rgba(11, 15, 26, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          opacity: fadeValue,
        },
      ]}
    >
      <View style={styles.contentContainer}>
        <View style={styles.loaderContainer}>
          {/* Outer Ring */}
          <Animated.View
            style={[
              // styles.outerRing,
              {
                borderTopColor: COLORS.text,
                transform: [{ rotate: outerRotate }],
              },
            ]}
          />

          {/* Inner Ring */}
          <Animated.View
            style={[
              // styles.innerRing,
              {
                borderTopColor: COLORS.text,
                transform: [{ rotate: innerRotate }],
              },
            ]}
          />

          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              { transform: [{ scale: scaleValue }] },
            ]}
          >
            <Image
              source={logoImage}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <Text style={[styles.message, { color: COLORS.text }]}>{message}</Text>
      </View>
    </Animated.View>
  );
};

export default LoadingCard;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  /* OUTER RING */
  outerRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    borderColor: 'transparent',
  },

  /* INNER RING */
  innerRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 85,
    borderWidth: 3,
    borderColor: 'transparent',
  },

  /* LOGO */
  logoContainer: {
    width: 165,
    height: 165,
  },
  logo: {
    width: '100%',
    height: '100%',
  },

  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
