import React from 'react';
import { Text, View } from 'react-native';
import { Timer } from 'lucide-react-native';

interface StageHeaderProps {
  Icon: React.ElementType;
  step: number;
  total: number;
  title: string;
  subtitle: string;
  timeLabel: string;
  colors: any;
  accentColor: string;
  children?: React.ReactNode;
}

/**
 * Stage header matching the Lab design images:
 * - Left: large circular icon badge (white bg, thick accent border)
 * - Center: "STEP X OF Y" (accent, small, uppercase) + big title
 * - Right: tinted time badge (clock icon + duration)
 * - Below: subtitle, then any children (passage chip / change-passage actions)
 */
export default function StageHeader({
  Icon,
  step,
  total,
  title,
  subtitle,
  timeLabel,
  colors,
  accentColor,
  children,
}: StageHeaderProps) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 3,
            borderColor: accentColor,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Icon size={26} color={accentColor} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.2,
              color: accentColor,
            }}
          >
            STEP {step} OF {total}
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '900',
              letterSpacing: -0.5,
              color: colors.text,
            }}
          >
            {title}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: `${accentColor}15`,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
          }}
        >
          <Timer size={11} color={accentColor} />
          <Text style={{ fontSize: 10, fontWeight: '800', color: accentColor }}>
            {timeLabel}
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          marginTop: 6,
          marginLeft: 68,
        }}
      >
        {subtitle}
      </Text>
      {children && <View style={{ marginLeft: 68 }}>{children}</View>}
    </View>
  );
}
