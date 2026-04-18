import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { X } from 'lucide-react-native';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../constants/theme';

interface TimePickerModalProps {
  visible: boolean;
  initialHour: number;
  initialMinute: number;
  onConfirm: (hour: number, minute: number) => void;
  onCancel: () => void;
  isDark?: boolean;
}

function TimePickerModalComponent({
  visible,
  initialHour,
  initialMinute,
  onConfirm,
  onCancel,
  isDark = false,
}: TimePickerModalProps) {
  const COLORS = getColors(isDark);

  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);

  React.useEffect(() => {
    if (visible) {
      setHour(initialHour);
      setMinute(initialMinute);
      hasScrolledRef.current = false;
    }
  }, [visible, initialHour, initialMinute]);

  const scrollToSelected = useCallback(() => {
    if (!hasScrolledRef.current && visible) {
      const ITEM_HEIGHT = 44;
      const visibleHeight = 160;
      const margin = 2; // marginVertical in pickerItem
      const totalItemHeight = ITEM_HEIGHT + margin * 2;
      // Center the item in the visible area
      const centerOffset = (visibleHeight - totalItemHeight) / 2;

      setTimeout(() => {
        hourScrollRef.current?.scrollTo({
          y: Math.max(0, initialHour * totalItemHeight - centerOffset + margin),
          animated: false,
        });
        minuteScrollRef.current?.scrollTo({
          y: Math.max(
            0,
            initialMinute * totalItemHeight - centerOffset + margin,
          ),
          animated: false,
        });
        hasScrolledRef.current = true;
      }, 150);
    }
  }, [visible, initialHour, initialMinute]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const handleConfirm = useCallback(() => {
    onConfirm(hour, minute);
  }, [hour, minute, onConfirm]);

  const fmt = (n: number) => String(n).padStart(2, '0');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      onShow={scrollToSelected}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable
          style={[styles.container, { backgroundColor: COLORS.cardBackground }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              Select Time
            </Text>
            <TouchableOpacity onPress={onCancel} hitSlop={12}>
              <X size={24} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerRow}>
            <View style={styles.pickerColumn}>
              <Text style={[styles.columnLabel, { color: COLORS.muted }]}>
                Hour
              </Text>
              <ScrollView
                ref={hourScrollRef}
                style={styles.scrollCol}
                showsVerticalScrollIndicator={false}
                snapToInterval={44}
                decelerationRate="fast"
                onContentSizeChange={() => scrollToSelected()}
              >
                {hours.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.pickerItem,
                      hour === h && { backgroundColor: COLORS.primary + '20' },
                    ]}
                    onPress={() => setHour(h)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: hour === h ? COLORS.primary : COLORS.text },
                      ]}
                    >
                      {fmt(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={[styles.separator, { color: COLORS.text }]}>:</Text>

            <View style={styles.pickerColumn}>
              <Text style={[styles.columnLabel, { color: COLORS.muted }]}>
                Minute
              </Text>
              <ScrollView
                ref={minuteScrollRef}
                style={styles.scrollCol}
                showsVerticalScrollIndicator={false}
                snapToInterval={44}
                decelerationRate="fast"
                onContentSizeChange={() => scrollToSelected()}
              >
                {minutes.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.pickerItem,
                      minute === m && {
                        backgroundColor: COLORS.primary + '20',
                      },
                    ]}
                    onPress={() => setMinute(m)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: minute === m ? COLORS.primary : COLORS.text },
                      ]}
                    >
                      {fmt(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, { borderColor: COLORS.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.btnText, { color: COLORS.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnPrimary,
                { backgroundColor: COLORS.primary },
              ]}
              onPress={handleConfirm}
            >
              <Text style={[styles.btnText, { color: COLORS.white }]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 340,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 180,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollCol: {
    height: 160,
    width: '100%',
  },
  pickerItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    marginVertical: 2,
  },
  pickerItemText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
  },
  separator: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnPrimary: {
    borderWidth: 0,
  },
  btnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

export default TimePickerModalComponent;
