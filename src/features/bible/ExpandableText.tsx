import React, {
  useMemo,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppContext } from '../../common/AppContext';
import { getColors, SPACING } from '../../constants/theme';
import { ChevronDown, X } from 'lucide-react-native';

type Props = {
  text?: string;
  initialLines?: number;
  stepLines?: number;
  expandLabel?: string;
  closeLabel?: string;
  onClose?: () => void;
  containerStyle?: any;
  textStyle?: any;
};

function formatParagraphs(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Split on double newlines first (explicit paragraph breaks)
  const parts = trimmed.split(/\n\s*\n/);

  // If no double newlines, auto-detect sentence boundaries and group
  if (parts.length <= 1) {
    const sentenceRegex = /[.!?]\s+(?=[A-Z"'(])/g;
    const sentences = trimmed
      .split(sentenceRegex)
      .map((s, i, arr) => (i < arr.length - 1 ? s + '.' : s))
      .filter(s => s.trim().length > 0);

    if (sentences.length >= 4) {
      const grouped: string[] = [];
      const groupSize = Math.max(2, Math.min(3, Math.ceil(sentences.length / 4)));
      for (let i = 0; i < sentences.length; i += groupSize) {
        grouped.push(sentences.slice(i, i + groupSize).join(' '));
      }
      return grouped.join('\n\n');
    }
  }

  return parts.filter(p => p.trim().length > 0).join('\n\n');
}

export default function ExpandableText({
  text = '',
  initialLines = 8,
  stepLines = 20,
  expandLabel = 'Read more',
  closeLabel = 'Close',
  onClose,
  containerStyle,
  textStyle,
}: Props) {
  const app: any = useContext(AppContext);
  const COLORS = useMemo(() => getColors(app?.isDark), [app?.isDark]);

  const cleanText = (text ?? '').trim();
  const formattedText = useMemo(
    () => formatParagraphs(cleanText),
    [cleanText],
  );

  const [maxLines, setMaxLines] = useState(initialLines);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded && maxLines > initialLines) {
      setMaxLines(initialLines);
    }
  }, [expanded, maxLines, initialLines]);

  useEffect(() => {
    setMaxLines(initialLines);
    setExpanded(false);
  }, [text]);

  const showMore = useCallback(() => {
    setMaxLines(prev => prev + stepLines);
    setExpanded(true);
  }, [stepLines]);

  const handleClose = useCallback(() => {
    setMaxLines(0);
    setExpanded(false);
    setTimeout(() => {
      onClose?.();
    }, 0);
  }, [onClose]);

  const handleTextLayout = useCallback(
    (e: any) => {
      if (expanded || maxLines === 0) return;
      const lines = e.nativeEvent.lines.length;
      if (lines >= maxLines) {
        setMaxLines(prev => Math.min(prev + 1, lines));
      }
    },
    [expanded, maxLines],
  );

  if (!formattedText) return null;

  const lineHeight = 22;

  return (
    <View style={containerStyle}>
      <Text
        style={[
          styles.text,
          { color: COLORS.text, lineHeight },
          textStyle,
        ]}
        numberOfLines={maxLines}
        onTextLayout={handleTextLayout}
      >
        {formattedText}
      </Text>

      <View style={styles.footer}>
        {expanded ? (
          <TouchableOpacity onPress={handleClose} style={styles.toggleBtn}>
            <X size={12} color={COLORS.primary} />
            <Text style={[styles.toggleText, { color: COLORS.primary }]}>
              {closeLabel}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={showMore} style={styles.toggleBtn}>
            <Text style={[styles.toggleText, { color: COLORS.primary }]}>
              {expandLabel}
            </Text>
            <ChevronDown size={12} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
