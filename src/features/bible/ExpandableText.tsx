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
};

export default function ExpandableText({
  text = '',
  initialLines = 8,
  stepLines = 20,
  expandLabel = 'Read more',
  closeLabel = 'Close',
  onClose,
  containerStyle,
}: Props) {
  const app:any = useContext(AppContext);
  const COLORS = useMemo(() => getColors(app?.isDark), [app?.isDark]);

  const cleanText = (text ?? '').trim();

  const [maxLines, setMaxLines] = useState(initialLines);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded && maxLines > initialLines) {
      setMaxLines(initialLines);
    }
  }, [expanded, maxLines, initialLines]);

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

  if (!cleanText) return null;

  return (
    <View style={containerStyle}>
      <Text
        style={[styles.text, { color: COLORS.text }]}
        numberOfLines={maxLines}
        onTextLayout={handleTextLayout}
      >
        {cleanText}
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
    fontSize: 12,
    lineHeight: 18,
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
