import React, { useEffect, useMemo, useState } from 'react';
import {
  Clipboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Volume2,
  BookOpen,
  ChevronDown,
} from 'lucide-react-native';
import { getVersionById } from '../../../assets/bibleVersion/json/bibleVersions';
import { getVerseText } from '../../../utilits/bibleUtils';
import { speak } from '../../../utilits/bibleTTS';
import {
  isFavoriteVerse,
  toggleFavoriteVerse,
} from '../services/strongsFavorites';
import { showToast } from '../../../helpers/Toash.helper';
import { BIBLE_VERSIONS } from '../../../assets/bibleVersion/json/bibleVersions';
import { primaryOnSurface } from '../themeHelper';
import OptionPickerModal from './OptionPickerModal';

interface Props {
  bookName: string;
  chapter: number;
  verse: number;
  translationId: string;
  onSetTranslation: (id: string) => void;
  onViewInContext: () => void;
  colors: any;
  isDark: boolean;
}

/**
 * Selected Verse Display Card — reference header with bookmark / copy /
 * speaker actions, the verse text (blue verse number), and a footer with
 * "View in Context" + the active translation selector.
 */
export default function SelectedVerseCard({
  bookName,
  chapter,
  verse,
  translationId,
  onSetTranslation,
  onViewInContext,
  colors,
  isDark,
}: Props) {
  const [bookmarked, setBookmarked] = useState(false);
  const [versionPicker, setVersionPicker] = useState(false);
  const onSurface = primaryOnSurface(colors, isDark);

  useEffect(() => {
    let mounted = true;
    isFavoriteVerse(bookName, chapter, verse).then(v => {
      if (mounted) setBookmarked(v);
    });
    return () => {
      mounted = false;
    };
  }, [bookName, chapter, verse]);

  const versionData = useMemo(
    () => getVersionById(translationId).load(),
    [translationId],
  );
  const activeVersion = getVersionById(translationId);
  const verseText = getVerseText(bookName, chapter, verse, versionData) || '';

  const ref = `${bookName} ${chapter}:${verse}`;

  const handleCopy = () => {
    const text = `${ref} ${activeVersion.abbreviation}\n${verseText}`;
    try {
      Clipboard.setString(text);
    } catch {
      showToast('error', 'Could not copy verse');
    }
  };

  const handleSpeak = () => {
    if (!verseText) {
      showToast('info', 'No text to read');
      return;
    }
    try {
      speak(`${ref}. ${verseText}`);
    } catch {
      showToast('error', 'Audio unavailable');
    }
  };

  const handleBookmark = async () => {
    const added = await toggleFavoriteVerse(bookName, chapter, verse);
    setBookmarked(added);
    showToast(added ? 'success' : 'info', added ? 'Verse saved' : 'Removed from favorites');
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* ── Header row: ref left, actions right on the same line ── */}
      <View style={styles.headerRow}>
        <Text
          style={[styles.ref, { color: onSurface }]}
          numberOfLines={1}
        >
          {ref.toUpperCase()}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border }]}
            onPress={handleBookmark}
            activeOpacity={0.75}
          >
            {bookmarked ? (
              <BookmarkCheck size={16} color={onSurface} strokeWidth={2.2} />
            ) : (
              <Bookmark size={16} color={colors.muted} strokeWidth={2.2} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border }]}
            onPress={handleCopy}
            activeOpacity={0.75}
          >
            <Copy size={16} color={colors.muted} strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border }]}
            onPress={handleSpeak}
            activeOpacity={0.75}
          >
            <Volume2 size={16} color={colors.muted} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Verse text: number + text flow on the same line ── */}
      <View style={styles.verseRow}>
        <Text style={[styles.verseNum, { color: onSurface }]}>{verse}</Text>
        <Text style={[styles.verseText, { color: colors.text }]}>
          {verseText || 'Verse text unavailable for this translation.'}
        </Text>
      </View>

      {/* ── Footer row ── */}
      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.viewInContext}
          onPress={onViewInContext}
          activeOpacity={0.75}
        >
          <BookOpen size={14} color={onSurface} strokeWidth={2.3} />
          <Text style={[styles.viewInContextText, { color: onSurface }]}>
            View in Context
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.versionBtn}
          onPress={() => setVersionPicker(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.versionText, { color: onSurface }]}>
            {activeVersion.abbreviation}
          </Text>
          <ChevronDown size={15} color={onSurface} />
        </TouchableOpacity>
      </View>

      <OptionPickerModal
        visible={versionPicker}
        title="Select Translation"
        options={BIBLE_VERSIONS.map(v => ({ label: v.name, value: v.id }))}
        selectedValue={translationId}
        onSelect={value => onSetTranslation(String(value))}
        onClose={() => setVersionPicker(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  ref: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 33,
    height: 33,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  verseNum: {
    flexShrink: 0,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
  },
  verseText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  viewInContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewInContextText: {
    fontSize: 13,
    fontWeight: '700',
  },
  versionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
