import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { SearchModalProps } from '../types';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';
import {
  getColors,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
} from '../../../constants/theme';
import { createBibleStyles } from '../bibleStyle';

export default function SearchModal({
  visible,
  onClose,
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectResult,
  loading,
  versionName,
  versionAbbreviation,
  isDark,
}: SearchModalProps) {
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createBibleStyles(isDark), [isDark]);

  // ── Close: only clears query — does NOT race with onSelectResult ──────────
  const handleClose = () => {
    onSearchChange('');
    onClose();
  };

  // ── Safe "Go" handler — reads all possible field-name variants ────────────
  const handleSelectResult = (result: any) => {
    const book: string = result.book ?? result.bookName ?? '';
    const chapter: number = Number(result.chapter ?? result.chapterNum ?? 1);
    const verse: number | any =
      result.verse !== undefined
        ? Number(result.verse)
        : result.verseNumber !== undefined
          ? Number(result.verseNumber)
          : undefined;

    if (!book) return;
    onSelectResult(book, chapter, verse);
  };

  // ── Highlighted text renderer ─────────────────────────────────────────────
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return <Text style={styles.resultText}>{text}</Text>;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return (
      <Text style={styles.resultText}>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <Text key={i} style={styles.highlightedText}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          ),
        )}
      </Text>
    );
  };

  const searchSuggestions = ['love', 'faith', 'hope', 'peace', 'joy', 'grace'];
  const queryTrimmed = searchQuery.trim();
  const showResults = searchResults.length > 0 && !loading;
  const showLoading = loading && queryTrimmed.length > 2;
  const showNoResults =
    !loading && queryTrimmed.length > 2 && searchResults.length === 0;
  const showEmpty = queryTrimmed.length === 0;
  const showMinLength = queryTrimmed.length > 0 && queryTrimmed.length <= 2;



  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          style={[
            styles.modalOverlay,
            { justifyContent: 'flex-start', paddingTop: 60 },
          ]}
        >
          <View style={styles.modalContainerSearch}>
            {/* ── Header ── */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{bc?.searchBibleTitle || 'Search Bible'}</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── Version badge ── */}
            <View
              style={{
                paddingHorizontal: SPACING.lg,
                paddingBottom: SPACING.xs,
              }}
            >
              <Text style={{ fontSize: FONT_SIZES.xs, color: COLORS.muted, marginRight: 4 }}>
                {bc?.searchingIn || 'Searching in:'}{' '}
                <Text style={{ fontWeight: '700', color: COLORS.primary }}>
                  {versionAbbreviation} – {versionName}
                </Text>
              </Text>
            </View>

            {/* ── Input row ── */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                {showLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.primary}
                    style={styles.searchIconStyle}
                  />
                ) : (
                  <Search
                    size={20}
                    color={COLORS.muted}
                    style={styles.searchIconStyle}
                  />
                )}
                <TextInput
                  style={styles.searchInputStyle}
                  placeholder={bc?.searchHint || "Search verses (e.g., 'love', 'faith')..."}
                  placeholderTextColor={COLORS.muted}
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  autoFocus
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => onSearchChange('')}
                    style={styles.clearSearchBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={COLORS.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {showMinLength && (
                <Text style={styles.searchHintText}>
                  💡 {bc?.typeMinChars || 'Type at least 3 characters to search'}
                </Text>
              )}

              {showLoading && (
                <View style={localStyles.loadingRow}>
                  <Text
                    style={[localStyles.loadingText, { color: COLORS.muted }]}
                  >
                    {bc?.searchingFor || 'Searching for'} "{searchQuery}"…
                  </Text>
                </View>
              )}

              {showResults && (
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsCount}>
                    ✓ {bc?.foundResults || 'Found'} {searchResults.length} {bc?.verses || 'verse'}
                    {searchResults.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Content area ── */}
            {showLoading ? (
              /* Skeleton placeholders while debounce fires */
              <View style={localStyles.skeletonContainer}>
                {[0.9, 0.75, 0.85, 0.7].map((opacity, i) => (
                  <View
                    key={i}
                    style={[
                      localStyles.skeletonCard,
                      {
                        backgroundColor: isDark ? '#2a2a2a' : '#efefef',
                        opacity,
                      },
                    ]}
                  >
                    <View
                      style={[
                        localStyles.skeletonLine,
                        localStyles.skeletonLineShort,
                        { backgroundColor: isDark ? '#3a3a3a' : '#ddd' },
                      ]}
                    />
                    <View
                      style={[
                        localStyles.skeletonLine,
                        { backgroundColor: isDark ? '#3a3a3a' : '#ddd' },
                      ]}
                    />
                    <View
                      style={[
                        localStyles.skeletonLine,
                        localStyles.skeletonLineMid,
                        { backgroundColor: isDark ? '#3a3a3a' : '#ddd' },
                      ]}
                    />
                  </View>
                ))}
              </View>
            ) : showResults ? (
              /* Results list */
              <FlatList
                data={searchResults}
                style={styles.searchScrollView}
                contentContainerStyle={styles.searchScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => {
                      console.log('Selected search result:', item);
                      handleSelectResult(item);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultReference}>
                        {item.book} {item.chapter}:{item.verse}
                      </Text>
                      <View style={styles.resultGoBadge}>
                        <Text style={styles.resultGoBadgeText}>Go →</Text>
                      </View>
                    </View>
                    {renderHighlightedText(item.text ?? '', searchQuery)}
                  </TouchableOpacity>
                )}
              />
            ) : (
              /* Empty / no-results states */
              <View
                style={[
                  styles.searchScrollView,
                  styles.searchScrollContent,
                  styles.searchScrollEmpty,
                ]}
              >
                {showEmpty && (
                  <View style={styles.emptySearchView}>
                    <View style={styles.emptySearchIconCircle}>
                      <Search size={48} color={COLORS.muted} />
                    </View>
                    <Text style={styles.emptySearchHeading}>
                      {bc?.searchBible || 'Search the Bible'}
                    </Text>
                    <Text style={styles.emptySearchSubtext}>
                      {bc?.enterKeywords || 'Enter keywords to find verses across all books'}
                    </Text>
                    <View style={styles.searchSuggestionsBox}>
                      <Text style={styles.suggestionsHeading}>
                        {bc?.trySearchingFor || 'Try searching for:'}
                      </Text>
                      <View style={styles.suggestionsChips}>
                        {searchSuggestions.map(word => (
                          <TouchableOpacity
                            key={word}
                            style={styles.suggestionChipButton}
                            onPress={() => onSearchChange(word)}
                          >
                            <Text style={styles.suggestionChipText}>
                              {word}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {showNoResults && (
                  <View style={styles.emptySearchView}>
                    <Text style={styles.emptyBigIcon}>🔍</Text>
                    <Text style={styles.emptySearchHeading}>
                      {bc?.noResultsFound || 'No results found'}
                    </Text>
                    <Text style={styles.emptySearchSubtext}>
                      {bc?.tryDifferentKeywords || 'Try different keywords or check your spelling'}
                    </Text>
                    <TouchableOpacity
                      style={styles.clearAndRetryButton}
                      onPress={() => onSearchChange('')}
                    >
                      <Text style={styles.clearAndRetryText}>
                        {bc?.clearAndTryAgain || 'Clear & Try Again'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local styles
// ─────────────────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  loadingRow: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  skeletonCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    width: '100%',
  },
  skeletonLineShort: {
    width: '40%',
    height: 10,
  },
  skeletonLineMid: {
    width: '70%',
  },
});
