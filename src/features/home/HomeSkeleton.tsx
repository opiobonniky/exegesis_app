import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { BORDER_RADIUS, SPACING } from '../../constants/theme';
import { HomeDesign } from './homeStyle';

type Props = {
  design: HomeDesign;
};

export default function HomeSkeleton({ design }: Props) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const skeletonColor = design.cardBorder;

  return (
    <View style={styles.container}>
      {/* Greeting Card Skeleton */}
      <View
        style={[
          styles.card,
          { backgroundColor: design.cardBg, borderColor: design.cardBorder },
        ]}
      >
        <View style={styles.row}>
          <Animated.View
            style={[
              styles.box,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: 36,
                height: 36,
                borderRadius: 10,
              },
            ]}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <Animated.View
              style={[
                styles.line,
                {
                  backgroundColor: skeletonColor,
                  opacity: pulseAnim,
                  width: '70%',
                  height: 16,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.line,
                {
                  backgroundColor: skeletonColor,
                  opacity: pulseAnim,
                  width: '40%',
                  height: 12,
                },
              ]}
            />
          </View>
        </View>
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '90%',
              height: 14,
              marginTop: 12,
              marginLeft: 44,
            },
          ]}
        />
      </View>

      {/* Continue Reading Card Skeleton */}
      <View
        style={[
          styles.card,
          { backgroundColor: design.cardBg, borderColor: design.cardBorder },
        ]}
      >
        <View style={styles.row}>
          <Animated.View
            style={[
              styles.box,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: 28,
                height: 28,
                borderRadius: 8,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: '50%',
                height: 16,
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '80%',
              height: 18,
              marginVertical: 12,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '100%',
              height: 8,
              borderRadius: 4,
            },
          ]}
        />
      </View>

      {/* Daily Verse Card Skeleton */}
      <View
        style={[
          styles.card,
          { backgroundColor: design.cardBg, borderColor: design.cardBorder },
        ]}
      >
        <View style={styles.row}>
          <Animated.View
            style={[
              styles.box,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: 28,
                height: 28,
                borderRadius: 8,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: '40%',
                height: 16,
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '60%',
              height: 18,
              marginVertical: 10,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '100%',
              height: 14,
              marginBottom: 6,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '85%',
              height: 14,
            },
          ]}
        />
      </View>

      {/* Daily Devotion Card Skeleton */}
      <View
        style={[
          styles.card,
          { backgroundColor: design.cardBg, borderColor: design.cardBorder },
        ]}
      >
        <View style={styles.row}>
          <Animated.View
            style={[
              styles.box,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: 28,
                height: 28,
                borderRadius: 8,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: '45%',
                height: 16,
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '70%',
              height: 18,
              marginVertical: 10,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '100%',
              height: 14,
              marginBottom: 6,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '90%',
              height: 14,
              marginBottom: 10,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pill,
            { backgroundColor: skeletonColor, opacity: pulseAnim, width: 110 },
          ]}
        />
      </View>

      {/* Lab Card Skeleton */}
      <View
        style={[
          styles.card,
          { backgroundColor: design.cardBg, borderColor: design.cardBorder },
        ]}
      >
        <View style={styles.row}>
          <Animated.View
            style={[
              styles.box,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: 32,
                height: 32,
                borderRadius: 9,
              },
            ]}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <Animated.View
              style={[
                styles.line,
                {
                  backgroundColor: skeletonColor,
                  opacity: pulseAnim,
                  width: '55%',
                  height: 15,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.line,
                {
                  backgroundColor: skeletonColor,
                  opacity: pulseAnim,
                  width: '80%',
                  height: 11,
                },
              ]}
            />
          </View>
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          {[1, 2, 3, 4, 5].map(i => (
            <Animated.View
              key={i}
              style={[
                styles.stepDot,
                { backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Stats Row Skeleton */}
      <View
        style={[
          styles.card,
          { backgroundColor: design.cardBg, borderColor: design.cardBorder },
        ]}
      >
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '35%',
              height: 16,
              marginBottom: 12,
            },
          ]}
        />
        <View style={styles.statsGrid}>
          {[1, 2, 3, 4].map(i => (
            <Animated.View
              key={i}
              style={[
                styles.statBox,
                { backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Quick Access Skeleton */}
      <View
        style={[
          styles.card,
          { backgroundColor: design.cardBg, borderColor: design.cardBorder },
        ]}
      >
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonColor,
              opacity: pulseAnim,
              width: '40%',
              height: 16,
              marginBottom: 12,
            },
          ]}
        />
        <View style={styles.quickGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Animated.View
              key={i}
              style={[
                styles.quickItem,
                { backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Recent Activity Skeleton */}
      <View
        style={[
          styles.card,
          { backgroundColor: design.cardBg, borderColor: design.cardBorder },
        ]}
      >
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: '40%',
                height: 16,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                width: 46,
                height: 12,
              },
            ]}
          />
        </View>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.row, { marginTop: 14 }]}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: skeletonColor,
                  opacity: pulseAnim,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                },
              ]}
            />
            <View style={{ flex: 1, gap: 6 }}>
              <Animated.View
                style={[
                  styles.line,
                  {
                    backgroundColor: skeletonColor,
                    opacity: pulseAnim,
                    width: '65%',
                    height: 13,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.line,
                  {
                    backgroundColor: skeletonColor,
                    opacity: pulseAnim,
                    width: '40%',
                    height: 11,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  box: {
    borderRadius: 8,
  },
  line: {
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  statBox: {
    flex: 1,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
  },
  pill: {
    height: 26,
    borderRadius: BORDER_RADIUS.round,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  quickItem: {
    width: '30%',
    height: 50,
    borderRadius: BORDER_RADIUS.md,
  },
});
