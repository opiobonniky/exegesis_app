import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Image, Animated, Easing, StatusBar, TouchableOpacity, Text } from 'react-native';
import logo from '../assets/logos/exegesis_bg_rm.png';

interface SplashOverlayProps {
  visible: boolean;
  onHide?: () => void;
}

const SplashOverlay: React.FC<SplashOverlayProps> = ({ visible, onHide }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;


  // Continuous spin animation – runs while splash is visible
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.start();
    return () => spin.stop();
  }, []);

  // Hide animation – fade out and shrink a bit then call onHide
  useEffect(() => {
    if (!visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        onHide?.();
      });
    }
  }, [visible]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <View style={styles.loader}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        </View>
        <Text style={styles.text}>Loading Exegesis...</Text>
      </View>
      <TouchableOpacity style={styles.skipButton} onPress={onHide}>
        <Text style={styles.skipText}>Tap to skip</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  loader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#ddd',
    borderTopColor: '#4A90D9',
    marginBottom: 20,
  },
  spinner: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#4A90D9',
  },
  text: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  skipButton: {
    position: 'absolute',
    bottom: 60,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    color: '#999',
  },
});

export default SplashOverlay;