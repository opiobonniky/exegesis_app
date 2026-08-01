import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

interface WaveformAnimationProps {
  active: boolean;
  barCount?: number;
  size?: number;
  color?: string;
  mutedColor?: string;
  gap?: number;
}

export default function WaveformAnimation({
  active,
  barCount = 10,
  size = 16,
  color = '#396284',
  mutedColor = '#64748B',
  gap = 2,
}: WaveformAnimationProps) {
  // Store animated values — synchronously initialized so first render shows correct bars
  const animValuesRef = useRef<Animated.Value[]>([]);
  if (animValuesRef.current.length !== barCount) {
    animValuesRef.current = Array.from(
      { length: barCount },
      () => new Animated.Value(0.2),
    );
  }

  useEffect(() => {
    const values = animValuesRef.current.slice(0, barCount);

    if (active) {
      // Start animation loop for each bar with staggered delays
      const animations = values.map((val, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: 1,
              duration: 400,
              delay: i * 80,
              useNativeDriver: false,
            }),
            Animated.timing(val, {
              toValue: 0.2,
              duration: 400,
              useNativeDriver: false,
            }),
          ]),
          { iterations: -1 },
        ),
      );

      animations.forEach(anim => anim.start());

      return () => {
        animations.forEach(anim => anim.stop());
      };
    } else {
      // Reset all bars to low value
      values.forEach(val => val.setValue(0.2));
    }
  }, [active, barCount]);

  // Get the safe slice of values for rendering
  const displayValues = animValuesRef.current.slice(0, barCount);

  const currentColor = active ? color : mutedColor;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: size,
        gap,
        opacity: active ? 1 : 0.5,
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {displayValues.map((val, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 1.5,
            backgroundColor: currentColor,
            height: val.interpolate({
              inputRange: [0, 1],
              outputRange: [4, size],
            }),
          }}
        />
      ))}
    </View>
  );
}
