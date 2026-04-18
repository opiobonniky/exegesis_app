import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  PanResponder,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';

interface NoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (noteText: string) => Promise<void>;
  currentBook: string;
  currentChapter: number;
  selectedVerses: number[];
  isDark: boolean;
  COLORS: any;
  styles: any;
}

const NoteModal: React.FC<NoteModalProps> = ({
  visible,
  onClose,
  onSave,
  currentBook,
  currentChapter,
  selectedVerses,
  isDark,
  COLORS,
  styles,
}) => {
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const screenHeight = Dimensions.get('window').height;
  const noteModalTranslateY = useRef(new Animated.Value(screenHeight)).current;

  // Animate modal in/out
  useEffect(() => {
    if (visible) {
      Animated.spring(noteModalTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Close modal animation
  const closeModal = () => {
    Keyboard.dismiss();
    Animated.timing(noteModalTranslateY, {
      toValue: screenHeight,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setNoteText('');
      setNoteSaving(false);
      onClose();
    });
  };

  // Pan responder for drag-to-close
  const notePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only allow dragging from top portion when keyboard is hidden
        return gesture.dy > 5 && keyboardHeight === 0;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          noteModalTranslateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 120) {
          closeModal();
        } else {
          Animated.spring(noteModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  // Save note handler
  const handleSave = async () => {
    if (!noteText.trim()) return;

    try {
      setNoteSaving(true);
      await onSave(noteText.trim());
      closeModal();
    } catch (error) {
      console.error('Error saving note:', error);
      setNoteSaving(false);
    }
  };

  // Calculate modal height based on keyboard
  const getModalHeight = () => {
    if (keyboardHeight > 0) {
      const maxHeight = 100 - (keyboardHeight / screenHeight) * 100;
      return `${Math.max(maxHeight, 50)}%`; // Minimum 50%
    }
    return '85%';
  };

  // Check if save button should be disabled
  const isSaveDisabled = noteSaving || !noteText.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.explanationModalOverlay} />
      </TouchableWithoutFeedback>

      {/* Modal Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            styles.noteModalContainer,
            {
              transform: [{ translateY: noteModalTranslateY }],
              maxHeight: getModalHeight(),
            },
          ]}
        >
          {/* Drag Handle */}
          <View
            style={styles.dragHandleWrapper}
            {...notePanResponder.panHandlers}
          >
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.noteModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.noteModalTitle}>Add Note</Text>
              <Text style={styles.noteModalSubtitle}>
                {currentBook} {currentChapter}:{selectedVerses.join(', ')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={closeModal}
              style={styles.noteModalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.noteModalScrollView}
            contentContainerStyle={styles.noteModalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.noteInputContainer}>
              <Text style={styles.noteLabel}>Your Note</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Write your thoughts, reflections, or insights about these verses..."
                placeholderTextColor={COLORS.muted}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                autoFocus
                maxLength={1000}
                returnKeyType="default"
                blurOnSubmit={false}
              />

              <View style={styles.noteCharCount}>
                <Text
                  style={[
                    styles.noteCharCountText,
                    noteText.length >= 950 && { color: COLORS.warning },
                    noteText.length === 1000 && { color: COLORS.error },
                  ]}
                >
                  {noteText.length}/1000 characters
                </Text>
              </View>
            </View>

            {/* Tips Section (Optional) */}
            {noteText.length === 0 && (
              <View style={styles.noteTipsContainer}>
                <Text style={styles.noteTipsTitle}>💡 Tips:</Text>
                <Text style={styles.noteTipsText}>
                  • Record your personal insights{'\n'}
                  • Note questions you have{'\n'}
                  • Connect verses to your life{'\n'}
                  • Write prayer points
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Fixed Action Buttons */}
          <View style={styles.noteModalActions}>
            <TouchableOpacity
              style={[
                styles.noteCancelBtn,
                noteSaving && { opacity: 0.5 },
              ]}
              onPress={closeModal}
              disabled={noteSaving}
              activeOpacity={0.7}
            >
              <Text style={styles.noteCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.noteSaveBtn,
                isSaveDisabled && styles.noteSaveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isSaveDisabled}
              activeOpacity={0.7}
            >
              {noteSaving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.noteSaveBtnText}>
                  Save Note
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default NoteModal;

// ============================================
// USAGE EXAMPLE IN BIBLE COMPONENT
// ============================================

/*
import NoteModal from './NoteModal';

// Inside your Bible component:

const [showNoteModal, setShowNoteModal] = useState(false);
const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

// Open note modal
const openNoteModal = () => {
  if (selectedVerses.length === 0) {
    setModal({
      status: true,
      title: 'No Verses Selected',
      message: 'Please select at least one verse to add a note.',
      severity: 'warning',
    });
    return;
  }
  setShowNoteModal(true);
};

// Save note handler
const saveNote = async (noteText: string) => {
  try {
    const response = await sendPostRequest('bible', 'add-verse-note', {
      bookName: currentBook,
      chapter: currentChapter,
      verseNumbers: selectedVerses,
      note: noteText,
    });

    if (response.returnCode !== 200) {
      setModal({
        status: true,
        title: 'Error',
        message: response.returnMessage || 'Failed to add note',
        severity: 'error',
      });
      throw new Error('Failed to save note');
    }

    // Success
    setModal({
      status: true,
      title: 'Success',
      message: `Note added to ${selectedVerses.length} verse${selectedVerses.length > 1 ? 's' : ''}`,
      severity: 'success',
    });

    setSelectedVerses([]);

    setTimeout(() => {
      setModal({
        status: false,
        title: '',
        message: '',
        severity: 'info',
      });
    }, 2000);
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
};

// In your JSX:
<NoteModal
  visible={showNoteModal}
  onClose={() => setShowNoteModal(false)}
  onSave={saveNote}
  currentBook={currentBook}
  currentChapter={currentChapter}
  selectedVerses={selectedVerses}
  isDark={isDark}
  COLORS={COLORS}
  styles={styles}
/>
*/