import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { BookOpen, ChevronDown } from 'lucide-react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';
import { ResourceCard, SectionLabel } from './shared';
import { BIBLE_BOOKS_OT, BIBLE_BOOKS_NT } from './constants';
import type { BookPrologue } from '../../../../services/bookProloguesApi';

// ── BookPrologueSection ───────────────────────────────────────────────────

export function BookPrologueSection({
  prologue,
  bookName,
  colors,
  isRtl,
}: {
  prologue: BookPrologue;
  bookName: string;
  colors: any;
  isRtl: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded((p) => !p)}>
      <ResourceCard colors={colors} accentColor="#6366F1">
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
          <View style={[bsStyles.icon, { backgroundColor: '#6366F114' }]}>
            <BookOpen size={16} color="#6366F1" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[bsStyles.title, { color: colors.text }]}>About {bookName}</Text>
            <Text style={[bsStyles.subtitle, { color: colors.muted }]}>Book introduction & context</Text>
          </View>
          <ChevronDown
            size={16}
            color={colors.muted}
            strokeWidth={2}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        </View>

        {expanded && (
          <View style={{ marginTop: SPACING.md, gap: 12 }}>
            {prologue.summary ? (
              <Text style={[bsStyles.bodyText, { color: colors.textSecondary }]}>{prologue.summary}</Text>
            ) : null}

            <View style={[bsStyles.divider, { backgroundColor: colors.border }]} />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {prologue.author ? (
                <View style={[bsStyles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[bsStyles.factLabel, { color: colors.muted }]}>Author</Text>
                  <Text style={[bsStyles.factValue, { color: colors.text }]}>{prologue.author}</Text>
                </View>
              ) : null}
              {prologue.audience ? (
                <View style={[bsStyles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[bsStyles.factLabel, { color: colors.muted }]}>Audience</Text>
                  <Text style={[bsStyles.factValue, { color: colors.text }]}>{prologue.audience}</Text>
                </View>
              ) : null}
              {prologue.dateWritten ? (
                <View style={[bsStyles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[bsStyles.factLabel, { color: colors.muted }]}>Date</Text>
                  <Text style={[bsStyles.factValue, { color: colors.text }]}>{prologue.dateWritten}</Text>
                </View>
              ) : null}
              {prologue.locationWritten ? (
                <View style={[bsStyles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[bsStyles.factLabel, { color: colors.muted }]}>Location</Text>
                  <Text style={[bsStyles.factValue, { color: colors.text }]}>{prologue.locationWritten}</Text>
                </View>
              ) : null}
            </View>

            {prologue.keyTheme ? (
              <View style={[bsStyles.themeBox, { backgroundColor: '#6366F10D', borderColor: '#6366F124' }]}>
                <Text style={[bsStyles.themeLabel, { color: '#6366F1' }]}>Key Theme</Text>
                <Text style={[bsStyles.themeContent, { color: colors.text }]}>{prologue.keyTheme}</Text>
              </View>
            ) : null}

            {prologue.purpose ? (
              <View>
                <Text style={[bsStyles.expTitle, { color: colors.text }]}>Purpose</Text>
                <Text style={[bsStyles.bodyText, { color: colors.textSecondary }]}>{prologue.purpose}</Text>
              </View>
            ) : null}

            {prologue.mainThemes && prologue.mainThemes.length > 0 ? (
              <View>
                <Text style={[bsStyles.expTitle, { color: colors.text }]}>Main Themes</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {prologue.mainThemes.map((t, i) => (
                    <View key={i} style={[bsStyles.chip, { backgroundColor: '#6366F112', borderColor: '#6366F126' }]}>
                      <Text style={[bsStyles.chipText, { color: '#6366F1' }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {prologue.christConnection ? (
              <View style={[bsStyles.christBox, { borderColor: '#6366F126', backgroundColor: '#6366F10D' }]}>
                <Text style={[bsStyles.christLabel, { color: '#6366F1' }]}>Connection to Christ</Text>
                <Text style={[bsStyles.bodyText, { color: colors.textSecondary }]}>{prologue.christConnection}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ResourceCard>
    </TouchableOpacity>
  );
}

// ── AllBooksPrologueSection ───────────────────────────────────────────────

export function AllBooksPrologueSection({
  prologues,
  loading,
  loadingMore,
  hasNext,
  total,
  onLoadMore,
  colors,
  isRtl,
}: {
  prologues: BookPrologue[];
  loading: boolean;
  loadingMore: boolean;
  hasNext: boolean;
  total: number;
  onLoadMore: () => void;
  colors: any;
  isRtl: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  const prologueMap = useMemo(() => {
    const map: Record<string, BookPrologue> = {};
    for (const p of prologues) map[p.bookName] = p;
    return map;
  }, [prologues]);

  const renderBookCard = (bookName: string) => {
    const p = prologueMap[bookName];
    if (!p) return null;
    const isOt = BIBLE_BOOKS_OT.includes(bookName);
    const accentColor = isOt ? '#4F6EF7' : '#8B5CF6';
    const isExpanded = expandedBook === bookName;
    const previewText = p.keyTheme || p.summary || p.purpose;

    return (
      <TouchableOpacity
        key={bookName}
        activeOpacity={0.7}
        onPress={() => setExpandedBook(isExpanded ? null : bookName)}
      >
        <ResourceCard colors={colors} accentColor={accentColor}>
          <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
            <View style={[bsStyles.icon, { backgroundColor: `${accentColor}16` }]}>
              <BookOpen size={16} color={accentColor} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[bsStyles.title, { color: colors.text }]} numberOfLines={1}>
                {bookName}
              </Text>
              {previewText && !isExpanded ? (
                <Text style={[bsStyles.subtitle, { color: colors.muted }]} numberOfLines={2}>
                  {previewText}
                </Text>
              ) : null}
            </View>
            <ChevronDown
              size={16}
              color={colors.muted}
              strokeWidth={2}
              style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
            />
          </View>

          {isExpanded && p && (
            <View style={{ marginTop: SPACING.md, gap: 10 }}>
              <View style={[bsStyles.divider, { backgroundColor: colors.border }]} />
              {p.summary ? (
                <Text style={[bsStyles.bodyText, { color: colors.textSecondary }]}>{p.summary}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {p.author ? (
                  <View style={[bsStyles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[bsStyles.factLabel, { color: colors.muted }]}>Author</Text>
                    <Text style={[bsStyles.factValue, { color: colors.text }]}>{p.author}</Text>
                  </View>
                ) : null}
                {p.audience ? (
                  <View style={[bsStyles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[bsStyles.factLabel, { color: colors.muted }]}>Audience</Text>
                    <Text style={[bsStyles.factValue, { color: colors.text }]}>{p.audience}</Text>
                  </View>
                ) : null}
                {p.dateWritten ? (
                  <View style={[bsStyles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[bsStyles.factLabel, { color: colors.muted }]}>Date</Text>
                    <Text style={[bsStyles.factValue, { color: colors.text }]}>{p.dateWritten}</Text>
                  </View>
                ) : null}
              </View>
              {p.keyTheme ? (
                <View style={[bsStyles.themeBox, { backgroundColor: `${accentColor}0D`, borderColor: `${accentColor}24` }]}>
                  <Text style={[bsStyles.themeLabel, { color: accentColor }]}>Key Theme</Text>
                  <Text style={[bsStyles.themeContent, { color: colors.text }]}>{p.keyTheme}</Text>
                </View>
              ) : null}
              {p.purpose ? (
                <View>
                  <Text style={[bsStyles.expTitle, { color: colors.text }]}>Purpose</Text>
                  <Text style={[bsStyles.bodyText, { color: colors.textSecondary }]}>{p.purpose}</Text>
                </View>
              ) : null}
              {p.mainThemes?.length ? (
                <View>
                  <Text style={[bsStyles.expTitle, { color: colors.text }]}>Main Themes</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {p.mainThemes.map((t, i) => (
                      <View key={i} style={[bsStyles.chip, { backgroundColor: `${accentColor}12`, borderColor: `${accentColor}26` }]}>
                        <Text style={[bsStyles.chipText, { color: accentColor }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </ResourceCard>
      </TouchableOpacity>
    );
  };

  const renderCovenantSection = (books: string[], name: string, accentColor: string) => {
    const visible = books.filter((b) => prologueMap[b]);
    if (visible.length === 0) return null;
    return (
      <View style={{ marginBottom: SPACING.sm }}>
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: accentColor }} />
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 }}>{name}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>{visible.length} books</Text>
        </View>
        <View style={{ gap: SPACING.sm }}>
          {visible.map((b) => renderBookCard(b))}
        </View>
      </View>
    );
  };

  const ntCount = BIBLE_BOOKS_NT.filter((b) => prologueMap[b]).length;

  if (loading && prologues.length === 0) {
    return (
      <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg }}>
        <SectionLabel icon={<BookOpen size={15} color="#6366F1" />} label="Book Prologue Library" color="#6366F1" colors={colors} />
        <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded((p) => !p)}>
        <ResourceCard colors={colors} accentColor="#6366F1">
          <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
            <View style={[bsStyles.icon, { backgroundColor: '#6366F114' }]}>
              <BookOpen size={16} color="#6366F1" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[bsStyles.title, { color: colors.text }]}>Book Prologue Library</Text>
              <Text style={[bsStyles.subtitle, { color: colors.muted }]}>
                {prologues.length}{total ? ` of ${total}` : ''} book introductions
              </Text>
            </View>
            <ChevronDown
              size={16}
              color={colors.muted}
              strokeWidth={2}
              style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
            />
          </View>
        </ResourceCard>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingTop: SPACING.sm }}>
          {renderCovenantSection(BIBLE_BOOKS_OT, 'Old Testament', '#4F6EF7')}
          {ntCount > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: SPACING.sm }} />}
          {renderCovenantSection(BIBLE_BOOKS_NT, 'New Testament', '#8B5CF6')}
          {(loadingMore || hasNext) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: SPACING.md }}>
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <TouchableOpacity activeOpacity={0.7} onPress={onLoadMore} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Load more books</Text>
                  <ChevronDown size={13} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const bsStyles = StyleSheet.create({
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 1 },
  bodyText: { fontSize: FONT_SIZES.sm, lineHeight: 20 },
  divider: { height: 1 },
  fact: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  factLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  factValue: { fontSize: FONT_SIZES.sm, fontWeight: '700', marginTop: 1 },
  themeBox: { padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  themeLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  themeContent: { fontSize: FONT_SIZES.sm, lineHeight: 19, fontWeight: '600' },
  expTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 10, fontWeight: '700' },
  christBox: { padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  christLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
});
