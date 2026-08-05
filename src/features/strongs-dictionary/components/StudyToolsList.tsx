import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BookOpen,
  Landmark,
  Sigma,
  Sprout,
  ChevronDown,
} from 'lucide-react-native';

export type StudyToolKey = 'explanation' | 'background' | 'strongs' | 'application';

interface Props {
  colors: any;
  onPress: (tool: StudyToolKey) => void;
}

interface ToolDef {
  key: StudyToolKey;
  title: string;
  subtitle: string;
  Icon: React.ElementType;
  badgeBg: string;
  iconColor: string;
  numColor: string;
  numBg: string;
}

const TOOLS: ToolDef[] = [
  {
    key: 'explanation',
    title: 'Verse Explanation',
    subtitle: 'A clear explanation of what this verse means.',
    Icon: BookOpen,
    badgeBg: '#DBEAFE',
    iconColor: '#2563EB',
    numColor: '#1D4ED8',
    numBg: '#BFDBFE',
  },
  {
    key: 'background',
    title: 'Background & Historical Context',
    subtitle: 'Understand the historical and cultural background.',
    Icon: Landmark,
    badgeBg: '#CFFAFE',
    iconColor: '#0891B2',
    numColor: '#047857',
    numBg: '#A7F3D0',
  },
  {
    key: 'strongs',
    title: "Strong's Concordance",
    subtitle: "Original language details and Strong's references.",
    Icon: Sigma,
    badgeBg: '#EDE9FE',
    iconColor: '#7C3AED',
    numColor: '#6D28D9',
    numBg: '#DDD6FE',
  },
  {
    key: 'application',
    title: 'Verse Application',
    subtitle: 'How to apply this verse to your daily life.',
    Icon: Sprout,
    badgeBg: '#DCFCE7',
    iconColor: '#16A34A',
    numColor: '#15803D',
    numBg: '#BBF7D0',
  },
];

/**
 * VERSE STUDY TOOLS section — four stacked tool rows (icon badge + number
 * chip + title/subtitle + chevron) matching the dictionary design.
 */
export default function StudyToolsList({ colors, onPress }: Props) {
  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        VERSE STUDY TOOLS
      </Text>
      <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {TOOLS.map((tool, idx) => {
          const Icon = tool.Icon;
          return (
            <TouchableOpacity
              key={tool.key}
              style={[
                styles.item,
                { borderBottomColor: colors.border },
                idx === TOOLS.length - 1 && styles.itemLast,
              ]}
              activeOpacity={0.7}
              onPress={() => onPress(tool.key)}
            >
              <View style={styles.badgeWrap}>
                <View style={[styles.iconBadge, { backgroundColor: tool.badgeBg }]}>
                  <Icon size={20} color={tool.iconColor} strokeWidth={2.2} />
                </View>
                <View style={[styles.numChip, { backgroundColor: tool.numBg }]}>
                  <Text style={[styles.numText, { color: tool.numColor }]}>
                    {idx + 1}
                  </Text>
                </View>
              </View>
              <View style={styles.body}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {tool.title}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                  {tool.subtitle}
                </Text>
              </View>
              <ChevronDown size={17} color={colors.muted} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 10,
  },
  list: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  badgeWrap: {
    width: 52,
    alignItems: 'center',
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numChip: {
    position: 'absolute',
    right: 5,
    bottom: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  numText: {
    fontSize: 10,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});
