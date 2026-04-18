import React, { useMemo } from 'react';
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
}: NoteModalProps) {
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createBibleStyles(isDark), [isDark]);

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
                {currentBook} {currentChapter}:{selectedVerses.join(', ')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.noteModalCloseBtn}
            >
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
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
              onPress={onSave}
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
