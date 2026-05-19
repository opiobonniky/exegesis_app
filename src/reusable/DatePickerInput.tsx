import {
  useState,
  useContext,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { AppContext } from '../common/AppContext';
import {
  getColors,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
} from '../constants/theme';
import { X, Calendar } from 'lucide-react-native';

type Props = {
  value?: string;
  placeholder?: string;
  onChangeDate: (date: string) => void;
  error?: string;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  textAlign?: 'left' | 'right' | 'center';
};

const DAYS: number[] = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const currentYear = new Date().getFullYear();
const YEARS: number[] = Array.from(
  { length: currentYear - 1900 + 1 },
  (_, i) => 1900 + i,
);

export default function DatePickerInput({
  value,
  placeholder = 'Select date',
  onChangeDate,
  error,
  label,
  minimumDate,
  maximumDate = new Date(),
  textAlign = 'left',
}: Props) {
  const app = useContext(AppContext);
  if (!app) return null;

  const COLORS = useMemo(() => getColors(app.isDark), [app.isDark]);

  const getInitialDate = () => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return {
          day: parsed.getDate(),
          month: parsed.getMonth(),
          year: parsed.getFullYear(),
        };
      }
    }
    const today = new Date();
    return {
      day: today.getDate(),
      month: today.getMonth(),
      year: today.getFullYear(),
    };
  };

  const initial = getInitialDate();
  const [show, setShow] = useState(false);
  const [selectedDay, setSelectedDay] = useState(initial.day);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (show && value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setSelectedDay(parsed.getDate());
        setSelectedMonth(parsed.getMonth());
        setSelectedYear(parsed.getFullYear());
      }
    }
  }, [show, value]);

  useEffect(() => {
    setValidationError(null);
  }, [selectedDay, selectedMonth, selectedYear]);

  const validateAndClampDate = useCallback(
    (day: number, month: number, year: number) => {
      const daysInMonth = getDaysInMonth(year, month);
      const clampedDay = Math.min(day, daysInMonth);

      let finalDay = clampedDay;
      let finalMonth = month;
      let finalYear = year;

      let tempDate = new Date(year, month, clampedDay);

      if (minimumDate) {
        const minDate = new Date(minimumDate);
        minDate.setHours(0, 0, 0, 0);
        if (tempDate < minDate) {
          tempDate = new Date(minDate);
          finalDay = minDate.getDate();
          finalMonth = minDate.getMonth();
          finalYear = minDate.getFullYear();
        }
      }

      if (tempDate > maximumDate) {
        tempDate = new Date(maximumDate);
        finalDay = maximumDate.getDate();
        finalMonth = maximumDate.getMonth();
        finalYear = maximumDate.getFullYear();
      }

      return { day: finalDay, month: finalMonth, year: finalYear };
    },
    [minimumDate, maximumDate],
  );

  const handleDayChange = (day: number | string) => {
    const newDay = day as number;
    const clamped = validateAndClampDate(newDay, selectedMonth, selectedYear);
    setSelectedDay(clamped.day);
  };

  const handleMonthChange = (month: number | string) => {
    const newMonth = month as number;
    const clamped = validateAndClampDate(selectedDay, newMonth, selectedYear);
    setSelectedDay(clamped.day);
    setSelectedMonth(clamped.month);
  };

  const handleYearChange = (year: number | string) => {
    const newYear = year as number;
    const clamped = validateAndClampDate(selectedDay, selectedMonth, newYear);
    setSelectedDay(clamped.day);
    setSelectedYear(clamped.year);
  };

  const handleConfirm = () => {
    setValidationError(null);

    const { day, month, year } = validateAndClampDate(
      selectedDay,
      selectedMonth,
      selectedYear,
    );

    const selectedDate = new Date(year, month, day);

    if (isNaN(selectedDate.getTime())) {
      setValidationError('Invalid date');
      return;
    }

    if (minimumDate) {
      const minDate = new Date(minimumDate);
      minDate.setHours(0, 0, 0, 0);
      if (selectedDate < minDate) {
        setValidationError(
          `Date must be after ${minimumDate.toLocaleDateString()}`,
        );
        return;
      }
    }

    if (selectedDate > maximumDate) {
      setValidationError('Date cannot be in the future');
      return;
    }

    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChangeDate(formatted);
    setShow(false);
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: COLORS.text }]}>{label}</Text>
      )}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShow(true)}
        style={[
          styles.box,
          {
            backgroundColor: COLORS.surface,
            borderColor: error ? COLORS.error : COLORS.border,
          },
        ]}
      >
        <Calendar size={20} color={COLORS.muted} />
        <Text
          style={[
            styles.boxText,
            { textAlign },
            { color: value ? COLORS.text : COLORS.muted },
          ]}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
      </TouchableOpacity>

      {(error || validationError) && (
        <Text style={[styles.error, { color: COLORS.error }]}>
          {validationError || error}
        </Text>
      )}

      <Modal
        visible={show}
        transparent
        animationType="fade"
        onRequestClose={() => setShow(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShow(false)}>
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: COLORS.cardBackground },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setShow(false)} hitSlop={12}>
                <X size={24} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerRow}>
              <ColumnPicker
                label="Day"
                items={DAYS}
                selectedValue={selectedDay}
                onValueChange={handleDayChange}
                COLORS={COLORS}
              />
              <ColumnPicker
                label="Month"
                items={MONTHS}
                selectedValue={MONTHS[selectedMonth]}
                onValueChange={(_: any) => {
                  const idx = MONTHS.indexOf(_ as string);
                  if (idx !== -1) handleMonthChange(idx);
                }}
                COLORS={COLORS}
              />
              <ColumnPicker
                label="Year"
                items={YEARS}
                selectedValue={selectedYear}
                onValueChange={handleYearChange}
                COLORS={COLORS}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: COLORS.border }]}
                onPress={() => setShow(false)}
              >
                <Text style={[styles.modalBtnText, { color: COLORS.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { backgroundColor: COLORS.primary },
                ]}
                onPress={handleConfirm}
              >
                <Text style={[styles.modalBtnText, { color: COLORS.white }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ColumnPicker({
  label,
  items,
  selectedValue,
  onValueChange,
  COLORS,
}: {
  label: string;
  items: (number | string)[];
  selectedValue: number | string;
  onValueChange: (value: number | string) => void;
  COLORS: any;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const ITEM_HEIGHT = 40;
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (!hasScrolled.current) {
      const index = items.findIndex(item => item === selectedValue);
      if (index > 0 && scrollRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, index * ITEM_HEIGHT - 60),
            animated: false,
          });
          hasScrolled.current = true;
        }, 150);
      }
    }
  }, []);

  const handleScroll = useCallback(
    (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      if (index >= 0 && index < items.length && scrollRef.current) {
        const item = items[index];
        onValueChange(item);
      }
    },
    [items, onValueChange],
  );

  return (
    <View style={styles.columnPicker}>
      <Text style={[styles.columnLabel, { color: COLORS.muted }]}>{label}</Text>
      <ScrollView
        ref={scrollRef}
        style={styles.columnScroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        onContentSizeChange={() => {
          if (!hasScrolled.current) {
            const index = items.findIndex(item => item === selectedValue);
            if (index > 0) {
              setTimeout(() => {
                scrollRef.current?.scrollTo({
                  y: Math.max(0, index * ITEM_HEIGHT - 60),
                  animated: false,
                });
                hasScrolled.current = true;
              }, 100);
            }
          }
        }}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.columnItem,
              selectedValue === item && {
                backgroundColor: COLORS.primary + '20',
              },
            ]}
            onPress={() => onValueChange(item)}
          >
            <Text
              style={[
                styles.columnItemText,
                {
                  color: selectedValue === item ? COLORS.primary : COLORS.text,
                },
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  box: {
    height: 50,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  boxText: {
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  error: {
    marginTop: SPACING.xs + 2,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 360,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 180,
  },
  columnPicker: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  columnScroll: {
    height: 160,
    width: '100%',
  },
  columnItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
    marginVertical: 0,
  },
  columnItemText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalBtnPrimary: {
    borderWidth: 0,
  },
  modalBtnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
