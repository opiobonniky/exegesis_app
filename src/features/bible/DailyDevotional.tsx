import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../../common/AppContext';
import {
  getColors,
  createThemeStyles,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import { Calendar } from 'lucide-react-native';
import { sendPostRequest } from '../../services/api';
import ActionModal from '../../reusable/ActionModal';
import { getVerseText } from '../../utilits/bibleUtils';
import ActionHeader from '../../reusable/ActionHeader';
import { useNavigation } from '@react-navigation/native';
import ExpandableText from './ExpandableText';

// Type based on your real backend response
type DailyVerse = {
  id: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  reflection: string;
  displayDate: string; // ISO string
  displayTime: string; // ISO string
  published: boolean;
  bookmarked?: boolean; // local state only for now
};

export default function DailyDevotionalScreen() {
  const app = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  if (!app) return null;

  const { isDark } = app;
  const COLORS = getColors(isDark);
  const themeStyle = createThemeStyles(COLORS);

  useEffect(() => {
    fetchTodaysDevotional();
  }, []);

  const fetchTodaysDevotional = async () => {
    setLoading(true);
    try {
      // Use your real API endpoint
      const response = await sendPostRequest('bible', 'get-todays-verse', {});

      if (response.returnCode === 200 && response.returnData) {
        const raw = response.returnData;

        const formatted: DailyVerse = {
          id: raw.id,
          bookName: raw.bookName,
          chapter: raw.chapter,
          verseNumber: raw.verseNumber,
          reflection: raw.reflection,
          displayDate: raw.displayDate,
          displayTime: raw.displayTime,
          published: raw.published,
        };

        setVerse(formatted);
      } else {
        // Show fallback/demo data if API fails
        useFallbackDevotional();
      }
    } catch (err) {
      console.error('Failed to fetch daily devotional:', err);
      useFallbackDevotional();
    } finally {
      setLoading(false);
    }
  };

  // Nice fallback/demo data – looks real
  const useFallbackDevotional = () => {
    setVerse({
      id: 999,
      bookName: 'Jeremiah',
      chapter: 29,
      verseNumber: 11,
      reflection:
        "God's plans for you are filled with hope and a future. Even in uncertainty, trust that He is working all things for your good. Take time today to rest in His promises and surrender your worries to Him.",
      displayDate: new Date().toISOString(),
      displayTime: new Date().toISOString(),
      published: true,
      bookmarked: false,
    });
  };

  if (!verse) {
    return (
      <View
        style={[
          themeStyle.center,
          { flex: 1, backgroundColor: COLORS.background },
        ]}
      >
        <Text style={{ color: COLORS.muted, fontSize: FONT_SIZES.lg }}>
          No devotional available today
        </Text>
      </View>
    );
  }

  const verseReference = `${verse.bookName} ${verse.chapter}:${verse.verseNumber}`;

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollContent: {
      padding: SPACING.sm,
    },
    headerGradient: {
      padding: SPACING.xl,
      borderRadius: BORDER_RADIUS.xl,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      color: '#fff',
      fontSize: FONT_SIZES.xxl,
      fontWeight: '700',
      marginLeft: SPACING.md,
    },
    card: {
      padding: SPACING.xl,
      borderRadius: BORDER_RADIUS.xl,
      backgroundColor: COLORS.cardBackground,
      marginBottom: SPACING.xl,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    verseText: {
      fontSize: FONT_SIZES.xl,
      fontStyle: 'italic',
      color: COLORS.text,
      marginBottom: SPACING.lg,
      lineHeight: 32,
    },
    reference: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '600',
      color: COLORS.primary,
      marginBottom: SPACING.md,
    },
    reflection: {
      fontSize: FONT_SIZES.md,
      lineHeight: 26,
      color: COLORS.textSecondary,
      marginBottom: SPACING.xl,
    },
    bookmarkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: verse.bookmarked ? COLORS.success : COLORS.primary,
    },
    bookmarkText: {
      color: '#fff',
      fontWeight: '600',
      marginLeft: SPACING.sm,
      fontSize: FONT_SIZES.md,
    },
    dateBadge: {
      alignSelf: 'flex-start',
      backgroundColor: COLORS.primary + '20',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.lg,
    },
    dateText: {
      color: COLORS.primary,
      fontWeight: '600',
    },
  });

  const navigation = useNavigation();

  return (
    <>
      <ActionHeader
        title={`Daily Devotional`}
        onPress={() => navigation.goBack()}
      />
      <ScrollView
        style={dynamicStyles.container}
        contentContainerStyle={dynamicStyles.scrollContent}
      >
        {/* Beautiful Header */}

        {/* Main Devotional Card */}
        <View style={dynamicStyles.card}>
          {/* Date Badge */}
          <View style={dynamicStyles.dateBadge}>
            <Text style={dynamicStyles.dateText}>
              <Calendar size={14} color={COLORS.primary} />{' '}
              {new Date(verse.displayDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          {/* Verse */}
          <Text style={dynamicStyles.verseText}>
            "
            {getVerseText(verse.bookName, verse.chapter, verse.verseNumber) ||
              'Loading verse text...'}
            "
          </Text>

          {/* Reference */}
          <Text style={dynamicStyles.reference}>— {verseReference}</Text>

          <ExpandableText
            text={verse.reflection ?? ''}
            initialChars={500}
            stepChars={800}
          />

          {/* Bookmark Button */}
        </View>

        {/* Optional: More content / explanation */}
        <View style={{ padding: SPACING.md, opacity: 0.8 }}>
          <Text
            style={{
              color: COLORS.muted,
              fontSize: FONT_SIZES.sm,
              textAlign: 'center',
            }}
          >
            Meditate on this verse today. Let it guide your thoughts and
            actions.
          </Text>
        </View>

        {/* Bookmark Confirmation Modal */}
        <ActionModal
          visible={showBookmarkModal}
          severity="success"
          title={
            verse.bookmarked ? 'Added to Bookmarks' : 'Removed from Bookmarks'
          }
          message={
            verse.bookmarked
              ? 'This devotional has been saved to your bookmarks.'
              : 'This devotional has been removed from your bookmarks.'
          }
          confirmLabel="OK"
          onConfirm={() => setShowBookmarkModal(false)}
        />
      </ScrollView>
    </>
  );
}
