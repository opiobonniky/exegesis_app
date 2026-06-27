import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 40;
const COLORS = ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF', '#5F27CD', '#1DD1A1', '#EE5A24'];

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  delay: number;
}

interface Props {
  visible: boolean;
  onFinish?: () => void;
}

export default function ConfettiOverlay({ visible, onFinish }: Props) {
  const particles = useRef<Particle[]>([]);
  const finishedCount = useRef(0);

  // Initialize particles once
  if (particles.current.length === 0) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.current.push({
        x: new Animated.Value(Math.random() * SCREEN_WIDTH),
        y: new Animated.Value(-20 - Math.random() * 100),
        rotation: new Animated.Value(0),
        opacity: new Animated.Value(0),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 300,
      });
    }
  }

  useEffect(() => {
    if (!visible) {
      finishedCount.current = 0;
      // Reset particles
      particles.current.forEach(p => {
        p.opacity.setValue(0);
      });
      return;
    }

    finishedCount.current = 0;

    const anims = particles.current.map((p) => {
      const startX = Math.random() * SCREEN_WIDTH;
      const endX = startX + (Math.random() - 0.5) * 80;
      const endY = SCREEN_HEIGHT + 20;
      const duration = 2200 + Math.random() * 1200;

      p.x.setValue(startX);
      p.y.setValue(-20 - Math.random() * 60);
      p.rotation.setValue(0);
      p.opacity.setValue(1);

      return Animated.parallel([
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.parallel([
            Animated.timing(p.y, {
              toValue: endY,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(p.x, {
              toValue: endX,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(p.rotation, {
              toValue: Math.random() * 6 - 3,
              duration,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(duration - 400),
              Animated.timing(p.opacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]),
      ]);
    });

    Animated.stagger(40, anims).start(() => {
      finishedCount.current += 1;
      if (finishedCount.current >= PARTICLE_COUNT) {
        onFinish?.();
      }
    });

    return () => {
      anims.forEach(a => a.stop());
    };
  }, [visible, onFinish]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size * 1.4,
              borderRadius: p.size * 0.15,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [{ rotate: p.rotation.interpolate({
                inputRange: [-3, 3],
                outputRange: ['-60deg', '60deg'],
              }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  particle: {
    position: 'absolute',
  },
});
