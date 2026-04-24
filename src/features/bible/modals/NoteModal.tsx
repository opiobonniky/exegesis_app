import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { NoteModalProps } from '../types';
import { getColors } from '../../../constants/theme';
import { createBibleStyles } from '../bibleStyle';
import VerseRangeSlider from './VerseRangeSlider';

export default function NoteModal({
  visible,
  onClose,
  onSave,
  noteText,
  onNoteChange,
  saving,
  selectedVerses,
  currentBook,
  currentChapter,
  isDark,
  totalVerses = 1,
  onRangeChange,
}: NoteModalProps & {
  totalVerses?: number;
  onRangeChange?: (start: number, end: number) => void;
  onSave?: (rangeStart?: number, rangeEnd?: number) => void;
}) {
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createBibleStyles(isDark), [isDark]);

  const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
  const initialStart = sortedVerses[0] ?? 1;
  const initialEnd = sortedVerses[sortedVerses.length - 1] ?? 1;

  const [rangeStart, setRangeStart] = useState(initialStart);
  const [rangeEnd, setRangeEnd] = useState(initialEnd);

  // Reset range when modal opens
  const prevVisible = useRef(false);
  if (visible && !prevVisible.current) {
    prevVisible.current = true;
    if (rangeStart !== initialStart || rangeEnd !== initialEnd) {
      setRangeStart(initialStart);
      setRangeEnd(initialEnd);
    }
  }
  if (!visible && prevVisible.current) {
    prevVisible.current = false;
  }

  const handleRangeChange = (start: number, end: number) => {
    setRangeStart(start);
    setRangeEnd(end);
    onRangeChange?.(start, end);
  };

  // Build display label from range
  const rangeVerses: number[] = [];
  for (let v = rangeStart; v <= rangeEnd; v++) rangeVerses.push(v);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.noteModalOverlay}>
        <View style={styles.noteModalContainer}>
          <View style={styles.noteModalHeader}>
            <View>
              <Text style={styles.noteModalTitle}>Add Note</Text>
              <Text style={styles.noteModalSubtitle}>
                {currentBook} {currentChapter}:{rangeVerses.join(', ')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.noteModalCloseBtn}
            >
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {totalVerses > 1 && (
            <VerseRangeSlider
              totalVerses={totalVerses}
              startVerse={rangeStart}
              endVerse={rangeEnd}
              onRangeChange={handleRangeChange}
              isDark={isDark}
            />
          )}
          <ScrollView
            style={styles.noteModalScrollView}
            contentContainerStyle={styles.noteModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.noteInputContainer}>
              <Text style={styles.noteLabel}>Your Note</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Write your thoughts, reflections, or insights about these verses..."
                placeholderTextColor={COLORS.muted}
                value={noteText}
                onChangeText={onNoteChange}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoFocus
                maxLength={1000}
              />
            </View>
          </ScrollView>
          <View style={styles.noteModalActions}>
            <TouchableOpacity
              style={styles.noteCancelBtn}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.noteCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.noteSaveBtn,
                (saving || !noteText.trim()) && styles.noteSaveBtnDisabled,
              ]}
              onPress={() => onSave?.(rangeStart, rangeEnd)}
              disabled={saving || !noteText.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.noteSaveBtnText}>Save Note</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
