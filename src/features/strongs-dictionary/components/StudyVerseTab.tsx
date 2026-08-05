import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../../component/navigations/routes';
import VerseSelector from './VerseSelector';
import SelectedVerseCard from './SelectedVerseCard';
import StudyToolsList from './StudyToolsList';
import LabStudiesSection from './LabStudiesSection';

interface Props {
  translationId: string;
  onSetTranslation: (id: string) => void;
  isDark: boolean;
  colors: any;
}

interface SelectedVerse {
  bookName: string;
  chapter: number;
  verse: number;
}

/**
 * Study Verse tab — the heart of the dictionary design: select a verse,
 * read it in the selected translation, open any of the four study tools,
 * and see any Exegesis Lab studies done on that verse.
 */
export default function StudyVerseTab({
  translationId,
  onSetTranslation,
  isDark,
  colors,
}: Props) {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<SelectedVerse | null>(null);

  const handleGoToVerse = useCallback(
    (bookName: string, chapter: number, verse: number) => {
      setSelected({ bookName, chapter, verse });
    },
    [],
  );

  const handleViewInContext = useCallback(() => {
    if (!selected) return;
    const { bookName, chapter, verse } = selected;
    navigation.navigate(route.bible, { bookName, chapter, verseNumber: verse });
  }, [selected, navigation]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <VerseSelector
        translationId={translationId}
        onGoToVerse={handleGoToVerse}
        colors={colors}
      />

      {selected && (
        <>
          <SelectedVerseCard
            bookName={selected.bookName}
            chapter={selected.chapter}
            verse={selected.verse}
            translationId={translationId}
            onSetTranslation={onSetTranslation}
            onViewInContext={handleViewInContext}
            colors={colors}
            isDark={isDark}
          />

          <StudyToolsList
            bookName={selected.bookName}
            chapter={selected.chapter}
            verse={selected.verse}
            translationId={translationId}
            isDark={isDark}
            colors={colors}
          />

          <LabStudiesSection
            bookName={selected.bookName}
            chapter={selected.chapter}
            verse={selected.verse}
            colors={colors}
          />
        </>
      )}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  bottomSpacer: { height: 90 },
});
