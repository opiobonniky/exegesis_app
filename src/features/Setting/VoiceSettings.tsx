import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import Slider from '@react-native-community/slider';
import LinearGradient from 'react-native-linear-gradient';
import {
  Volume2,
  Mic2,
  CheckCircle,
  ChevronDown,
  X,
  Play,
  Square,
  ChevronRight,
  Waves,
  Gauge,
  Music2,
  RotateCcw,
} from 'lucide-react-native';

import { AppContext } from '../../common/AppContext';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import {
  BORDER_RADIUS,
  getColors,
  FONT_SIZES,
  SPACING,
} from '../../constants/theme';
import ActionHeader from '../../reusable/ActionHeader';
import { bibleTTS, DeviceVoice } from '../../utilits/bibleTTS';
import { ttsService, TTSVoice } from '../../services/ttsService';
import { showToast } from '../../helpers/Toash.helper';
import { useNavigation } from '@react-navigation/native';

const PREVIEW_TEXT =
  'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.';

const RATE_SNAPS = [
  { key: 'slow', value: 0.35 },
  { key: 'calm', value: 0.5 },
  { key: 'normal', value: 0.65 },
  { key: 'quick', value: 0.8 },
  { key: 'fast', value: 1.0 },
];

const PITCH_SNAPS = [
  { key: 'low', value: 0.85 },
  { key: 'natural', value: 1.0 },
  { key: 'high', value: 1.15 },
];

const FALLBACK_RATE_LABELS: Record<string, string> = {
  slow: 'Slow',
  calm: 'Calm',
  normal: 'Normal',
  quick: 'Quick',
  fast: 'Fast',
};

const FALLBACK_PITCH_LABELS: Record<string, string> = {
  low: 'Low',
  natural: 'Natural',
  high: 'High',
};

export default function VoiceSettingsScreen() {
  const app = useContext(AppContext);
  const { translations: translation, language } = useLanguage();
  const isRtl = isRtlLanguage(language);
  if (!app) return null;
  const { isDark } = app;
  const COLORS = getColors(isDark);
  const navigation = useNavigation();

  const [isPlaying, setIsPlaying] = useState(() => bibleTTS.getState().isPlaying);
  const [isPaused, setIsPaused] = useState(() => bibleTTS.getState().isPaused);
  const isPlayingRef = useRef(isPlaying);

  const [deviceVoices, setDeviceVoices] = useState<DeviceVoice[]>([]);
  const [deviceVoiceId, setDeviceVoiceId] = useState<string>(
    bibleTTS.getCurrentVoiceId() ?? '',
  );
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [edgeVoices, setEdgeVoices] = useState<TTSVoice[]>([]);
  const [edgeVoiceId, setEdgeVoiceId] = useState<string>(
    bibleTTS.edgeVoiceId,
  );
  const [edgeEnabled, setEdgeEnabled] = useState<boolean>(bibleTTS.edgeEnabled);

  const [rate, setRateLocal] = useState<number | null>(
    bibleTTS.isRateCustomized() ? bibleTTS.getCurrentRate() : null,
  );
  const [pitch, setPitchLocal] = useState<number | null>(
    bibleTTS.isPitchCustomized() ? bibleTTS.getCurrentPitch() : null,
  );

  const rateDisplay = rate ?? 0.65;
  const pitchDisplay = pitch ?? 1.0;

  const previewActiveRef = useRef(false);

  const waveAnims = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0.3)),
  ).current;
  const waveLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const unsub = bibleTTS.subscribe(s => {
      setIsPlaying(s.isPlaying);
      setIsPaused(s.isPaused);
      isPlayingRef.current = s.isPlaying;
      if (!s.isPlaying && !s.isPaused) previewActiveRef.current = false;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const anims = waveAnims.map((a, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 75),
            Animated.timing(a, {
              toValue: 1,
              duration: 360 + i * 45,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(a, {
              toValue: 0.2,
              duration: 360 + i * 45,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ),
      );
      waveLoop.current = Animated.parallel(anims);
      waveLoop.current.start();
    } else {
      waveLoop.current?.stop();
      waveAnims.forEach(a =>
        Animated.timing(a, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }).start(),
      );
    }
    return () => {
      waveLoop.current?.stop();
    };
  }, [isPlaying]);

  useEffect(() => {
    (async () => {
      try {
        const voices = await ttsService.getVoices();
        setEdgeVoices(voices);
      } catch {
        setEdgeVoices([]);
      }

      setDeviceLoading(true);
      try {
        const voices = await bibleTTS.getDeviceVoices();
        setDeviceVoices(voices);
        if (!deviceVoiceId && voices[0]?.id) {
          setDeviceVoiceId(voices[0].id);
          await bibleTTS.setVoice(voices[0].id);
        }
      } catch {
        setDeviceVoices([]);
      } finally {
        setDeviceLoading(false);
      }
    })();
  }, []);

  const currentEdgeVoice = useMemo(
    () => edgeVoices.find(v => v.voiceId === edgeVoiceId),
    [edgeVoices, edgeVoiceId],
  );

  const currentDeviceVoice = useMemo(
    () => deviceVoices.find(v => v.id === deviceVoiceId),
    [deviceVoices, deviceVoiceId],
  );

  const isUsingEdge = edgeEnabled && !!currentEdgeVoice;

  const voiceLabel = useMemo(() => {
    if (deviceLoading) return translation?.voiceSettings?.loadingVoices || 'Loading voices…';
    if (isUsingEdge && currentEdgeVoice) {
      return currentEdgeVoice.name;
    }
    return (
      currentDeviceVoice?.name || deviceVoiceId || translation?.voiceSettings?.selectVoice || 'Select a voice'
    );
  }, [currentEdgeVoice, currentDeviceVoice, deviceVoiceId, deviceLoading, isUsingEdge, translation]);

  const voiceQuality = useMemo(() => {
    if (isUsingEdge && currentEdgeVoice) {
      return translation?.voiceSettings?.edgeNeuralLabel || 'Edge Neural';
    }
    if (!currentDeviceVoice) return null;
    return currentDeviceVoice.quality === 'neural'
      ? translation?.voiceSettings?.quality?.neural || 'Neural'
      : currentDeviceVoice.quality === 'enhanced'
        ? translation?.voiceSettings?.quality?.enhanced || 'Enhanced'
        : translation?.voiceSettings?.quality?.local || 'Local';
  }, [currentEdgeVoice, currentDeviceVoice, isUsingEdge, translation]);

  const nearestRateLabel = useMemo(() => {
    const nearest = RATE_SNAPS.reduce((a, b) =>
      Math.abs(a.value - rateDisplay) <= Math.abs(b.value - rateDisplay) ? a : b,
    );
    return (
      translation?.voiceSettings?.rateSnaps?.[nearest.key] || FALLBACK_RATE_LABELS[nearest.key]
    );
  }, [rateDisplay, translation]);

  const nearestPitchLabel = useMemo(() => {
    const nearest = PITCH_SNAPS.reduce((a, b) =>
      Math.abs(a.value - pitchDisplay) <= Math.abs(b.value - pitchDisplay) ? a : b,
    );
    return (
      translation?.voiceSettings?.pitchSnaps?.[nearest.key] || FALLBACK_PITCH_LABELS[nearest.key]
    );
  }, [pitchDisplay, translation]);

  const handleRateChange = (v: number) =>
    setRateLocal(Math.round(v * 100) / 100);

  const handleRateCommit = useCallback(async (v: number) => {
    const r = Math.round(v * 100) / 100;
    setRateLocal(r);
    await bibleTTS.setRate(r);
    if (previewActiveRef.current) await restartPreview();
  }, []);

  const handleRateReset = async () => {
    await bibleTTS.resetRate();
    setRateLocal(null);
    showToast('success', translation?.voiceSettings?.speedReset || 'Speed reset: Using device default speed.');
    if (previewActiveRef.current) await restartPreview();
  };

  const handlePitchChange = (v: number) =>
    setPitchLocal(Math.round(v * 100) / 100);

  const handlePitchCommit = useCallback(async (v: number) => {
    const p = Math.round(v * 100) / 100;
    setPitchLocal(p);
    await bibleTTS.setPitch(p);
    if (previewActiveRef.current) await restartPreview();
  }, []);

  const handlePitchReset = async () => {
    await bibleTTS.resetPitch();
    setPitchLocal(null);
    showToast('success', translation?.voiceSettings?.pitchReset || 'Pitch reset: Using device default pitch.');
    if (previewActiveRef.current) await restartPreview();
  };

  const applyEdgeVoice = async (id: string) => {
    setEdgeVoiceId(id);
    setEdgeEnabled(true);
    bibleTTS.setEdgeEnabled(true);
    await bibleTTS.setEdgeVoice(id);
    setPickerOpen(false);
    showToast('success', translation?.voiceSettings?.voiceUpdated || 'Voice updated');
    if (previewActiveRef.current) await restartPreview();
  };

  const applyDeviceVoice = async (id: string) => {
    setDeviceVoiceId(id);
    setEdgeEnabled(false);
    bibleTTS.setEdgeEnabled(false);
    await bibleTTS.setVoice(id);
    setPickerOpen(false);
    showToast('success', translation?.voiceSettings?.voiceUpdated || 'Voice updated');
    if (previewActiveRef.current) await restartPreview();
  };

  const toggleEdgeProvider = (enable: boolean) => {
    setEdgeEnabled(enable);
    bibleTTS.setEdgeEnabled(enable);
    if (enable && !edgeVoiceId && edgeVoices[0]) {
      setEdgeVoiceId(edgeVoices[0].voiceId);
      bibleTTS.setEdgeVoice(edgeVoices[0].voiceId);
    }
  };

  const restartPreview = async () => {
    await bibleTTS.stop();
    await bibleTTS.speakVerses([{ num: 16, text: PREVIEW_TEXT }], 'John', 3);
  };

  const handlePreview = async () => {
    const state = bibleTTS.getState();
    if (state.isPlaying || state.isPaused) {
      previewActiveRef.current = false;
      await bibleTTS.stop();
      return;
    }
    previewActiveRef.current = true;
    try {
      await bibleTTS.speakVerses([{ num: 16, text: PREVIEW_TEXT }], 'John', 3);
    } catch {
      previewActiveRef.current = false;
      showToast('error', translation?.voiceSettings?.previewFailed || 'Preview failed: Check TTS language packs.');
    }
  };

  const accent = COLORS.accent;
  const accentDim = isDark ? 'rgba(240, 180, 41, 0.12)' : 'rgba(232, 163, 23, 0.10)';
  const accentBorder = isDark ? 'rgba(240, 180, 41, 0.25)' : 'rgba(232, 163, 23, 0.20)';

  return (
    <View style={[styles.root, { backgroundColor: COLORS.background }]}>
      <ActionHeader
        title={translation?.voiceSettings?.title || 'Reading Voice'}
        onPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={
            isDark
              ? [COLORS.background, '#111827', COLORS.background]
              : ['#FEF7E6', '#FDF2D8', '#FEF7E6']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: accentBorder }]}
        >
          <View style={[styles.heroBubble, isRtl ? { left: -45 } : { right: -45 }, { borderColor: accentBorder }]} />
          <View style={[styles.heroInner, isRtl && { flexDirection: 'row-reverse' }]}>
            <View
              style={[
                styles.heroRing,
                { borderColor: accent, backgroundColor: accentDim },
              ]}
            >
              <Waves size={21} color={accent} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.heroTitle, { color: accent }]}>
                {translation?.voiceSettings?.title || 'Voice & Narration'}
              </Text>
              <Text
                style={[
                  styles.heroSub,
                  { color: COLORS.muted },
                ]}
              >
                {translation?.voiceSettings?.heroSubPrefix || 'Configure your reading voice. Sliders marked '}
                <Text style={{ color: accent, fontWeight: '700' }}>
                  {translation?.voiceSettings?.deviceDefaultBadge || 'Device default'}
                </Text>{' '}
                {translation?.voiceSettings?.heroSubSuffix || 'inherit your system TTS settings.'}
              </Text>
            </View>
          </View>
          <View style={styles.waveRow}>
            {waveAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    backgroundColor: isPlaying ? accent : COLORS.muted + '55',
                    height: 7 + (i % 3) * 5,
                    transform: [{ scaleY: anim }],
                  },
                ]}
              />
            ))}
          </View>
        </LinearGradient>

        {/* ── Narrator voice ──────────────────────────────────────────── */}
        <SectionLabel text={(translation?.voiceSettings?.narratorLabel || 'NARRATOR VOICE').toUpperCase()} isDark={isDark} isRtl={isRtl} />

        {edgeVoices.length > 0 && (
          <View
            style={[
              styles.providerRow,
              isRtl && { flexDirection: 'row-reverse' },
              { backgroundColor: COLORS.surface, borderColor: COLORS.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => toggleEdgeProvider(true)}
              activeOpacity={0.7}
              style={[
                styles.providerChip,
                edgeEnabled && styles.providerChipActive,
                {
                  backgroundColor: edgeEnabled ? accentDim : 'transparent',
                  borderColor: edgeEnabled ? accentBorder : COLORS.border,
                },
              ]}
            >
              <Waves size={14} color={edgeEnabled ? accent : COLORS.muted} />
              <Text
                style={[
                  styles.providerChipText,
                  { color: edgeEnabled ? accent : COLORS.muted },
                ]}
              >
                Edge Neural
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleEdgeProvider(false)}
              activeOpacity={0.7}
              style={[
                styles.providerChip,
                !edgeEnabled && styles.providerChipActive,
                {
                  backgroundColor: !edgeEnabled ? accentDim : 'transparent',
                  borderColor: !edgeEnabled ? accentBorder : COLORS.border,
                },
              ]}
            >
              <Mic2 size={14} color={!edgeEnabled ? accent : COLORS.muted} />
              <Text
                style={[
                  styles.providerChipText,
                  { color: !edgeEnabled ? accent : COLORS.muted },
                ]}
              >
                Device
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.75}
          style={[
            styles.voiceBtn,
            isRtl && { flexDirection: 'row-reverse' },
            { backgroundColor: COLORS.surface, borderColor: COLORS.border },
          ]}
        >
          <View
            style={[
              styles.voiceIcon,
              { backgroundColor: accentDim, borderColor: accentBorder },
            ]}
          >
            {isUsingEdge ? (
              <Waves size={18} color={accent} />
            ) : (
              <Mic2 size={18} color={accent} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.voiceName, { color: COLORS.text }]}
              numberOfLines={1}
            >
              {voiceLabel}
            </Text>
            {voiceQuality && (
              <Text style={[styles.voiceTagText, { color: accent }]}>
                {voiceQuality}{isUsingEdge ? '' : (' · ' + (currentDeviceVoice?.language ?? ''))}
              </Text>
            )}
          </View>
          {deviceLoading ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <ChevronDown size={17} color={accent} />
          )}
        </TouchableOpacity>

        {/* ── Preview ─────────────────────────────────────────────────── */}
        <SectionLabel text={(translation?.voiceSettings?.previewLabel || 'PREVIEW').toUpperCase()} isDark={isDark} isRtl={isRtl} />
        <View
          style={[
            styles.previewCard,
            isRtl && { flexDirection: 'row-reverse' },
            {
              backgroundColor: COLORS.surface,
              borderColor: isPlaying ? accent : COLORS.border,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewRef, { color: accent }]}>{translation?.voiceSettings?.previewRef || 'John 3:16'}</Text>
            <Text
              style={[
                styles.previewSnip,
                { color: COLORS.muted },
              ]}
              numberOfLines={2}
            >
              {PREVIEW_TEXT.slice(0, 70)}…
            </Text>
          </View>
          <TouchableOpacity
            onPress={handlePreview}
            activeOpacity={0.8}
            style={[
              styles.playBtn,
              isRtl && { flexDirection: 'row-reverse' },
              {
                backgroundColor: isPlaying ? COLORS.error + '15' : accent,
                borderColor: isPlaying ? COLORS.error + '45' : 'transparent',
              },
            ]}
          >
            {isPlaying ? (
              <Square size={14} color={COLORS.error} />
            ) : (
              <Play size={14} color={COLORS.white} />
            )}
            <Text
              style={[
                styles.playBtnTxt,
                { color: isPlaying ? COLORS.error : COLORS.white },
              ]}
            >
              {isPlaying ? (translation?.voiceSettings?.stop || 'Stop') : (translation?.voiceSettings?.play || 'Play')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Speech controls ──────────────────────────────────────────── */}
        <SectionLabel text={(translation?.voiceSettings?.speechControlsLabel || 'SPEECH CONTROLS').toUpperCase()} isDark={isDark} isRtl={isRtl} />
        <View
          style={[
            styles.controlCard,
            { backgroundColor: COLORS.surface, borderColor: COLORS.border },
          ]}
        >
          <SliderBlock
            icon={<Gauge size={15} color={accent} />}
            label={translation?.voiceSettings?.readingSpeed || 'Reading Speed'}
            snapLabel={nearestRateLabel}
            value={rateDisplay}
            isDeviceDefault={rate === null}
            min={0.35}
            max={1.0}
            snaps={RATE_SNAPS.map(s => ({ label: translation?.voiceSettings?.rateSnaps?.[s.key] || FALLBACK_RATE_LABELS[s.key], value: s.value }))}
            onValueChange={handleRateChange}
            onSlidingComplete={handleRateCommit}
            onReset={handleRateReset}
            trackColor={accent}
            isDark={isDark}
            COLORS={COLORS}
            deviceDefaultLabel={translation?.voiceSettings?.deviceDefaultBadge || 'Device default'}
            resetLabel={translation?.voiceSettings?.reset || 'Reset'}
            deviceHintLabel={translation?.voiceSettings?.deviceHint || 'Move the slider to override your device setting'}
            isRtl={isRtl}
          />

          <View style={[styles.divider, { backgroundColor: COLORS.border }]} />

          <SliderBlock
            icon={<Music2 size={15} color={COLORS.primary} />}
            label={translation?.voiceSettings?.voicePitch || 'Voice Pitch'}
            snapLabel={nearestPitchLabel}
            value={pitchDisplay}
            isDeviceDefault={pitch === null}
            min={0.85}
            max={1.15}
            snaps={PITCH_SNAPS.map(s => ({ label: translation?.voiceSettings?.pitchSnaps?.[s.key] || FALLBACK_PITCH_LABELS[s.key], value: s.value }))}
            onValueChange={handlePitchChange}
            onSlidingComplete={handlePitchCommit}
            onReset={handlePitchReset}
            trackColor={COLORS.primary}
            isDark={isDark}
            COLORS={COLORS}
            deviceDefaultLabel={translation?.voiceSettings?.deviceDefaultBadge || 'Device default'}
            resetLabel={translation?.voiceSettings?.reset || 'Reset'}
            deviceHintLabel={translation?.voiceSettings?.deviceHint || 'Move the slider to override your device setting'}
            isRtl={isRtl}
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Voice picker sheet ────────────────────────────────────────────── */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={[styles.sheetBg, { backgroundColor: COLORS.overlay }]}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: COLORS.cardBackground,
                borderColor: accentBorder,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: accent + '45' }]} />
            <View
              style={[
                styles.sheetHead,
                isRtl && { flexDirection: 'row-reverse' },
              ]}
            >
              <Text style={[styles.sheetTitle, { color: COLORS.text }]}>
                {translation?.voiceSettings?.selectVoice || 'Select Voice'}
              </Text>
              <TouchableOpacity
                onPress={() => setPickerOpen(false)}
                style={styles.sheetClose}
              >
                <X size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            {deviceLoading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator color={accent} />
                <Text style={{ color: COLORS.muted, fontSize: 13 }}>
                  {translation?.voiceSettings?.loadingVoices || 'Loading voices…'}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 500 }}
                showsVerticalScrollIndicator={false}
              >
                {edgeVoices.length > 0 && (
                  <View>
                    <Text
                      style={[
                        styles.groupLbl,
                        isRtl && styles.groupLblRtl,
                        { color: accent },
                      ]}
                    >
                      {translation?.voiceSettings?.edgeNeuralHeading || 'Edge Neural (back-end)'}
                    </Text>
                    {edgeVoices.map(v => {
                      const sel = edgeEnabled && edgeVoiceId === v.voiceId;
                      return (
                        <TouchableOpacity
                          key={v.voiceId}
                          onPress={() => applyEdgeVoice(v.voiceId)}
                          activeOpacity={0.7}
                          style={[
                            styles.voiceRow,
                            isRtl && { flexDirection: 'row-reverse' },
                            {
                              backgroundColor: sel ? accentDim : COLORS.surface,
                              borderColor: sel ? accent : COLORS.border,
                            },
                          ]}
                        >
                          <View style={[styles.voiceRowIcon, { backgroundColor: accentDim, borderColor: accentBorder }]}>
                            <Waves size={14} color={accent} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.voiceRowName,
                                { color: COLORS.text },
                              ]}
                              numberOfLines={1}
                            >
                              {v.name}
                            </Text>
                            <Text
                              style={[
                                styles.voiceRowMeta,
                                { color: COLORS.muted },
                              ]}
                            >
                              {v.category || v.voiceId.split('-').slice(0, 2).join('-')}
                            </Text>
                          </View>
                          {sel ? (
                            <CheckCircle size={17} color={accent} />
                          ) : (
                            isRtl ? (
                              <ChevronDown size={15} color={COLORS.muted} />
                            ) : (
                              <ChevronRight size={15} color={COLORS.muted} />
                            )
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    <View style={{ height: 8 }} />
                  </View>
                )}

                {deviceVoices.length === 0 ? (
                  <Text
                    style={[
                      styles.emptyTxt,
                      { color: COLORS.muted },
                    ]}
                  >
                    {translation?.voiceSettings?.noVoicesFound || 'No voices found.\nInstall a TTS language pack in device settings.'}
                  </Text>
                ) : (
                  (['neural', 'enhanced', 'local'] as const).map(q => {
                    const group = deviceVoices.filter(v => v.quality === q);
                    if (!group.length) return null;
                    const heading =
                      q === 'neural'
                        ? (translation?.voiceSettings?.quality?.neuralHeading || 'Neural · Requires internet')
                        : q === 'enhanced'
                          ? (translation?.voiceSettings?.quality?.enhancedHeading || 'Enhanced')
                          : (translation?.voiceSettings?.quality?.localHeading || 'Local · Works offline');
                    return (
                      <View key={q}>
                        <Text
                          style={[
                            styles.groupLbl,
                            isRtl && styles.groupLblRtl,
                            { color: accent },
                          ]}
                        >
                          {heading}
                        </Text>
                        {group.slice(0, 20).map(v => {
                          const sel = !edgeEnabled && deviceVoiceId === v.id;
                          return (
                            <TouchableOpacity
                              key={v.id}
                              onPress={() => applyDeviceVoice(v.id)}
                              activeOpacity={0.7}
                              style={[
                                styles.voiceRow,
                                isRtl && { flexDirection: 'row-reverse' },
                                {
                                  backgroundColor: sel ? accentDim : COLORS.surface,
                                  borderColor: sel ? accent : COLORS.border,
                                },
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.voiceRowName,
                                    { color: COLORS.text },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {v.name || v.id}
                                </Text>
                                <Text
                                  style={[
                                    styles.voiceRowMeta,
                                    { color: COLORS.muted },
                                  ]}
                                >
                                  {v.language}
                                </Text>
                              </View>
                              {sel ? (
                                <CheckCircle size={17} color={accent} />
                              ) : (
                                isRtl ? (
                                  <ChevronDown size={15} color={COLORS.muted} />
                                ) : (
                                  <ChevronRight size={15} color={COLORS.muted} />
                                )
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })
                )}
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SliderBlock({
  icon,
  label,
  snapLabel,
  value,
  isDeviceDefault,
  min,
  max,
  snaps,
  onValueChange,
  onSlidingComplete,
  onReset,
  trackColor,
  isDark,
  COLORS,
  deviceDefaultLabel,
  resetLabel,
  deviceHintLabel,
  isRtl,
}: {
  icon: React.ReactNode;
  label: string;
  snapLabel: string;
  value: number;
  isDeviceDefault: boolean;
  min: number;
  max: number;
  snaps: Array<{ label: string; value: number }>;
  onValueChange: (v: number) => void;
  onSlidingComplete: (v: number) => void;
  onReset: () => void;
  trackColor: string;
  isDark: boolean;
  COLORS: any;
  deviceDefaultLabel?: string;
  resetLabel?: string;
  deviceHintLabel?: string;
  isRtl?: boolean;
}) {
  const mutedTrack = COLORS.border;

  return (
    <View style={sliderStyles.block}>
      <View style={[sliderStyles.header, isRtl && { flexDirection: 'row-reverse' }]}>
        {icon}
        <Text style={[sliderStyles.label, { color: COLORS.text }]}>
          {label}
        </Text>

        {isDeviceDefault ? (
          <View
            style={[
              sliderStyles.defaultBadge,
              {
                backgroundColor: trackColor + '15',
                borderColor: trackColor + '35',
              },
            ]}
          >
            <Text style={[sliderStyles.defaultBadgeTxt, { color: trackColor }]}>
              {deviceDefaultLabel || 'Device default'}
            </Text>
          </View>
        ) : (
          <View style={[sliderStyles.customRow, isRtl && { flexDirection: 'row-reverse' }]}>
            <View
              style={[
                sliderStyles.snapBadge,
                {
                  backgroundColor: trackColor + '18',
                  borderColor: trackColor + '40',
                },
              ]}
            >
              <Text style={[sliderStyles.snapBadgeTxt, { color: trackColor }]}>
                {snapLabel}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onReset}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                sliderStyles.resetBtn,
                isRtl && { flexDirection: 'row-reverse' },
                { borderColor: COLORS.border },
              ]}
            >
              <RotateCcw size={12} color={COLORS.muted} />
              <Text style={[sliderStyles.resetTxt, { color: COLORS.muted }]}>
                {resetLabel || 'Reset'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isDeviceDefault && (
        <Text style={[sliderStyles.deviceHint, { color: COLORS.muted }]}>
          {deviceHintLabel || 'Move the slider to override your device setting'}
        </Text>
      )}

      <Slider
        style={sliderStyles.slider}
        minimumValue={min}
        maximumValue={max}
        step={0.01}
        value={value}
        onValueChange={onValueChange}
        onSlidingComplete={onSlidingComplete}
        minimumTrackTintColor={isDeviceDefault ? mutedTrack : trackColor}
        maximumTrackTintColor={mutedTrack}
        thumbTintColor={
          isDeviceDefault
            ? COLORS.muted
            : trackColor
        }
      />

      <View style={sliderStyles.snapRow}>
        {snaps.map(s => {
          const active = !isDeviceDefault && Math.abs(value - s.value) < 0.02;
          return (
            <TouchableOpacity
              key={s.value}
              onPress={() => onSlidingComplete(s.value)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <Text
                style={[
                  sliderStyles.snapTick,
                  {
                    color: active ? trackColor : COLORS.muted,
                    fontWeight: active ? '800' : '500',
                  },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SectionLabel({ text, isDark, isRtl }: { text: string; isDark: boolean; isRtl?: boolean }) {
  const COLORS = getColors(isDark);
  return (
    <Text
      style={[
        styles.sectionLbl,
        isRtl && styles.sectionLblRtl,
        { color: COLORS.muted },
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingTop: 0, paddingBottom: Platform.OS === 'ios' ? 40 : 32 },

  sectionLbl: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginLeft: 2,
  },
  sectionLblRtl: {
    marginLeft: 0,
    marginRight: 2,
  },

  hero: {
    borderRadius: BORDER_RADIUS.xxl,
    borderWidth: 1,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
    padding: SPACING.xl,
  },
  heroBubble: {
    position: 'absolute',
    top: -45,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  heroRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', letterSpacing: 0.4 },
  heroSub: { fontSize: FONT_SIZES.sm, fontWeight: '500', lineHeight: 18 },
  waveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 26 },
  waveBar: { width: 5, borderRadius: 3 },

  providerRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  providerChipActive: {
    borderWidth: 1,
  },
  providerChipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },

  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },
  voiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceName: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  voiceTagText: { fontSize: FONT_SIZES.xs, fontWeight: '600', marginTop: 2 },

  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    marginBottom: SPACING.xl,
  },
  previewRef: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  previewSnip: { fontSize: FONT_SIZES.sm, fontWeight: '500', lineHeight: 17 },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1.5,
  },
  playBtnTxt: { fontSize: FONT_SIZES.sm, fontWeight: '800' },

  controlCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  divider: { height: 1, marginHorizontal: SPACING.lg },

  sheetBg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    borderWidth: 1,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sheetTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800' },
  sheetClose: { padding: 6 },
  groupLbl: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    marginLeft: 2,
  },
  groupLblRtl: {
    marginLeft: 0,
    marginRight: 2,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  voiceRowName: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  voiceRowMeta: { fontSize: FONT_SIZES.xs, fontWeight: '500', marginTop: 2 },
  voiceRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  emptyTxt: {
    textAlign: 'center',
    paddingVertical: 28,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    lineHeight: 22,
  },
});

const sliderStyles = StyleSheet.create({
  block: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  label: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '700' },

  defaultBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  defaultBadgeTxt: { fontSize: FONT_SIZES.xs, fontWeight: '700' },

  customRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  snapBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  snapBadgeTxt: { fontSize: FONT_SIZES.xs, fontWeight: '800' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  resetTxt: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

  deviceHint: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    marginBottom: 4,
    marginTop: 2,
  },

  slider: { width: '100%', height: 36 },
  snapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
    paddingHorizontal: Platform.OS === 'ios' ? 10 : 4,
  },
  snapTick: { fontSize: FONT_SIZES.xs },
});
