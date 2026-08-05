import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';

/**
 * VerseReadMore
 *
 * Renders long content collapsed to `initialLines` with ONE "Read more" button
 * at the end of the section. Pressing the button extends the content to its
 * full height (and toggles back to "Show less"). The button is a full-width,
 * easy-to-press control so readers can extend each section in place — no modal,
 * no per-block toggles.
 */
export default function VerseReadMore({
  collapsedLines = 5,
  lineHeight = 24,
  children,
  readMoreLabel = 'Read more',
  showLessLabel = 'Show less',
  colors,
  isRtl,
}: {
  collapsedLines?: number;
  lineHeight?: number;
  children: React.ReactNode;
  readMoreLabel?: string;
  showLessLabel?: string;
  colors: any;
  isRtl?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const collapsedHeight = collapsedLines * lineHeight;

  return (
    <View>
      <View
        style={!expanded && { maxHeight: collapsedHeight, overflow: 'hidden' }}
      >
        {children}
      </View>
      <TouchableOpacity
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
        style={[
          s.btn,
          isRtl && s.btnRtl,
          { borderColor: `${colors.primary}30` },
        ]}
      >
        <Text style={[s.btnText, { color: colors.primary }]}>
          {expanded ? showLessLabel : readMoreLabel}
        </Text>
        <ChevronDown
          size={14}
          color={colors.primary}
          strokeWidth={2.4}
          style={[{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }]}
        />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  btn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: SPACING.sm,
    minHeight: 36,
  },
  btnRtl: {
    alignSelf: 'flex-end',
  },
  btnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
