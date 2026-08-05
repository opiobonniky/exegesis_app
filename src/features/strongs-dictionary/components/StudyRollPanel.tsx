import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

/**
 * StudyRollPanel
 *
 * A lightweight "roll" expand/collapse wrapper for the dictionary's study-tool
 * accordion rows. Content is rendered ONCE (a single instance → a single data
 * fetch). Because Yoga reports a height of 0 for a child clipped inside a
 * 0-height `overflow: hidden` parent, the content is first measured while it is
 * absolutely positioned (out of flex flow, invisible) so its natural height is
 * reported; then the SAME view is moved back in-flow and its height animates
 * open (260ms) and closed (220ms).
 *
 * - `open`: true animates the panel open; false animates it closed then unmounts.
 */
const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  measuring: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
  },
});

export default function StudyRollPanel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(open);
  const [measured, setMeasured] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const closingRef = useRef(false);

  // Mount the panel when it should open.
  useEffect(() => {
    if (open && !mounted) setMounted(true);
  }, [open, mounted]);

  // When open flips to false (while still mounted), roll it closed.
  useEffect(() => {
    if (!open && mounted && !closingRef.current) {
      closingRef.current = true;
      setAnimDone(false);
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => {
        closingRef.current = false;
        setMeasured(false);
        setAnimDone(false);
        setMounted(false);
      });
    }
  }, [open, mounted, anim]);

  const onLayout = useCallback(
    (e: any) => {
      const h = e.nativeEvent.layout.height;
      if (h <= 0) return;
      if (!measured) {
        setMeasured(true);
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: h,
          duration: 260,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start(() => setAnimDone(true));
      } else if (animDone && !closingRef.current) {
        // Content height changed while open (e.g. data finished loading) —
        // jump to the new height instantly instead of animating.
        anim.setValue(h);
      }
    },
    [measured, animDone, anim],
  );

  if (!mounted) return null;

  // While the natural height is unknown, render the content out of flow
  // (absolute, invisible) so Yoga reports its true size; once measured, the
  // same view is switched back in-flow and animates 0 → measured height.
  const animatedStyle = !measured
    ? styles.measuring
    : !animDone
      ? { height: anim, overflow: 'hidden' as const }
      : undefined;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={animatedStyle}
        pointerEvents={!measured ? 'none' : 'auto'}
        onLayout={onLayout}
      >
        {children}
      </Animated.View>
    </View>
  );
}
