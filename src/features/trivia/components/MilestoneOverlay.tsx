import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Sparkles, Zap, Award, PartyPopper, X } from 'lucide-react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  total: number;
  correct: number;
  percentage: number;
  onFinish: () => void;
}

const MILESTONES = [3, 5, 10, 25] as const;

interface MilestoneConfig {
  icon: React.ComponentType<any>;
  color: string;
}

const milestoneConfigs: Record<number, MilestoneConfig> = {
  3: { icon: Sparkles, color: '#60A5FA' },
  5: { icon: Zap, color: '#F59E0B' },
  10: { icon: Award, color: '#8B5CF6' },
  25: { icon: PartyPopper, color: '#EC4899' },
};

type MessageTier = 'elite' | 'strong' | 'solid' | 'growing';

interface MessageMap {
  title: string;
  subtitle: string;
}

const messages: Record<number, Record<MessageTier, MessageMap>> = {
  3: {
    elite: { title: 'Bright Start!', subtitle: "You're a natural!" },
    strong: { title: 'Great Start!', subtitle: 'Off to a solid beginning!' },
    solid: { title: 'Good Start!', subtitle: 'Keep learning and growing!' },
    growing: {
      title: 'First Steps!',
      subtitle: 'Every expert was once a beginner!',
    },
  },
  5: {
    elite: { title: 'On Fire!', subtitle: 'Unstoppable!' },
    strong: {
      title: 'Solid Work!',
      subtitle: "You're getting the hang of it!",
    },
    solid: { title: 'Half Dozen!', subtitle: 'Keep pushing forward!' },
    growing: { title: 'Nice Effort!', subtitle: 'Practice makes progress!' },
  },
  10: {
    elite: { title: 'Bible Scholar!', subtitle: 'Double digits with style!' },
    strong: {
      title: 'Impressive!',
      subtitle: 'Double digits and going strong!',
    },
    solid: { title: 'Dedicated!', subtitle: '10 questions in — keep going!' },
    growing: {
      title: 'Persistent!',
      subtitle: 'Learning takes time and you are!',
    },
  },
  25: {
    elite: {
      title: 'Scripture Master!',
      subtitle: 'A true Bible expert in the making!',
    },
    strong: {
      title: 'Well Versed!',
      subtitle: 'Quarter century of questions — wow!',
    },
    solid: { title: 'Committed!', subtitle: '25 questions deep — dedication!' },
    growing: {
      title: 'Determined!',
      subtitle: 'Steady persistence wins the race!',
    },
  },
};

function getMessageTier(percentage: number): MessageTier {
  if (percentage >= 80) return 'elite';
  if (percentage >= 60) return 'strong';
  if (percentage >= 40) return 'solid';
  return 'growing';
}

function getMilestone(total: number): number | null {
  for (const m of MILESTONES) {
    if (total === m) return m;
  }
  return null;
}

export default function MilestoneOverlay({
  visible,
  total,
  correct,
  percentage,
  onFinish,
}: Props) {
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardTranslateY = useRef(new Animated.Value(24)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const badgeBounce = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const milestone = getMilestone(total);
  const config = milestone ? milestoneConfigs[milestone] : null;
  const tier = getMessageTier(percentage);
  const msg = milestone
    ? messages[milestone][tier]
    : { title: '', subtitle: '' };
  const IconComp = config?.icon || Sparkles;

  const closeOverlay = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.96,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 18,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closingRef.current = false;
      onFinish();
    });
  }, [cardOpacity, cardScale, cardTranslateY, onFinish]);

  useEffect(() => {
    if (!visible) {
      cardScale.setValue(0.92);
      cardTranslateY.setValue(24);
      cardOpacity.setValue(0);
      badgeBounce.setValue(0);
      closingRef.current = false;
      return;
    }

    closingRef.current = false;
    cardScale.setValue(0.92);
    cardTranslateY.setValue(24);
    cardOpacity.setValue(0);
    badgeBounce.setValue(0);

    // Animate in
    Animated.sequence([
      Animated.delay(20),
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 210,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Badge bounce animation
    Animated.sequence([
      Animated.delay(300),
      Animated.spring(badgeBounce, {
        toValue: 1,
        friction: 3,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    visible,
    cardOpacity,
    cardScale,
    cardTranslateY,
    badgeBounce,
    closeOverlay,
  ]);

  if (!visible || !milestone) return null;

  const accentColor = config?.color || '#F0B429';
  const badgeRotation = badgeBounce.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '8deg'],
  });

  return (
    <View style={styles.backdropContainer} pointerEvents="auto">
      <View style={styles.backdropOverlay} />
      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={closeOverlay}
          activeOpacity={0.75}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <X size={16} color="#6B7280" />
        </TouchableOpacity>

        {/* Milestone badge */}
        <Animated.View
          style={[
            styles.badge,
            {
              backgroundColor: accentColor,
              transform: [{ rotate: badgeRotation }],
            },
          ]}
        >
          <IconComp size={28} color="#FFFFFF" />
        </Animated.View>

        {/* Milestone number */}
        <Text style={styles.milestoneNumber}>{milestone}</Text>
        <Text style={styles.milestoneLabel}>Questions Answered</Text>

        {/* Message */}
        <Text style={[styles.title, { color: accentColor }]}>{msg.title}</Text>
        <Text style={styles.subtitle}>{msg.subtitle}</Text>

        {/* Accuracy ring */}
        <View style={[styles.accuracyBadge, { borderColor: accentColor }]}>
          <Text style={[styles.accuracyValue, { color: accentColor }]}>
            {percentage}%
          </Text>
          <Text style={styles.accuracyLabel}>accuracy</Text>
        </View>

        {/* Score line */}
        <Text style={styles.scoreLine}>
          {correct}/{total} correct
        </Text>

        <TouchableOpacity
          style={[styles.dismissButton, { backgroundColor: accentColor }]}
          onPress={closeOverlay}
          activeOpacity={0.85}
        >
          <Text style={styles.dismissText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: SCREEN_WIDTH * 0.82,
    maxWidth: 330,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    zIndex: 2,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -SPACING.xl - 28,
    marginBottom: SPACING.sm,
  },
  milestoneNumber: {
    fontSize: FONT_SIZES.huge,
    fontWeight: '900',
    color: '#0F1724',
    lineHeight: 40,
  },
  milestoneLabel: {
    fontSize: FONT_SIZES.xs,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  accuracyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  accuracyValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
  },
  accuracyLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreLine: {
    fontSize: FONT_SIZES.xs,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dismissButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
});
