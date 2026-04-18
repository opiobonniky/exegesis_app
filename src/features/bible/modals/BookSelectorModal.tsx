import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
  TextInput,
} from 'react-native';
import { X, BookOpen, Search } from 'lucide-react-native';
import { BookSelectorModalProps } from '../types';
import { getColors, FONT_SIZES } from '../../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;

type Tab = 'Old' | 'New';

export default function BookSelectorModal({
  visible,
  onClose,
  books,
  currentBook,
  onSelectBook,
  isDark,
}: BookSelectorModalProps) {
  const COLORS = getColors(isDark);

  const [activeTab, setActiveTab] = useState<Tab>('Old');
  const [query, setQuery] = useState('');

  // ── Animations ─────────────────────────────────────────────────────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const tabIndicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Set tab to current book's testament on open
      const found = books.find(b => b.name === currentBook);
      if (found) setActiveTab(found.testament as Tab);
      setQuery('');

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          speed: 18,
          bounciness: 5,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SHEET_HEIGHT,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setQuery('');
    Animated.spring(tabIndicatorX, {
      toValue: tab === 'Old' ? 0 : 1,
      speed: 20,
      bounciness: 6,
      useNativeDriver: false,
    }).start();
  };

  const oldBooks = books.filter(b => b.testament === 'Old');
  const newBooks = books.filter(b => b.testament === 'New');

  const displayed = (activeTab === 'Old' ? oldBooks : newBooks).filter(
    b =>
      query.length === 0 || b.name.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (name: string) => {
    onSelectBook(name);
    onClose();
  };

  // Tab pill width
  const TAB_WIDTH = (Dimensions.get('window').width - 40) / 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          s.sheet,
          {
            height: SHEET_HEIGHT,
            backgroundColor: COLORS.cardBackground,
            borderTopColor: COLORS.primary,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={s.handleRow}>
          <View style={[s.handle, { backgroundColor: COLORS.border }]} />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View
              style={[s.iconWrap, { backgroundColor: `${COLORS.primary}18` }]}
            >
              <BookOpen size={18} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View>
              <Text style={[s.title, { color: COLORS.text }]}>Select Book</Text>
              <Text style={[s.subtitle, { color: COLORS.muted }]}>
                {books.length} books · {oldBooks.length} OT · {newBooks.length}{' '}
                NT
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[s.closeBtn, { backgroundColor: COLORS.surface }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={17} color={COLORS.muted} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View
          style={[
            s.searchWrap,
            { backgroundColor: COLORS.surface, borderColor: COLORS.border },
          ]}
        >
          <Search
            size={15}
            color={COLORS.muted}
            strokeWidth={2}
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search books…"
            placeholderTextColor={COLORS.muted}
            style={[s.searchInput, { color: COLORS.text }]}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color={COLORS.muted} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* Testament tabs */}
        {query.length === 0 && (
          <View
            style={[
              s.tabsContainer,
              { backgroundColor: COLORS.surface, borderColor: COLORS.border },
            ]}
          >
            {/* Sliding pill indicator */}
            <Animated.View
              style={[
                s.tabPill,
                {
                  backgroundColor: COLORS.primary,
                  width: TAB_WIDTH,
                  left: tabIndicatorX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, TAB_WIDTH + 2],
                  }),
                },
              ]}
            />
            {(['Old', 'New'] as Tab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[s.tab, { width: TAB_WIDTH }]}
                onPress={() => switchTab(tab)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.tabText,
                    {
                      color: activeTab === tab ? COLORS.white : COLORS.muted,
                      fontWeight: activeTab === tab ? '700' : '500',
                    },
                  ]}
                >
                  {tab} Testament
                </Text>
                <Text
                  style={[
                    s.tabCount,
                    {
                      color:
                        activeTab === tab
                          ? 'rgba(255,255,255,0.7)'
                          : COLORS.muted,
                    },
                  ]}
                >
                  {tab === 'Old' ? oldBooks.length : newBooks.length} books
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Book list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
        >
          {displayed.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={[s.emptyText, { color: COLORS.muted }]}>
                No books found for "{query}"
              </Text>
            </View>
          ) : (
            displayed.map((book, index) => {
              const isActive = book.name === currentBook;
              const isLast = index === displayed.length - 1;
              return (
                <TouchableOpacity
                  key={book.name}
                  onPress={() => handleSelect(book.name)}
                  activeOpacity={0.7}
                  style={[
                    s.row,
                    {
                      backgroundColor: isActive
                        ? `${COLORS.primary}12`
                        : 'transparent',
                      borderBottomColor: COLORS.border,
                      borderBottomWidth: isLast ? 0 : 1,
                    },
                  ]}
                >
                  {/* Left: active strip */}
                  {isActive && (
                    <View
                      style={[
                        s.activeStrip,
                        { backgroundColor: COLORS.primary },
                      ]}
                    />
                  )}

                  {/* Book index number */}
                  <Text style={[s.bookIndex, { color: COLORS.muted }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>

                  {/* Book name */}
                  <Text
                    style={[
                      s.bookName,
                      {
                        color: isActive ? COLORS.primary : COLORS.text,
                        fontWeight: isActive ? '700' : '400',
                      },
                    ]}
                  >
                    {book.name}
                  </Text>

                  {/* Chapter count badge */}
                  <View
                    style={[
                      s.chapterBadge,
                      {
                        backgroundColor: isActive
                          ? `${COLORS.primary}20`
                          : COLORS.surface,
                        borderColor: isActive
                          ? `${COLORS.primary}40`
                          : COLORS.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.chapterBadgeText,
                        { color: isActive ? COLORS.primary : COLORS.muted },
                      ]}
                    >
                      {book.chapters} ch
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 14,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    height: '100%',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    height: 54,
    position: 'relative',
    overflow: 'hidden',
    padding: 2,
  },
  tabPill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    letterSpacing: -0.1,
  },
  tabCount: {
    fontSize: 10,
    marginTop: 1,
  },

  // List
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    position: 'relative',
    gap: 12,
  },
  activeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
  },
  bookIndex: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    width: 24,
    letterSpacing: 0.2,
  },
  bookName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    letterSpacing: -0.1,
  },
  chapterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  chapterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
  },
});
