import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BookOpen,
  Landmark,
  Sigma,
  Sprout,
  ChevronDown,
} from 'lucide-react-native';
import StudyToolPanel from './StudyToolPanel';
import StudyRollPanel from './StudyRollPanel';

export type StudyToolKey = 'explanation' | 'background' | 'strongs' | 'application';

interface Props {
  bookName: string;
  chapter: number;
  verse: number;
  translationId: string;
  isDark: boolean;
  colors: any;
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

export const TOOLS: ToolDef[] = [
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
 * VERSE STUDY TOOLS section — accordion list. Tapping a tool row expands its
 * content inline beneath the row (only one tool open at a time); tapping again
 * collapses it.
 */
export default function StudyToolsList({
  bookName,
  chapter,
  verse,
  translationId,
  isDark,
  colors,
}: Props) {
  const [openKey, setOpenKey] = useState<StudyToolKey | null>(null);

  const toggle = (key: StudyToolKey) =>
    setOpenKey(prev => (prev === key ? null : key));

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        VERSE STUDY TOOLS
      </Text>
      {/* Full-bleed: counteracts StudyVerseTab's 16px horizontal padding. */}
      <View style={[styles.list, { backgroundColor: colors.background }]}>
        {TOOLS.map((tool, idx) => {
          const Icon = tool.Icon;
          const open = openKey === tool.key;
          return (
            <View key={tool.key}>
              <TouchableOpacity
                style={[
                  styles.item,
                  open && { backgroundColor: `${colors.primary}08` },
                ]}
                activeOpacity={0.7}
                onPress={() => toggle(tool.key)}
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
                <ChevronDown
                  size={17}
                  color={open ? colors.primary : colors.muted}
                  style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              <StudyRollPanel open={open}>
                <View style={styles.panelWrap}>
                  <StudyToolPanel
                    tool={tool.key}
                    bookName={bookName}
                    chapter={chapter}
                    verse={verse}
                    translationId={translationId}
                    isDark={isDark}
                    colors={colors}
                  />
                </View>
              </StudyRollPanel>
            </View>
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
    // Full width: bleeds past the parent's 16px horizontal padding.
    marginHorizontal: -16,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
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
  panelWrap: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
});
