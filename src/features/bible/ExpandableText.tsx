import React, { useMemo, useState, useContext } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AppContext } from '../../common/AppContext';
import { getColors, SPACING } from '../../constants/theme';

type Props = {
  text?: string;

  /** number of characters shown first */
  initialChars?: number;

  /** number of characters added per click */
  stepChars?: number;

  /** labels */
  moreLabel?: string;
  lessLabel?: string;

  /** hide "Show less" when fully expanded */
  hideCollapse?: boolean;
};

export default function ExpandableText({
  text = '',
  initialChars = 500,
  stepChars = 500,
  moreLabel = 'Show more',
  lessLabel = 'Show less',
  hideCollapse = false,
}: Props) {
  const app = useContext(AppContext);
  const COLORS = useMemo(() => getColors(app?.isDark), [app?.isDark]);

  const cleanText = (text ?? '').trim();
  const total = cleanText.length;

  const [visibleChars, setVisibleChars] = useState(
    Math.min(initialChars, total),
  );

  if (!cleanText) return null;

  const isFullyVisible = visibleChars >= total;
  const displayText = cleanText.slice(0, visibleChars);

  const onMore = () => setVisibleChars(p => Math.min(p + stepChars, total));
  const onLess = () => setVisibleChars(Math.min(initialChars, total));

  return (
    <View>
      <Text style={[styles.text, { color: COLORS.text }]}>{displayText}</Text>

      {!isFullyVisible && (
        <Text style={[styles.ellipsis, { color: COLORS.text }]}>…</Text>
      )}

      {!isFullyVisible ? (
        <Pressable onPress={onMore} style={styles.btn}>
          <Text style={[styles.btnText, { color: COLORS.primary }]}>
            {moreLabel}
          </Text>
        </Pressable>
      ) : !hideCollapse ? (
        <>
          <Text
            style={[
              styles.btnText,
              {
                color: COLORS.accent,
                marginTop: SPACING.sm,
                fontWeight: '100',
              },
            ]}
          >
            End of text
          </Text>
          <Pressable onPress={onLess} style={styles.btn}>
            <Text style={[styles.btnText, { color: COLORS.primary }]}>
              {lessLabel}
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  ellipsis: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: -6,
  },
  btn: {
    marginTop: SPACING?.sm ?? 10,
    alignSelf: 'flex-start',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
