import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { BookOpen, Trash2, Edit3, X, Save } from 'lucide-react-native';

import { sendPostRequest } from '../../services/api';
import { getVerseText } from '../../utilits/bibleUtils';
import {
  SPACING,
  BORDER_RADIUS,
  getColors,
  createThemeStyles,
} from '../../constants/theme';
import ActionHeader from '../../reusable/ActionHeader';
import { useNavigation } from '@react-navigation/native';
import ActionModal from '../../reusable/ActionModal';
import { AppContext } from '../../common/AppContext';
import { showToast } from '../../helpers/Toash.helper';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';

interface NoteDto {
  id: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  note: string;
  createdOn: string;
  updatedOn: string;
}

interface GroupedNotes {
  [book: string]: {
    [chapter: number]: NoteDto[];
  };
}

export default function Notes() {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [editingNote, setEditingNote] = useState<NoteDto | null>(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState<any>({
    status: false,
    title: '',
    message: '',
    severity: 'info',
  });

  const { isDark }: any = useContext(AppContext) || {};
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const bc = translations?.bible;

  const navigation = useNavigation<any>();
  const COLORS = getColors(isDark);
  const themeStyle = createThemeStyles(COLORS);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await sendPostRequest('bible', 'get-verse-note', {});

      if (response.returnCode === 200 && response.returnData) {
        setNotes(response.returnData);
      } else {
        showToast('error', response.returnMessage || 'Failed to load notes');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo<GroupedNotes>(() => {
    return notes.reduce((acc, n) => {
      if (!acc[n.bookName]) acc[n.bookName] = {};
      if (!acc[n.bookName][n.chapter]) acc[n.bookName][n.chapter] = [];
      acc[n.bookName][n.chapter].push(n);
      return acc;
    }, {} as GroupedNotes);
  }, [notes]);

  const openEditModal = (note: NoteDto) => {
    setEditingNote(note);
    setEditText(note.note);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingNote(null);
    setEditText('');
  };

  const saveEditedNote = async () => {
    if (!editingNote || !editText.trim()) {
      showToast('error', 'Note text cannot be empty when saving');
      return;
    }

    try {
      setSaving(true);
      const response = await sendPostRequest('bible', 'add-verse-note', {
        bookName: editingNote.bookName,
        chapter: editingNote.chapter,
        verseNumbers: [editingNote.verseNumber],
        note: editText.trim(),
      });

      if (response.returnCode === 200) {
        showToast('success', 'Note updated successfully');

        // Update local state
        setNotes(prev =>
          prev.map(n =>
            n.id === editingNote.id ? { ...n, note: editText.trim() } : n,
          ),
        );

        closeEditModal();
      } else {
        showToast('error', response.returnMessage || 'Failed to update note');
      }
    } catch (error) {
      showToast('error', 'Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async (noteId: number) => {
    try {
      const response = await sendPostRequest('bible', 'delete-verse-note', {
        noteIds: [noteId],
      });

      if (response.returnCode === 200) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        showToast('success', 'Note deleted successfully');
      } else {
        showToast('error', response.returnMessage || 'Failed to remove note');
      }
    } catch (e) {
      showToast('error', 'Failed to remove note');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[themeStyle.container, themeStyle.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[themeStyle.container, { marginTop: -SPACING.xl }]}>
      <ActionHeader title={bc?.myNotes || 'My Notes'} onPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={themeStyle.scrollContainer}>
        {Object.keys(grouped).length === 0 && (
          <View style={[themeStyle.center, themeStyle.mt6]}>
            <BookOpen size={48} color={COLORS.muted} />
            <Text style={[themeStyle.headingText, themeStyle.mt3, { textAlign: isRtl ? 'right' : 'center' }]}>
              {bc?.noNotes || 'No notes yet'}
            </Text>
            <Text style={[themeStyle.mutedText, themeStyle.mt2, { textAlign: isRtl ? 'right' : 'center' }]}>
              {bc?.noNotesSubtitle || 'Add notes to verses while reading the Bible'}
            </Text>
          </View>
        )}

        {Object.entries(grouped).map(([book, chapters]) => (
          <View key={book} style={themeStyle.mb6}>
            <Text style={[themeStyle.headingText, themeStyle.mb3]}>{book}</Text>

            {Object.entries(chapters).map(([chapter, verses]) => (
              <View key={chapter} style={themeStyle.mb4}>
                <Text style={[themeStyle.subheadingText, themeStyle.mb2, { textAlign: isRtl ? 'right' : 'left' }]}>
                  {bc?.chapter || 'Chapter'} {chapter}
                </Text>

                {verses
                  .sort((a, b) => a.verseNumber - b.verseNumber)
                  .map(note => {
                    const verseText = getVerseText(
                      book,
                      note.chapter,
                      note.verseNumber,
                    );

                    return (
                      <View
                        key={note.id}
                        style={[
                          themeStyle.card,
                          themeStyle.mb3,
                          isRtl ? {
                            borderRightWidth: 4,
                            borderRightColor: COLORS.primary,
                          } : {
                            borderLeftWidth: 4,
                            borderLeftColor: COLORS.primary,
                          },
                        ]}
                      >
                        <View
                          style={[themeStyle.rowSpaceBetween, themeStyle.mb2]}
                        >
                          <View style={{ alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
                            <Text style={[themeStyle.captionText, { textAlign: isRtl ? 'right' : 'left' }]}>
                              {book} {note.chapter}:{note.verseNumber}
                            </Text>
                            <Text
                              style={[
                                themeStyle.captionText,
                                { fontSize: 11, marginTop: 2, textAlign: isRtl ? 'right' : 'left' },
                              ]}
                            >
                              {formatDate(note.updatedOn || note.createdOn)}
                            </Text>
                          </View>

                          <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', gap: 12 }}>
                            <TouchableOpacity
                              onPress={() => openEditModal(note)}
                            >
                              <Edit3 size={18} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeNote(note.id)}
                            >
                              <Trash2 size={18} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text
                          style={[
                            themeStyle.bodyTextSecondary,
                            { lineHeight: 22, marginBottom: SPACING.sm, textAlign: isRtl ? 'right' : 'left' },
                          ]}
                        >
                          {verseText}
                        </Text>

                        <View
                          style={{
                            marginTop: SPACING.sm,
                            padding: SPACING.md,
                            borderRadius: BORDER_RADIUS.md,
                            backgroundColor: COLORS.surface,
                          }}
                        >
                          <Text
                            style={[
                              themeStyle.bodyText,
                              { fontStyle: 'italic', lineHeight: 20, textAlign: isRtl ? 'right' : 'left' },
                            ]}
                          >
                            📝 {note.note}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Edit Note Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.overlay,
            justifyContent: 'center',
            alignItems: 'center',
            padding: SPACING.xl,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 500,
              backgroundColor: COLORS.background,
              borderRadius: BORDER_RADIUS.xl,
              padding: SPACING.xl,
            }}
          >
            <View
              style={[themeStyle.rowSpaceBetween, { marginBottom: SPACING.lg, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
            >
              <Text style={[themeStyle.headingText, { textAlign: isRtl ? 'right' : 'left' }]}>{bc?.editNote || 'Edit Note'}</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {editingNote && (
              <Text
                style={[themeStyle.captionText, { marginBottom: SPACING.md, textAlign: isRtl ? 'right' : 'left' }]}
              >
                {editingNote.bookName} {editingNote.chapter}:
                {editingNote.verseNumber}
              </Text>
            )}

            <TextInput
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: BORDER_RADIUS.md,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: SPACING.lg,
                fontSize: 15,
                color: COLORS.text,
                minHeight: 150,
                textAlignVertical: 'top',
                marginBottom: SPACING.lg,
                textAlign: isRtl ? 'right' : 'left',
              }}
              placeholder={bc?.writeNotePlaceholder || 'Write your note...'}
              placeholderTextColor={COLORS.muted}
              value={editText}
              onChangeText={setEditText}
              multiline
              numberOfLines={6}
              autoFocus
            />

            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', gap: 12 }}>
              <TouchableOpacity
                style={[
                  themeStyle.button,
                  {
                    flex: 1,
                    backgroundColor: COLORS.surface,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  },
                ]}
                onPress={closeEditModal}
                disabled={saving}
              >
                <Text style={[themeStyle.buttonText, { color: COLORS.text }]}>
                  {bc?.cancel || 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  themeStyle.button,
                  {
                    flex: 1,
                    opacity: saving || !editText.trim() ? 0.5 : 1,
                  },
                ]}
                onPress={saveEditedNote}
                disabled={saving || !editText.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Save size={18} color={COLORS.white} />
                    <Text
                      style={[
                        themeStyle.buttonText,
                        { [isRtl ? 'marginRight' : 'marginLeft']: SPACING.sm },
                      ]}
                    >
                      {bc?.save || 'Save'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ActionModal
        visible={modal.status}
        title={modal.title}
        message={modal.message}
        severity={modal.severity}
        onConfirm={() => setModal({ ...modal, status: false })}
      />
    </View>
  );
}
