import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, ArrowRight } from 'lucide-react-native';
import { bibleApi } from '../../../services/bibleApi';
import {
  getVersesForChapter,
  NEW_TESTAMENT_BOOKS,
} from '../../../utilits/bibleUtils';
import OptionPickerModal from './OptionPickerModal';
import BookPickerModal from './BookPickerModal';
import ChapterPickerModal from './ChapterPickerModal';

interface BookMeta {
  bookName: string;
  chaptersCount: number;
  testament: string;
}

interface Props {
  translationId: string;
  initialBook?: string;
  initialChapter?: string;
  initialVerse?: string;
  onGoToVerse: (book: string, chapter: number, verse: number) => void;
  colors: any;
}

/**
 * "SELECT YOUR VERSE" section — three dropdown fields (Book / Chapter /
 * Verse) plus a "Go to Verse" action button, matching the dictionary design.
 * Book uses an OT/NT-tabbed compact grid; Chapter shows heading previews.
 */
export default function VerseSelector({
  translationId,
  initialBook,
  initialChapter,
  initialVerse,
  onGoToVerse,
  colors,
}: Props) {
  const [book, setBook] = useState(initialBook || '');
  const [chapter, setChapter] = useState(initialChapter || '');
  const [verse, setVerse] = useState(initialVerse || '');

  const [books, setBooks] = useState<BookMeta[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [bookHeadings, setBookHeadings] = useState<
    Record<number, Array<{ verse: number; heading: string }>>
  >({});
  const [picker, setPicker] = useState<'book' | 'chapter' | 'verse' | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setBooksLoading(true);
      try {
        const data = await bibleApi.getBooksWithMaxChapters(translationId);
        if (mounted) {
          setBooks(
            data.map(b => ({
              bookName: b.bookName,
              chaptersCount: b.chaptersCount,
              testament:
                b.testament ||
                (NEW_TESTAMENT_BOOKS.includes(b.bookName) ? 'New' : 'Old'),
            })),
          );
        }
      } catch {
        if (mounted) setBooks([]);
      } finally {
        if (mounted) setBooksLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [translationId]);

  // Preload all chapter headings for the selected book so the chapter
  // picker can preview titles like "The Garden of Eden".
  useEffect(() => {
    let mounted = true;
    if (!book) {
      setBookHeadings({});
      return;
    }
    bibleApi
      .getBookHeadings(translationId, book)
      .then(headings => {
        if (mounted) setBookHeadings(headings);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [translationId, book]);

  const maxChapter = useMemo(() => {
    const meta = books.find(b => b.bookName === book);
    return meta ? meta.chaptersCount : 1;
  }, [books, book]);

  const chapterVerses = useMemo(() => {
    if (!book || !chapter) return {};
    return getVersesForChapter(book, Number(chapter));
  }, [book, chapter]);

  const maxVerse = useMemo(() => {
    const keys = Object.keys(chapterVerses);
    return keys.length > 0 ? keys.length : 1;
  }, [chapterVerses]);

  const verseOptions = useMemo(
    () =>
      Array.from({ length: maxVerse }, (_, i) => ({
        label: String(i + 1),
        value: i + 1,
        subtitle: chapterVerses[i + 1] || '',
      })),
    [maxVerse, chapterVerses],
  );

  const onSelectBook = useCallback((value: string | number) => {
    setBook(String(value));
    setChapter('');
    setVerse('');
  }, []);

  const onSelectChapter = useCallback((value: string | number) => {
    setChapter(String(value));
    setVerse('');
  }, []);

  const onSelectVerse = useCallback(
    (value: string | number) => {
      const v = String(value);
      setVerse(v);
      setPicker(null);
      // Book + chapter are already chosen by the time the verse is picked, so
      // return the study tools immediately.
      onGoToVerse(book, Number(chapter), Number(v));
    },
    [book, chapter, onGoToVerse],
  );

  const goToVerse = useCallback(() => {
    if (!book || !chapter || !verse) return;
    onGoToVerse(book, Number(chapter), Number(verse));
  }, [book, chapter, verse, onGoToVerse]);

  const canGo = Boolean(book && chapter && verse);

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.primary }]}>
        SELECT YOUR VERSE
      </Text>

      <View style={styles.fieldRow}>
        {/* ── Book ── */}
        <TouchableOpacity
          style={[styles.field, styles.fieldBook, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => setPicker('book')}
        >
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Book</Text>
          <View style={styles.fieldValueRow}>
            <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>
              {book || 'Select'}
            </Text>
            <ChevronDown size={15} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* ── Chapter ── */}
        <TouchableOpacity
          style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => setPicker('chapter')}
        >
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Chapter</Text>
          <View style={styles.fieldValueRow}>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {chapter || '—'}
            </Text>
            <ChevronDown size={15} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* ── Verse ── */}
        <TouchableOpacity
          style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => setPicker('verse')}
        >
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Verse</Text>
          <View style={styles.fieldValueRow}>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {verse || '—'}
            </Text>
            <ChevronDown size={15} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* ── Go to Verse (inline, end of the same row) ── */}
        <TouchableOpacity
          style={[
            styles.goBtn,
            { backgroundColor: colors.primary },
            !canGo && styles.goBtnDisabled,
          ]}
          activeOpacity={0.85}
          disabled={!canGo}
          onPress={goToVerse}
        >
          <Text style={styles.goBtnText}>Go to Verse</Text>
          <ArrowRight size={15} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {booksLoading && <ActivityIndicator size="small" color={colors.primary} style={styles.loading} />}

      {/* ── Pickers ── */}
      <BookPickerModal
        visible={picker === 'book'}
        books={books}
        selectedBook={book}
        onSelect={onSelectBook}
        onClose={() => setPicker(null)}
        colors={colors}
      />
      <ChapterPickerModal
        visible={picker === 'chapter'}
        bookName={book || 'Select a book'}
        maxChapters={maxChapter}
        selectedChapter={chapter ? Number(chapter) : undefined}
        headings={bookHeadings}
        onSelect={onSelectChapter}
        onClose={() => setPicker(null)}
        colors={colors}
      />
      <OptionPickerModal
        visible={picker === 'verse'}
        title={`${book} ${chapter} — Verse`}
        options={verseOptions}
        selectedValue={verse}
        onSelect={onSelectVerse}
        onClose={() => setPicker(null)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  field: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fieldBook: {
    flex: 1.25,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  goBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  goBtnText: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  goBtnDisabled: {
    opacity: 0.5,
  },
  loading: {
    marginTop: 10,
    alignSelf: 'center',
  },
});
