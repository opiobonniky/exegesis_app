import React, { useContext } from 'react';
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { History } from 'lucide-react-native';
import { AppContext } from '../../../common/AppContext';
import { getColors, SPACING } from '../../../constants/theme';
import exegesisLogo from '../../../assets/logos/exegesis_bg_rm.png';
import { useLanguage, isRtlLanguage } from '../../../component/language-translation/LanguageProvider';

interface DictionaryHeaderProps {
  onHistoryPress?: () => void;
}

/**
 * Header matching the dictionary design: logo lockup on the left, the
 * "Exegesis Project" title + Berean tagline beside it, and a circular
 * history button on the far right.
 */
export default function DictionaryHeader({
  onHistoryPress,
}: DictionaryHeaderProps) {
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const rtl = isRtlLanguage(language);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: COLORS.background, paddingTop: insets.top + 6 },
      ]}
    >
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <View style={[styles.row, rtl && styles.rowRtl]}>
        {/* ── Logo lockup ── */}
        <View style={[styles.logoWrap, rtl && styles.logoWrapRtl]}>
          <Image
            source={exegesisLogo}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* ── Title + tagline ── */}
        <View style={[styles.titleBlock, rtl && styles.titleBlockRtl]}>
          <Text
            style={[styles.title, { color: isDark ? '#FFFFFF' : '#1e3a8a' }]}
            numberOfLines={1}
          >
            Exegesis Project
          </Text>
          <Text
            style={[
              styles.tagline,
              { color: isDark ? 'rgba(255,255,255,0.55)' : '#4B5563' },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            Be like a Berean, and study the scriptures daily.{' '}
            <Text
              style={[
                styles.ref,
                { color: isDark ? '#93C5FD' : '#2563EB' },
              ]}
            >
              Acts 17:11
            </Text>
          </Text>
        </View>

        {/* ── History button ── */}
        {onHistoryPress && (
          <TouchableOpacity
            onPress={onHistoryPress}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.historyBtn,
              {
                borderColor: COLORS.border,
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.06)'
                  : COLORS.surface,
              },
            ]}
          >
            <History
              size={19}
              color={isDark ? '#93C5FD' : '#2563EB'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoWrapRtl: {
    flexDirection: 'row-reverse',
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 10,
  },
  logoTextBlock: {
    justifyContent: 'center',
  },
  logoWord: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  logoSub: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlockRtl: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 14,
  },
  ref: {
    fontWeight: '800',
  },
  historyBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
