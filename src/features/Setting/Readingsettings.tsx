import React, {
  useCallback,
  useContext,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { ChevronRight, Volume2, Minus, Plus, Moon, Sun, Type, Palette } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppContext } from '../../common/AppContext';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import {
  BORDER_RADIUS,
  getColors,
  FONT_SIZES,
  SPACING,
} from '../../constants/theme';
import { route } from '../../component/navigations/routes';
import ActionHeader from '../../reusable/ActionHeader';

const FONT_PRESETS = [12, 14, 16, 18, 20, 24, 28];

export default function ReadingSettingsScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation<any>();
  const params = (useRoute<any>().params ?? {}) as {
    fontSize?: number;
    onFontSizeChange?: (size: number) => void;
  };

  if (!app) return null;
  const { isDark, toggleTheme, bibleVersionId, setBibleVersion } = app;
  const COLORS = getColors(isDark);
  const { translations: translation, language } = useLanguage();
  const isRtl = isRtlLanguage(language);

  const [fontSize, setFontSizeLocal] = useState<number>(params.fontSize ?? 16);
  const handleFontChange = useCallback(
    (size: number) => {
      setFontSizeLocal(size);
      params.onFontSizeChange?.(size);
    },
    [params.onFontSizeChange],
  );

  const surface = COLORS.cardBackground;
  const border = COLORS.border;

  return (
    <View style={[s.root, { backgroundColor: COLORS.background }]}>
      <ActionHeader
        title={translation?.readingSettings?.title || 'Reading Settings'}
        onPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader
          icon={<Type size={15} color={COLORS.primary} strokeWidth={2} />}
          label={translation?.readingSettings?.textSize || 'Text Size'}
          COLORS={COLORS}
          isRtl={isRtl}
        />

        <View
          style={[
            s.fontCard,
            isRtl && s.fontCardRtl,
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          <TouchableOpacity
            style={[s.fontBtn, { borderRightColor: border }]}
            onPress={() => handleFontChange(Math.max(12, fontSize - 2))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Minus size={18} color={COLORS.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={s.fontCenter}>
            <Text style={[s.fontValue, { color: COLORS.primary }]}>{fontSize}</Text>
            <Text style={[s.fontUnit, { color: COLORS.muted }]}>pt</Text>
          </View>

          <TouchableOpacity
            style={[s.fontBtn, { borderLeftColor: border }]}
            onPress={() => handleFontChange(Math.min(28, fontSize + 2))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={18} color={COLORS.text} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={s.sizeScale}>
          {FONT_PRESETS.map(sz => {
            const active = fontSize === sz;
            return (
              <TouchableOpacity
                key={sz}
                onPress={() => handleFontChange(sz)}
                style={[
                  s.scaleDot,
                  {
                    backgroundColor: active ? COLORS.primary : `${COLORS.muted}22`,
                    borderColor: active ? COLORS.primary : 'transparent',
                  },
                ]}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Text style={[s.scaleLabel, { color: active ? '#fff' : COLORS.muted }]}>
                  {sz}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[
            s.previewCard,
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          <Text style={[s.previewHint, { color: COLORS.muted }]}>
            {translation?.readingSettings?.previewLabel || 'PREVIEW'}
          </Text>
          <Text
            style={{
              color: COLORS.text,
              fontSize,
              lineHeight: fontSize * 1.7,
              fontStyle: 'italic',
            }}
            numberOfLines={4}
          >
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{'"'}</Text>
            For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{'"'}</Text>
          </Text>
          <Text style={[s.previewRef, isRtl && s.previewRefRtl, { color: COLORS.muted }]}>
            {translation?.readingSettings?.preview?.ref || '— John 3:16'}
          </Text>
        </View>

        <SectionHeader
          icon={<Volume2 size={15} color="#10B981" strokeWidth={2} />}
          label={translation?.readingSettings?.readingVoice || 'Reading Voice'}
          COLORS={COLORS}
          isRtl={isRtl}
          style={{ marginTop: SPACING.xl }}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate(route.voiceSettings)}
          activeOpacity={0.7}
          style={[s.linkRow, isRtl && s.linkRowRtl, { backgroundColor: surface, borderColor: border }]}
        >
          <View style={[s.linkIcon, { backgroundColor: '#10B98118' }]}>
            <Volume2 size={18} color="#10B981" strokeWidth={2} />
          </View>
          <View style={s.linkInfo}>
            <Text style={[s.linkLabel, { color: COLORS.text }]}>
              {translation?.readingSettings?.voiceSettings?.label || 'Voice Settings'}
            </Text>
            <Text style={[s.linkSub, { color: COLORS.muted }]}>
              {translation?.readingSettings?.voiceSettings?.subtitle || 'Speed, pitch, narrator voice'}
            </Text>
          </View>
          {isRtl ? (
            <ChevronRight size={16} color={COLORS.muted} strokeWidth={2} style={{ transform: [{ scaleX: -1 }] }} />
          ) : (
            <ChevronRight size={16} color={COLORS.muted} strokeWidth={2} />
          )}
        </TouchableOpacity>

        <SectionHeader
          icon={<Palette size={15} color={COLORS.accent} strokeWidth={2} />}
          label={translation?.readingSettings?.appearance?.label || 'Appearance'}
          COLORS={COLORS}
          isRtl={isRtl}
          style={{ marginTop: SPACING.xl }}
        />

        <View
          style={[s.linkRow, isRtl && s.linkRowRtl, { backgroundColor: surface, borderColor: border }]}
        >
          <View style={[s.linkIcon, { backgroundColor: `${COLORS.accent}18` }]}>
            {isDark ? (
              <Moon size={18} color={COLORS.accent} strokeWidth={2} />
            ) : (
              <Sun size={18} color={COLORS.accent} strokeWidth={2} />
            )}
          </View>
          <View style={s.linkInfo}>
            <Text style={[s.linkLabel, { color: COLORS.text }]}>
              {isDark
                ? (translation?.readingSettings?.appearance?.lightMode || 'Light Mode')
                : (translation?.readingSettings?.appearance?.darkMode || 'Dark Mode')}
            </Text>
            <Text style={[s.linkSub, { color: COLORS.muted }]}>
              {isDark
                ? (translation?.readingSettings?.appearance?.lightDesc || 'Switch to a brighter theme')
                : (translation?.readingSettings?.appearance?.darkDesc || 'Switch to a darker theme')}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: border, true: COLORS.primary }}
            thumbColor={COLORS.white}
            ios_backgroundColor={border}
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  icon,
  label,
  COLORS,
  style,
  isRtl,
}: {
  icon: React.ReactNode;
  label: string;
  COLORS: any;
  style?: any;
  isRtl?: boolean;
}) {
  return (
    <View style={[sh.row, isRtl && sh.rowRtl, style]}>
      <View style={[sh.iconWrap, { backgroundColor: `${COLORS.primary}12` }]}>
        {icon}
      </View>
      <Text style={[sh.label, { color: COLORS.muted }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },

  fontCard: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    height: 56,
    marginBottom: SPACING.sm,
  },
  fontCardRtl: { flexDirection: 'row-reverse' },
  fontBtn: {
    width: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderLeftWidth: 1,
  },
  fontCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 4,
  },
  fontValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  fontUnit: { fontSize: 13, fontWeight: '500', marginBottom: 3 },

  sizeScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  scaleDot: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    minWidth: 32,
    alignItems: 'center',
  },
  scaleLabel: { fontSize: 11, fontWeight: '700' },

  previewCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  previewHint: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  previewRef: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: SPACING.sm,
    textAlign: 'right',
  },
  previewRefRtl: { textAlign: 'left' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    marginBottom: 8,
  },
  linkRowRtl: { flexDirection: 'row-reverse' },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: { flex: 1 },
  linkLabel: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  linkSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
});
