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
  ActivityIndicator,
} from 'react-native';
import { X, Globe, Search } from 'lucide-react-native';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';
import { getColors, FONT_SIZES } from '../../../constants/theme';
import { bibleApi, mapFrontendId } from '../../../services/bibleApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

export interface TranslationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentVersionId: string;
  onSelectVersion: (frontendId: string) => void;
  isDark: boolean;
  freeTranslationsOnly?: boolean;
}

const FREE_TRANSLATION_IDS = new Set(['Berean', 'BSB', 'KJV', 'NIV', 'ESV', 'WEB', 'GW', 'ASV', 'YLT']);

interface Translation {
  backendId: string;
  frontendId: string;
  name: string;
  shortName: string;
  year?: string | null;
}

export default function TranslationPickerModal({
  visible,
  onClose,
  currentVersionId,
  onSelectVersion,
  isDark,
  freeTranslationsOnly = false,
}: TranslationPickerModalProps) {
  const { translations: lang } = useLanguage();
  const bc = lang?.bible;
  const COLORS = getColors(isDark);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      loadTranslations();
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

  const loadTranslations = async () => {
    setLoading(true);
    try {
      const list = await bibleApi.getAvailableTranslationsWithMapping();
      setTranslations(list);
    } catch (error) {
      console.warn('Failed to load translations:', error);
      setTranslations([]);
    } finally {
      setLoading(false);
    }
  };

  const displayed = translations
    .filter(t => !freeTranslationsOnly || FREE_TRANSLATION_IDS.has(t.frontendId))
    .filter(
      t =>
        query.length === 0 ||
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.frontendId.toLowerCase().includes(query.toLowerCase()) ||
        t.shortName.toLowerCase().includes(query.toLowerCase()),
    );

  const handleSelect = (frontendId: string) => {
    onSelectVersion(frontendId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

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
        <View style={s.handleRow}>
          <View style={[s.handle, { backgroundColor: COLORS.border }]} />
        </View>

        <View style={s.header}>
          <View style={s.headerLeft}>
            <View
              style={[s.iconWrap, { backgroundColor: `${COLORS.primary}18` }]}
            >
              <Globe size={18} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View>
              <Text style={[s.title, { color: COLORS.text }]}>
                {bc?.selectTranslation || 'Bible Translation'}
              </Text>
              <Text style={[s.subtitle, { color: COLORS.muted }]}>
                {loading
                  ? (bc?.loadingEllipsis || 'Loading…')
                  : `${displayed.length} ${bc?.translationsAvailable || 'translations available'}`}
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
            placeholder={bc?.searchTranslationsPlaceholder || 'Search translations…'}
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[s.loadingText, { color: COLORS.muted }]}>
                {bc?.loadingTranslationsText || 'Loading translations…'}
              </Text>
            </View>
          ) : displayed.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={[s.emptyText, { color: COLORS.muted }]}>
                {query
                  ? `${bc?.noTranslationsFound || 'No translations found for'} "${query}"`
                  : (bc?.noTranslationsAvailable || 'No translations available')}
              </Text>
            </View>
          ) : (
            displayed.map((t, index) => {
              const isActive = t.frontendId === currentVersionId;
              const isLast = index === displayed.length - 1;
              return (
                <TouchableOpacity
                  key={t.frontendId}
                  onPress={() => handleSelect(t.frontendId)}
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
                  {isActive && (
                    <View
                      style={[s.activeStrip, { backgroundColor: COLORS.primary }]}
                    />
                  )}

                  <View style={s.rowLeft}>
                    <View
                      style={[
                        s.abbrevBadge,
                        {
                          backgroundColor: isActive
                            ? COLORS.primary
                            : COLORS.surface,
                          borderColor: isActive
                            ? COLORS.primary
                            : COLORS.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.abbrevText,
                          { color: isActive ? '#fff' : COLORS.text },
                        ]}
                      >
                        {t.shortName || t.frontendId}
                      </Text>
                    </View>
                    <View style={s.rowText}>
                      <Text
                        style={[
                          s.rowName,
                          {
                            color: isActive ? COLORS.primary : COLORS.text,
                            fontWeight: isActive ? '700' : '400',
                          },
                        ]}
                      >
                        {t.name}
                      </Text>
                      {t.year && (
                        <Text style={[s.rowYear, { color: COLORS.muted }]}>
                          {t.year}
                        </Text>
                      )}
                    </View>
                  </View>

                  {isActive && (
                    <View style={[s.checkBadge, { backgroundColor: COLORS.primary }]}>
                      <Text style={s.checkText}>✓</Text>
                    </View>
                  )}
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
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    overflow: 'hidden',
  },
  activeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  abbrevBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
  },
  abbrevText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 15,
  },
  rowYear: {
    fontSize: 12,
    marginTop: 1,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});