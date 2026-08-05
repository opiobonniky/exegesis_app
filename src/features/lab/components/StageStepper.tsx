import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View } from 'react-native';
import {
  Check,
  Eye,
  Headphones,
  BookOpen,
  Sprout,
} from 'lucide-react-native';

const STEP_META: Record<string, { icon: React.ElementType; label: string }> = {
  look: { icon: Eye, label: 'Look' },
  listen: { icon: Headphones, label: 'Listen' },
  learn: { icon: BookOpen, label: 'Learn' },
  abide: { icon: Sprout, label: 'Abide' },
  apply: { icon: Check, label: 'Apply' },
};

interface StageStepperProps {
  stageOrder: readonly string[];
  pageIndex: number;
  colors: any;
  onSelect: (stage: string) => void;
}

/**
 * Horizontal 5-step icon stepper matching the Lab design images:
 * - Active step: filled circle (blue for Look, gold for others) with white icon + bold label
 * - Completed steps: green outline circle + green icon + green label
 * - Upcoming steps: muted outline circle + muted icon + muted label (not tappable)
 * - Connector lines between circles (green when completed, active-color after the
 *   active step, light otherwise)
 */
export default function StageStepper({
  stageOrder,
  pageIndex,
  colors,
  onSelect,
}: StageStepperProps) {
  // Soft pulse ring around the active step circle. Restarts on each step
  // change so the pulse begins fresh on the newly active circle.
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, pageIndex]);

  const pulseRingOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });
  const pulseRingScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: colors.surface,
      }}
    >
      {stageOrder.map((stage, idx) => {
        const meta = STEP_META[stage] || { icon: Check, label: stage };
        const Icon = meta.icon;
        const isDone = idx < pageIndex;
        const isActive = idx === pageIndex;
        const isFuture = idx > pageIndex;
        const activeColor =
          stage === 'look'
            ? (colors.primaryOnSurface ?? colors.primary)
            : colors.accent;

        // Connector between step idx-1 and idx: green once the left endpoint is
        // done, the active step's color when the left endpoint is the active
        // step (matches the design where a solid blue line extends right from
        // the active Look circle), light otherwise.
        const leftIdx = idx - 1;
        const leftIsDone = leftIdx < pageIndex;
        const leftIsActive = leftIdx === pageIndex;
        const leftActiveColor =
          stageOrder[leftIdx] === 'look'
            ? (colors.primaryOnSurface ?? colors.primary)
            : colors.accent;

        const circleBg = isActive ? activeColor : 'transparent';
        const circleBorder = isActive
          ? activeColor
          : isDone
            ? colors.success
            : colors.muted;
        const iconColor = isActive ? '#FFFFFF' : isDone ? colors.success : colors.muted;
        const labelColor = isActive ? activeColor : isDone ? colors.success : colors.muted;

        return (
          <React.Fragment key={stage}>
            {idx > 0 && (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  alignSelf: 'flex-start',
                  marginTop: 16,
                  marginHorizontal: 4,
                  backgroundColor: leftIsDone
                    ? colors.success
                    : leftIsActive
                      ? leftActiveColor
                      : colors.border,
                }}
              />
            )}
            <TouchableOpacity
              onPress={isFuture ? undefined : () => onSelect(stage)}
              disabled={isFuture}
              activeOpacity={0.7}
              style={{ alignItems: 'center', gap: 5, opacity: isFuture ? 0.85 : 1 }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isActive && (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      borderWidth: 2,
                      borderColor: activeColor,
                      opacity: pulseRingOpacity,
                      transform: [{ scale: pulseRingScale }],
                    }}
                  />
                )}
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    borderWidth: 2,
                    borderColor: circleBorder,
                    backgroundColor: circleBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={16} color={iconColor} strokeWidth={2.5} />
                </View>
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? '800' : '600',
                  color: labelColor,
                }}
              >
                {meta.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}
