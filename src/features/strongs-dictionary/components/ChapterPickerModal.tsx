import React, { useMemo } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BookOpen, X } from 'lucide-react-native';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 16;
const COLS = 4;
const GAP = 8;
const CELL_W = Math.floor((SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS);

interface Props {
  visible: boolean;
  bookName: string;
  maxChapters: number;
  selectedChapter?: number;
  headings?: Record<number, Array<{ verse: number; heading: string }>>;
  onSelect: (chapter: number) => void;
  onClose: () => void;
  colors: any;
}

/**
 * Bottom-sheet chapter picker — compact grid of chapters where each cell
 * shows the chapter number plus its first section heading (e.g. "The Garden
 * of Eden") when available, so users can preview titles before reading.
 */
export default function ChapterPickerModal({
  visible,
  bookName,
  maxChapters,
  selectedChapter,
  headings,
  onSelect,
  onClose,
  colors,
}: Props) {
  const chapters = useMemo(
    () => Array.from({ length: maxChapters }, (_, i) => i + 1),
    [maxChapters],
  );

  const headingFor = (ch: number): string | null => {
    const list = headings?.[ch];
    return list && list.length > 0 ? list[0].heading : null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <BookOpen size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>{bookName}</Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>
                  {maxChapters} chapters available
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.cardBackground }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={17} color={colors.muted} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Chapter grid with heading previews (scrolls for long books like Psalms) */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.grid}
          >
            {chapters.map(ch => {
              const active = ch === selectedChapter;
              const heading = headingFor(ch);
              return (
                <TouchableOpacity
                  key={ch}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: active ? colors.primary : colors.cardBackground,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    onSelect(ch);
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.cellNum,
                      { color: active ? '#fff' : colors.text },
                    ]}
                  >
                    {ch}
                  </Text>
                  <Text
                    style={[
                      styles.cellHeading,
                      { color: active ? 'rgba(255,255,255,0.9)' : colors.primary },
                    ]}
                    numberOfLines={2}
                  >
                    {heading || '—'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
    gap: GAP,
  },
  cell: {
    width: CELL_W,
    height: 62,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNum: { fontSize: 15, fontWeight: '800' },
  cellHeading: {
    fontSize: 8.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 10,
  },
});
