import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Easing,
  useWindowDimensions,
} from 'react-native';
import {
  X,
  ArrowLeft,
  BookOpen,
  BookText,
  Hash,
  Tags,
  Crosshair,
  ChevronRight,
  Languages,
  Book,
  FileText,
  Sparkles,
} from 'lucide-react-native';
import {
  getColors,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
} from '../../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Resource view type ────────────────────────────────────────────────────

type ResourceView = 'main' | 'translation' | 'dictionary' | 'interlinear';

// ── Demo resource data ─────────────────────────────────────────────────────

interface CommentaryEntry {
  author: string;
  title: string;
  text: string;
}

interface Crossref {
  ref: string;
  text: string;
}

interface WordStudyEntry {
  word: string;
  transliteration: string;
  meaning: string;
}

interface TopicEntry {
  name: string;
}

interface TranslationEntry {
  version: string;
  abbreviation: string;
  text: string;
}

interface DictionaryEntry {
  term: string;
  pronunciation: string;
  definition: string;
  description: string;
}

interface InterlinearWord {
  original: string;
  strongs: string;
  transliteration: string;
  translation: string;
}

const DEMO_TRANSLATIONS: TranslationEntry[] = [
  {
    version: 'New International Version',
    abbreviation: 'NIV',
    text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
  },
  {
    version: 'King James Version',
    abbreviation: 'KJV',
    text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  },
  {
    version: 'English Standard Version',
    abbreviation: 'ESV',
    text: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.',
  },
  {
    version: 'New Living Translation',
    abbreviation: 'NLT',
    text: 'For this is how God loved the world: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life.',
  },
  {
    version: 'New American Standard Bible',
    abbreviation: 'NASB',
    text: 'For God so loved the world, that He gave His only begotten Son, that whoever believes in Him shall not perish, but have eternal life.',
  },
];

const DEMO_DICTIONARY: DictionaryEntry[] = [
  {
    term: 'Atonement',
    pronunciation: 'uh-tohn-muhnt',
    definition: 'The reconciliation of God and humanity through the sacrificial death of Jesus Christ.',
    description: 'Derived from the Middle English phrase "at one" meaning to reconcile. In biblical theology, atonement refers to the work of Christ in dealing with the problem of sin and restoring the broken relationship between God and humanity. The Day of Atonement (Yom Kippur) in Leviticus 16 prefigures Christ\'s ultimate sacrifice.',
  },
  {
    term: 'Covenant',
    pronunciation: 'kuhv-uh-nuhnt',
    definition: 'A solemn divine agreement between God and His people, accompanied by promises and obligations.',
    description: 'From the Hebrew "berith" and Greek "diatheke." Scripture records several major covenants: with Noah (rainbow), Abraham (circumcision), Moses (the Law), David (perpetual throne), and the New Covenant in Christ\'s blood. Each reveals God\'s progressive redemptive plan.',
  },
  {
    term: 'Righteousness',
    pronunciation: 'rahy-chuhs-nis',
    definition: 'The quality of being morally right or justifiable in accordance with God\'s standard.',
    description: 'In the Old Testament, "tsedeq" conveys the concept of right relationship and conformity to a norm. In the New Testament, "dikaiosyne" carries legal and ethical dimensions. Paul develops the doctrine of imputed righteousness — Christ\'s righteousness credited to believers through faith.',
  },
];

const DEMO_INTERLINEAR: InterlinearWord[] = [
  { original: 'Οὕτως', strongs: 'G3779', transliteration: 'Houtōs', translation: 'Thus/So' },
  { original: 'γὰρ', strongs: 'G1063', transliteration: 'gar', translation: 'for' },
  { original: 'ἠγάπησεν', strongs: 'G25', transliteration: 'ēgapēsen', translation: 'loved' },
  { original: 'ὁ', strongs: 'G3588', transliteration: 'ho', translation: 'the' },
  { original: 'Θεὸς', strongs: 'G2316', transliteration: 'Theos', translation: 'God' },
  { original: 'τὸν', strongs: 'G3588', transliteration: 'ton', translation: 'the' },
  { original: 'κόσμον', strongs: 'G2889', transliteration: 'kosmon', translation: 'world' },
  { original: 'ὥστε', strongs: 'G5620', transliteration: 'hōste', translation: 'so that' },
  { original: 'τὸν', strongs: 'G3588', transliteration: 'ton', translation: 'the' },
  { original: 'Υἱὸν', strongs: 'G5207', transliteration: 'Huion', translation: 'Son' },
  { original: 'τὸν', strongs: 'G3588', transliteration: 'ton', translation: 'the' },
  { original: 'μονογενῆ', strongs: 'G3439', transliteration: 'monogenē', translation: 'only begotten' },
  { original: 'ἔδωκεν', strongs: 'G1325', transliteration: 'edōken', translation: 'He gave' },
];

function getDemoResources() {
  return {
    commentaries: [
      {
        author: 'Matthew Henry',
        title: 'Matthew Henry\'s Concise Commentary',
        text: 'This passage reveals the profound nature of God\'s interaction with humanity. The principles laid down here serve as a foundation for understanding the broader narrative of redemption and the call to faithful living.',
      },
      {
        author: 'C.H. Spurgeon',
        title: 'Treasury of David',
        text: 'What a wealth of comfort is contained in these words! The believer may draw near with boldness, knowing that the promises of God are yea and amen in Christ Jesus.',
      },
    ],
    crossRefs: [
      { ref: 'Psalm 119:105', text: 'Your word is a lamp to my feet and a light to my path.' },
      { ref: 'John 1:1', text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
      { ref: '2 Timothy 3:16', text: 'All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness.' },
      { ref: 'Isaiah 55:11', text: 'So shall my word be that goes out from my mouth; it shall not return to me empty.' },
    ],
    wordStudies: [
      { word: 'Λόγος (Logos)', transliteration: 'Logos', meaning: 'A foundational Greek term denoting "word," "reason," or "divine expression." In Scripture it carries the weight of divine revelation and creative power.' },
      { word: 'Διαθήκη (Diatheke)', transliteration: 'Diatheke', meaning: 'Greek for "covenant" or "testament." Signifies a solemn divine agreement established by God with His people, central to redemptive history.' },
      { word: 'Ἀλήθεια (Aletheia)', transliteration: 'Aletheia', meaning: 'Greek for "truth." In biblical usage, not merely factual accuracy but the reality of God\'s self-revelation and faithfulness to His promises.' },
    ],
    topics: [
      { name: 'God\'s Faithfulness' },
      { name: 'Divine Revelation' },
      { name: 'Covenant Relationship' },
      { name: 'Scripture Authority' },
      { name: 'Redemption' },
    ],
  };
}

// ── Card component ────────────────────────────────────────────────────────

function Card({
  children,
  colors,
  accentColor,
  noPadding,
  style,
}: {
  children: React.ReactNode;
  colors: any;
  accentColor?: string;
  noPadding?: boolean;
  style?: object;
}) {
  return (
    <View
      style={[
        sectionStyles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : undefined,
        style,
      ]}
    >
      <View style={noPadding ? undefined : { padding: SPACING.md }}>
        {children}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
});

// ── Props ──────────────────────────────────────────────────────────────────

export interface VerseResourceSheetProps {
  visible: boolean;
  onClose: () => void;
  bookName: string;
  chapter: number;
  verseNumber: number;
  verseText: string;
  isDark: boolean;
}

// ── Sub-views ──────────────────────────────────────────────────────────────

function TranslationView({ colors }: { colors: any }) {
  return (
    <>
      <View style={s.sectionHeader}>
        <View style={[s.sectionHeaderAccent, { backgroundColor: '#3B82F6' }]} />
        <Languages size={16} color="#3B82F6" strokeWidth={2} />
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          Translation Comparison
        </Text>
      </View>
      {DEMO_TRANSLATIONS.map((t, i) => (
        <Card key={`trans-${i}`} colors={colors} accentColor="#3B82F6">
          <View style={s.transBadgeRow}>
            <View style={[s.transBadge, { backgroundColor: '#3B82F618' }]}>
              <Text style={[s.transBadgeText, { color: '#3B82F6' }]}>
                {t.abbreviation}
              </Text>
            </View>
            <Text style={[s.transVersion, { color: colors.muted }]} numberOfLines={1}>
              {t.version}
            </Text>
          </View>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <Text style={[s.transText, { color: colors.text }]}>
            {t.text}
          </Text>
        </Card>
      ))}
    </>
  );
}

function DictionaryView({ colors }: { colors: any }) {
  return (
    <>
      <View style={s.sectionHeader}>
        <View style={[s.sectionHeaderAccent, { backgroundColor: '#10B981' }]} />
        <Book size={16} color="#10B981" strokeWidth={2} />
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          Bible Dictionary
        </Text>
      </View>
      {DEMO_DICTIONARY.map((entry, i) => (
        <Card key={`dict-${i}`} colors={colors} accentColor="#10B981">
          <Text style={[s.dictTerm, { color: colors.text }]}>
            {entry.term}
          </Text>
          <Text style={[s.dictPron, { color: colors.muted }]}>
            /{entry.pronunciation}/
          </Text>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <Text style={[s.dictDef, { color: '#10B981' }]}>
            {entry.definition}
          </Text>
          <Text style={[s.dictDesc, { color: colors.text }]}>
            {entry.description}
          </Text>
        </Card>
      ))}
    </>
  );
}

function InterlinearView({ colors }: { colors: any }) {
  return (
    <>
      <View style={s.sectionHeader}>
        <View style={[s.sectionHeaderAccent, { backgroundColor: '#F59E0B' }]} />
        <FileText size={16} color="#F59E0B" strokeWidth={2} />
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          Interlinear
        </Text>
      </View>
      <Card colors={colors}>
        <View style={s.interTableHead}>
          <Text style={[s.interColHeadOriginal, { color: '#F59E0B' }]}>
            Greek
          </Text>
          <Text style={[s.interColHead, { color: colors.muted }]}>
            Strong&apos;s
          </Text>
          <Text style={[s.interColHead, { color: colors.muted }]}>
            Translit.
          </Text>
          <Text style={[s.interColHeadTrans, { color: colors.muted }]}>
            English
          </Text>
        </View>
        {DEMO_INTERLINEAR.map((w, i) => (
          <View
            key={`il-${i}`}
            style={[
              s.interRow,
              { backgroundColor: i % 2 === 0 ? 'transparent' : `${colors.border}40` },
            ]}
          >
            <Text style={[s.interColOriginal, { color: colors.text }]}>
              {w.original}
            </Text>
            <Text style={[s.interCol, { color: colors.muted }]}>
              {w.strongs}
            </Text>
            <Text style={[s.interCol, { color: colors.muted, fontStyle: 'italic' }]}>
              {w.transliteration}
            </Text>
            <Text style={[s.interColTrans, { color: colors.text }]}>
              {w.translation}
            </Text>
          </View>
        ))}
      </Card>
    </>
  );
}

// ── Action card for main view ──────────────────────────────────────────────

function ResourceActionCard({
  icon,
  label,
  description,
  accentColor,
  onPress,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  accentColor: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        s.actionCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        { borderLeftWidth: 3, borderLeftColor: accentColor },
      ]}
    >
      <View style={[s.actionIconWrap, { backgroundColor: `${accentColor}18` }]}>
        {icon}
      </View>
      <View style={s.actionTextCol}>
        <Text style={[s.actionLabel, { color: colors.text }]}>
          {label}
        </Text>
        <Text style={[s.actionDesc, { color: colors.muted }]} numberOfLines={2}>
          {description}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.muted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  color,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionHeaderAccent, { backgroundColor: color }]} />
      {icon}
      <Text style={[s.sectionTitle, { color: colors.text }]}>
        {label}
      </Text>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function VerseResourceSheet({
  visible,
  onClose,
  bookName,
  chapter,
  verseNumber,
  verseText,
  isDark,
}: VerseResourceSheetProps) {
  const COLORS = getColors(isDark);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const sheetWidth = useMemo(
    () => Math.min(windowWidth * 0.8, 360),
    [windowWidth],
  );

  const [mounted, setMounted] = useState(visible);
  const [view, setView] = useState<ResourceView>('main');
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progressAnim.stopAnimation();

    if (visible) {
      setMounted(true);
      setView('main');
      Animated.spring(progressAnim, {
        toValue: 1,
        speed: 20,
        bounciness: 4,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [progressAnim, visible]);

  const translateX = useMemo(
    () =>
      progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [sheetWidth, 0],
      }),
    [sheetWidth, progressAnim],
  );
  const backdropOpacity = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const verseRef = `${bookName} ${chapter}:${verseNumber}`;
  const resources = getDemoResources();

  const isSubView = view !== 'main';

  const viewConfig = isSubView
    ? view === 'translation'
      ? { title: 'Translation Comparison', icon: <Languages size={16} color="#3B82F6" strokeWidth={2} /> }
      : view === 'dictionary'
        ? { title: 'Bible Dictionary', icon: <Book size={16} color="#10B981" strokeWidth={2} /> }
        : { title: 'Interlinear', icon: <FileText size={16} color="#F59E0B" strokeWidth={2} /> }
    : { title: 'Verse Resources', icon: <Sparkles size={16} color={COLORS.primary} strokeWidth={2} /> };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          s.backdrop,
          { opacity: backdropOpacity, backgroundColor: COLORS.overlay ?? 'rgba(0,0,0,0.5)' },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Right-side sheet */}
      <Animated.View
        style={[
          s.sheet,
          {
            width: sheetWidth,
            backgroundColor: COLORS.cardBackground,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* ── Top accent bar ──────────────────────────────────────────── */}
        <View style={[s.topAccent, { backgroundColor: COLORS.primary }]} />

        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={[s.header, { borderBottomColor: COLORS.border, paddingTop: insets.top + SPACING.md }]}>
          {isSubView && (
            <TouchableOpacity
              onPress={() => setView('main')}
              style={[s.backBtn, { backgroundColor: COLORS.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeft size={18} color={COLORS.text} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <View style={s.headerTextCol}>
            <Text style={[s.headerTitle, { color: COLORS.text }]}>
              {viewConfig.title}
            </Text>
            <Text style={[s.headerRef, { color: COLORS.primary }]}>
              {verseRef}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[s.closeBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={COLORS.muted} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* ── Scrollable content ───────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
        >
          {isSubView ? (
            <>
              {view === 'translation' && <TranslationView colors={COLORS} />}
              {view === 'dictionary' && <DictionaryView colors={COLORS} />}
              {view === 'interlinear' && <InterlinearView colors={COLORS} />}
            </>
          ) : (
            <>
              {/* ── Verse Text ────────────────────────────────────────── */}
              <View style={s.verseBlock}>
                <View style={[s.verseTextCard, { backgroundColor: `${COLORS.primary}08`, borderColor: `${COLORS.primary}25` }]}>
                  <View style={s.verseLabelRow}>
                    <Sparkles size={12} color={COLORS.primary} strokeWidth={2.5} />
                    <Text style={[s.verseLabel, { color: COLORS.primary }]}>
                      {verseRef}
                    </Text>
                  </View>
                  <Text style={[s.verseText, { color: COLORS.text }]}>
                    <Text style={{ fontWeight: '700' }}>{verseNumber}. </Text>
                    {verseText}
                  </Text>
                </View>

                {/* Mini translation comparison cards */}
                <View style={s.transMinGrid}>
                  {DEMO_TRANSLATIONS.slice(0, 3).map((t, i) => {
                    const accentColor = i === 0 ? '#3B82F6' : i === 1 ? '#8B5CF6' : '#10B981';
                    return (
                      <View
                        key={`tmin-${i}`}
                        style={[s.transMinCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderLeftColor: accentColor, borderLeftWidth: 3 }]}
                      >
                        <Text style={[s.transMinBadge, { color: accentColor }]}>
                          {t.abbreviation}
                        </Text>
                        <Text style={[s.transMinText, { color: COLORS.muted }]} numberOfLines={3}>
                          {t.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <TouchableOpacity
                  onPress={() => setView('translation')}
                  style={[s.transMoreBtn, { backgroundColor: `${COLORS.primary}0A`, borderColor: COLORS.border }]}
                  activeOpacity={0.7}
                >
                  <Languages size={14} color={COLORS.primary} strokeWidth={2} />
                  <Text style={[s.transMoreText, { color: COLORS.primary }]}>
                    See all {DEMO_TRANSLATIONS.length} translations
                  </Text>
                  <ChevronRight size={14} color={COLORS.primary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* ── Quick Action Cards ──────────────────────────────────── */}
              <View style={s.quickActionsSection}>
                <ResourceActionCard
                  icon={<Languages size={20} color="#3B82F6" strokeWidth={2} />}
                  label="Translation Comparison"
                  description="Compare across NIV, KJV, ESV, NLT, NASB and more."
                  accentColor="#3B82F6"
                  onPress={() => setView('translation')}
                  colors={COLORS}
                />
                <ResourceActionCard
                  icon={<Book size={20} color="#10B981" strokeWidth={2} />}
                  label="Bible Dictionary"
                  description="Study key theological terms like Atonement, Covenant, Righteousness."
                  accentColor="#10B981"
                  onPress={() => setView('dictionary')}
                  colors={COLORS}
                />
                <ResourceActionCard
                  icon={<FileText size={20} color="#F59E0B" strokeWidth={2} />}
                  label="Interlinear"
                  description="Explore the original Greek text with Strong's numbers."
                  accentColor="#F59E0B"
                  onPress={() => setView('interlinear')}
                  colors={COLORS}
                />
              </View>

              {/* ── Commentaries ────────────────────────────────────────── */}
              <SectionHeader
                icon={<BookOpen size={16} color={COLORS.primary} strokeWidth={2} />}
                label="Commentaries"
                color={COLORS.primary}
                colors={COLORS}
              />

              {resources.commentaries.map((entry, i) => (
                <Card key={`comm-${i}`} colors={COLORS} accentColor={COLORS.primary}>
                  <Text style={[s.commAuthor, { color: COLORS.primary }]}>
                    {entry.author}
                  </Text>
                  <Text style={[s.commSource, { color: COLORS.muted }]}>
                    {entry.title}
                  </Text>
                  <View style={[s.divider, { backgroundColor: COLORS.border }]} />
                  <Text style={[s.commText, { color: COLORS.text }]}>
                    {entry.text}
                  </Text>
                </Card>
              ))}

              {/* ── Cross References ────────────────────────────────────── */}
              <SectionHeader
                icon={<Crosshair size={16} color={COLORS.primary} strokeWidth={2} />}
                label="Cross References"
                color={COLORS.primary}
                colors={COLORS}
              />

              <Card colors={COLORS}>
                {resources.crossRefs.map((ref, i) => (
                  <TouchableOpacity
                    key={`cr-${i}`}
                    style={[
                      s.crossRefRow,
                      i < resources.crossRefs.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={s.crossRefContent}>
                      <Text style={[s.crossRefRef, { color: COLORS.primary }]}>
                        {ref.ref}
                      </Text>
                      <Text style={[s.crossRefText, { color: COLORS.muted }]} numberOfLines={2}>
                        {ref.text}
                      </Text>
                    </View>
                    <ChevronRight size={14} color={COLORS.muted} strokeWidth={2} />
                  </TouchableOpacity>
                ))}
              </Card>

              {/* ── Word Studies ────────────────────────────────────────── */}
              <SectionHeader
                icon={<Hash size={16} color={COLORS.primary} strokeWidth={2} />}
                label="Word Studies"
                color={COLORS.primary}
                colors={COLORS}
              />

              {resources.wordStudies.map((ws, i) => (
                <Card key={`ws-${i}`} colors={COLORS} accentColor={COLORS.primary}>
                  <View style={s.wsHeader}>
                    <Text style={[s.wsWord, { color: COLORS.text }]}>
                      {ws.word}
                    </Text>
                    <Text style={[s.wsTranslit, { color: COLORS.muted }]}>
                      ({ws.transliteration})
                    </Text>
                  </View>
                  <Text style={[s.wsMeaning, { color: COLORS.text }]}>
                    {ws.meaning}
                  </Text>
                </Card>
              ))}

              {/* ── Related Topics ───────────────────────────────────────── */}
              <SectionHeader
                icon={<Tags size={16} color={COLORS.primary} strokeWidth={2} />}
                label="Related Topics"
                color={COLORS.primary}
                colors={COLORS}
              />

              <View style={s.topicRow}>
                {resources.topics.map((t, i) => (
                  <View
                    key={`topic-${i}`}
                    style={[s.topicPill, { backgroundColor: `${COLORS.primary}10`, borderColor: `${COLORS.primary}25` }]}
                  >
                    <Text style={[s.topicText, { color: COLORS.primary }]}>
                      {t.name}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ height: insets.bottom + SPACING.xl }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: 'hidden',
  },
  topAccent: {
    height: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  headerRef: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  // ── Verse block ──────────────────────────────────────────────────────
  verseBlock: {
    marginBottom: SPACING.sm,
  },
  verseTextCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  verseLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  verseLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  verseText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
    letterSpacing: 0.2,
  },

  // ── Mini translation grid ────────────────────────────────────────────
  transMinGrid: {
    gap: 6,
    marginTop: SPACING.sm,
  },
  transMinCard: {
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    padding: SPACING.sm,
  },
  transMinBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  transMinText: {
    fontSize: 11,
    lineHeight: 16,
  },
  transMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  transMoreText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },

  // ── Quick action cards ──────────────────────────────────────────────
  quickActionsSection: {
    marginBottom: SPACING.xs,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },

  // ── Section headers ──────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionHeaderAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Commentary ───────────────────────────────────────────────────────
  commAuthor: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  commSource: {
    fontSize: 11,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  commText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 21,
  },

  // ── Cross reference ──────────────────────────────────────────────────
  crossRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
  },
  crossRefContent: {
    flex: 1,
    marginRight: 8,
  },
  crossRefRef: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  crossRefText: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },

  // ── Word study ───────────────────────────────────────────────────────
  wsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  wsWord: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  wsTranslit: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  wsMeaning: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 21,
  },

  // ── Related topics ───────────────────────────────────────────────────
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  topicText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },

  // ── Translation comparison view ───────────────────────────────────────
  transBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  transBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  transBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  transVersion: {
    fontSize: FONT_SIZES.xs,
    flex: 1,
  },
  transText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 21,
  },

  // ── Dictionary view ──────────────────────────────────────────────────
  dictTerm: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  dictPron: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    marginTop: 1,
  },
  dictDef: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  dictDesc: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 21,
  },

  // ── Interlinear view ─────────────────────────────────────────────────
  interTableHead: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  interRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
  },
  interColHeadOriginal: {
    flex: 1.1,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  interColHead: {
    flex: 0.8,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  interColHeadTrans: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  interColOriginal: {
    flex: 1.1,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
  interCol: {
    flex: 0.8,
    fontSize: 10,
    lineHeight: 16,
  },
  interColTrans: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
});
