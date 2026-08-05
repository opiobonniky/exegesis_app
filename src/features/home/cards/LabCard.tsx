import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Eye,
  Ear,
  Search,
  Heart,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react-native';
import { BORDER_RADIUS, SPACING } from '../../../constants/theme';
import { HomeDesign } from '../homeStyle';

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  title?: string;
  subtitle?: string;
  startLabel?: string;
  durationHint?: string;
  onPress: () => void;
};

const STEPS = [
  { id: 'look', label: 'Look', icon: Eye },
  { id: 'listen', label: 'Listen', icon: Ear },
  { id: 'learn', label: 'Learn', icon: Search },
  { id: 'abide', label: 'Abide', icon: Heart },
  { id: 'apply', label: 'Apply', icon: Check },
];

export default function LabCard({
  design,
  isRtl,
  title,
  subtitle,
  startLabel,
  durationHint,
  onPress,
}: Props) {
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        { backgroundColor: design.cardBg, borderColor: design.cardBorder },
      ]}
    >
      <View style={[styles.topRow, isRtl && styles.topRowRtl]}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: design.accent + '1A' },
          ]}
        >
          <Sparkles size={18} color={design.accent} strokeWidth={2} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.label, { color: design.title }]} numberOfLines={1}>
            {title}
          </Text>
          <Text
            style={[styles.subtitle, { color: design.muted }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      {/* ── 5-stage journey ── */}
      <View style={[styles.stepsRow, isRtl && styles.stepsRowRtl]}>
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <View
                  style={[styles.connector, { backgroundColor: design.cardBorder }]}
                />
              )}
              <View style={styles.step}>
                <View
                  style={[
                    styles.stepIcon,
                    { backgroundColor: design.blue + '1A' },
                  ]}
                >
                  <Icon size={14} color={design.blue} strokeWidth={2.2} />
                </View>
                <Text style={[styles.stepLabel, { color: design.muted }]}>
                  {step.label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <View style={[styles.bottomRow, isRtl && styles.bottomRowRtl]}>
        <Text style={[styles.hint, { color: design.lightBlue }]}>
          {durationHint}
        </Text>
        <View style={[styles.startBtn, { backgroundColor: design.pillBg }]}>
          <Text style={[styles.startText, { color: design.pillText }]}>
            {startLabel}
          </Text>
          <Arrow size={13} color={design.pillText} strokeWidth={2.5} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  topRowRtl: {
    flexDirection: 'row-reverse',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 17,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  stepsRowRtl: {
    flexDirection: 'row-reverse',
  },
  connector: {
    flex: 1,
    height: 2,
    marginTop: 14,
    marginHorizontal: 4,
    borderRadius: 1,
  },
  step: {
    alignItems: 'center',
    gap: 5,
  },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  bottomRowRtl: {
    flexDirection: 'row-reverse',
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  startText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
