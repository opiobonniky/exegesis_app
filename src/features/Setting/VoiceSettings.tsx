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

// ─── Preview text ─────────────────────────────────────────────────────────────

const PREVIEW_TEXT =
  'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.';

// ─── Snap points ──────────────────────────────────────────────────────────────

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

// ─── VoiceSettingsScreen ──────────────────────────────────────────────────────

export default function VoiceSettingsScreen() {
  const app = useContext(AppContext);
  const { translations: translation, language } = useLanguage();
  const isRtl = isRtlLanguage(language);
  if (!app) return null;
  const { isDark } = app;
  const COLORS = getColors(isDark);
  const navigation = useNavigation();

  // ── TTS state ──────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // ── Voice picker ───────────────────────────────────────────────────────────
  const [deviceVoices, setDeviceVoices] = useState<DeviceVoice[]>([]);
  const [deviceVoiceId, setDeviceVoiceId] = useState<string>(
    bibleTTS.getCurrentVoiceId() ?? '',
  );
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Edge TTS ──────────────────────────────────────────────────────────────
  const [edgeVoices, setEdgeVoices] = useState<TTSVoice[]>([]);
  const [edgeVoiceId, setEdgeVoiceId] = useState<string>(
    bibleTTS.edgeVoiceId,
  );
  const [edgeEnabled, setEdgeEnabled] = useState<boolean>(bibleTTS.edgeEnabled);

  // ── Sliders ────────────────────────────────────────────────────────────────
  // `null` means "using device default — not yet customised by user"
  const [rate, setRateLocal] = useState<number | null>(
    bibleTTS.isRateCustomized() ? bibleTTS.getCurrentRate() : null,
  );
  const [pitch, setPitchLocal] = useState<number | null>(
    bibleTTS.isPitchCustomized() ? bibleTTS.getCurrentPitch() : null,
  );

  // Display value (slider needs a number even in device-default mode)
  const rateDisplay = rate ?? 0.65; // midpoint shown when device-default
  const pitchDisplay = pitch ?? 1.0;

  const rateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewActiveRef = useRef(false);

  // ── Waveform animation ─────────────────────────────────────────────────────
  const waveAnims = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0.3)),
  ).current;
  const waveLoop = useRef<Animated.CompositeAnimation | null>(null);

  // ── Subscribe ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = bibleTTS.subscribe(s => {
      setIsPlaying(s.isPlaying);
      setIsPaused(s.isPaused);
      if (!s.isPlaying && !s.isPaused) previewActiveRef.current = false;
    });
    return () => unsub();
  }, []);

  // ── Waveform ───────────────────────────────────────────────────────────────
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

  // ── Load voices (device + edge) ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Load Edge TTS voices
      try {
        const voices = await ttsService.getVoices();
        setEdgeVoices(voices);
      } catch {
        setEdgeVoices([]);
      }

      // Load device TTS voices
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

  // ── Derived labels ─────────────────────────────────────────────────────────
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

  const voiceQuality = useMemo(() => {      if (isUsingEdge && currentEdgeVoice) {
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

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRateChange = (v: number) =>
    setRateLocal(Math.round(v * 100) / 100);

  const handleRateCommit = useCallback(async (v: number) => {
    const r = Math.round(v * 100) / 100;
    setRateLocal(r);
    if (rateTimer.current) clearTimeout(rateTimer.current);
    rateTimer.current = setTimeout(async () => {
      await bibleTTS.setRate(r);
      if (previewActiveRef.current) await restartPreview();
    }, 80);
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
    if (pitchTimer.current) clearTimeout(pitchTimer.current);
    pitchTimer.current = setTimeout(async () => {
      await bibleTTS.setPitch(p);
      if (previewActiveRef.current) await restartPreview();
    }, 80);
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
    await new Promise((r: any) => setTimeout(r, 100));
    await bibleTTS.speakVerses([{ num: 16, text: PREVIEW_TEXT }], 'John', 3);
  };

  const handlePreview = async () => {
    if (isPlaying || isPaused) {
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

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const gold = '#C9A84C';
  const goldDim = '#C9A84C30';
  const surface = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)';
  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[styles.root, { backgroundColor: COLORS.background }]}>
      <ActionHeader
        title={translation?.voiceSettings?.title || 'Reading Voice'}
        rightComponent={<Volume2 size={24} color={COLORS.white} />}
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
              ? ['#1A1208', '#2C1F06', '#1A1208']
              : ['#FDF6E3', '#F5E6C0', '#FDF6E3']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: gold + '28' }]}
        >
          <View          style={[styles.heroBubble, isRtl ? { left: -45 } : { right: -45 }, { borderColor: gold + '14' }]} />
          <View style={[styles.heroInner, isRtl && { flexDirection: 'row-reverse' }]}>
            <View
              style={[
                styles.heroRing,
                { borderColor: gold + '55', backgroundColor: goldDim },
              ]}
            >
              <Waves size={21} color={gold} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.heroTitle, { color: gold }]}>
                {translation?.voiceSettings?.title || 'Voice & Narration'}
              </Text>
              <Text
                style={[
                  styles.heroSub,
                  {
                    color: isDark
                      ? 'rgba(255,255,255,0.50)'
                      : 'rgba(0,0,0,0.45)',
                  },
                ]}
              >
                {translation?.voiceSettings?.heroSubPrefix || 'Configure your reading voice. Sliders marked '}
                <Text style={{ color: gold, fontWeight: '700' }}>
                  {translation?.voiceSettings?.deviceDefaultBadge || 'Device default'}
                </Text>{' '}
                {translation?.voiceSettings?.heroSubSuffix || 'inherit your system TTS settings.'}
              </Text>
            </View>
          </View>
          {/* Live waveform */}
          <View style={styles.waveRow}>
            {waveAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    backgroundColor: isPlaying ? gold : gold + '45',
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

        {/* Provider toggle: Edge Neural / Device */}
        {edgeVoices.length > 0 && (
          <View
            style={[
              styles.providerRow,
              isRtl && { flexDirection: 'row-reverse' },
              { backgroundColor: surface, borderColor: border },
            ]}
          >
            <TouchableOpacity
              onPress={() => toggleEdgeProvider(true)}
              activeOpacity={0.7}
              style={[
                styles.providerChip,
                edgeEnabled && styles.providerChipActive,
                {
                  backgroundColor: edgeEnabled ? gold + '18' : 'transparent',
                  borderColor: edgeEnabled ? gold + '55' : 'transparent',
                },
              ]}
            >
              <Waves size={14} color={edgeEnabled ? gold : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')} />
              <Text
                style={[
                  styles.providerChipText,
                  { color: edgeEnabled ? gold : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)') },
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
                  backgroundColor: !edgeEnabled ? gold + '18' : 'transparent',
                  borderColor: !edgeEnabled ? gold + '55' : 'transparent',
                },
              ]}
            >
              <Mic2 size={14} color={!edgeEnabled ? gold : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')} />
              <Text
                style={[
                  styles.providerChipText,
                  { color: !edgeEnabled ? gold : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)') },
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
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          <View
            style={[
              styles.voiceIcon,
              { backgroundColor: goldDim, borderColor: gold + '55' },
            ]}
          >
            {isUsingEdge ? (
              <Waves size={18} color={gold} />
            ) : (
              <Mic2 size={18} color={gold} />
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
              <Text style={[styles.voiceTagText, { color: gold }]}>
                {voiceQuality}{isUsingEdge ? '' : (' · ' + (currentDeviceVoice?.language ?? ''))}
              </Text>
            )}
          </View>
          {deviceLoading ? (
            <ActivityIndicator size="small" color={gold} />
          ) : (
            <ChevronDown size={17} color={gold} />
          )}
        </TouchableOpacity>

        {/* ── Preview ─────────────────────────────────────────────────── */}
        <SectionLabel text={(translation?.voiceSettings?.previewLabel || 'PREVIEW').toUpperCase()} isDark={isDark} isRtl={isRtl} />
        <View
          style={[
            styles.previewCard,
            isRtl && { flexDirection: 'row-reverse' },
            {
              backgroundColor: surface,
              borderColor: isPlaying ? gold + '65' : border,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewRef, { color: gold }]}>{translation?.voiceSettings?.previewRef || 'John 3:16'}</Text>
            <Text
              style={[
                styles.previewSnip,
                {
                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)',
                },
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
                backgroundColor: isPlaying ? '#C0392B18' : gold,
                borderColor: isPlaying ? '#C0392B55' : 'transparent',
              },
            ]}
          >
            {isPlaying ? (
              <Square size={14} color="#C0392B" />
            ) : (
              <Play size={14} color="#1A1208" />
            )}
              <Text
                style={[
                  styles.playBtnTxt,
                  { color: isPlaying ? '#C0392B' : '#1A1208' },
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
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          {/* Reading Speed */}
          <SliderBlock
            icon={<Gauge size={15} color={gold} />}
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
            trackColor={gold}
            isDark={isDark}
            COLORS={COLORS}
            deviceDefaultLabel={translation?.voiceSettings?.deviceDefaultBadge || 'Device default'}
            resetLabel={translation?.voiceSettings?.reset || 'Reset'}
            deviceHintLabel={translation?.voiceSettings?.deviceHint || 'Move the slider to override your device setting'}
            isRtl={isRtl}
          />

          <View style={[styles.divider, { backgroundColor: border }]} />

          {/* Voice Pitch */}
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
        <View style={styles.sheetBg}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? '#141006' : '#FFFDF6',
                borderColor: gold + '22',
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: gold + '40' }]} />
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
                <X
                  size={20}
                  color={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.38)'}
                />
              </TouchableOpacity>
            </View>

            {deviceLoading ? (
              <View
                style={{ paddingVertical: 32, alignItems: 'center', gap: 12 }}
              >
                <ActivityIndicator color={gold} />
                <Text
                  style={{
                    color: isDark
                      ? 'rgba(255,255,255,0.38)'
                      : 'rgba(0,0,0,0.38)',
                    fontSize: 13,
                  }}
                >
                  {translation?.voiceSettings?.loadingVoices || 'Loading voices…'}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 500 }}
                showsVerticalScrollIndicator={false}
              >
                {/* ── Edge Neural Voices ────────────────────────────────── */}
                {edgeVoices.length > 0 && (
                  <View>
                    <Text
                      style={[
                        styles.groupLbl,
                        isRtl && styles.groupLblRtl,
                        { color: gold },
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
                              backgroundColor: sel
                                ? gold + '14'
                                : 'transparent',
                              borderColor: sel
                                ? gold + '55'
                                : isDark
                                  ? 'rgba(255,255,255,0.07)'
                                  : 'rgba(0,0,0,0.07)',
                              borderStyle: sel ? 'solid' : 'dashed',
                            },
                          ]}
                        >
                          <View style={[styles.voiceRowIcon, { backgroundColor: goldDim, borderColor: gold + '55' }]}>
                            <Waves size={14} color={gold} />
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
                                {
                                  color: isDark
                                    ? 'rgba(255,255,255,0.35)'
                                    : 'rgba(0,0,0,0.35)',
                                },
                              ]}
                            >
                              {v.category || v.voiceId.split('-').slice(0,2).join('-')}
                            </Text>
                          </View>
                          {sel ? (
                            <CheckCircle size={17} color={gold} />
                          ) : (
                            isRtl ? (
                              <ChevronDown
                                size={15}
                                color={
                                  isDark
                                    ? 'rgba(255,255,255,0.22)'
                                    : 'rgba(0,0,0,0.20)'
                                }
                              />
                            ) : (
                              <ChevronRight
                                size={15}
                                color={
                                  isDark
                                    ? 'rgba(255,255,255,0.22)'
                                    : 'rgba(0,0,0,0.20)'
                                }
                              />
                            )
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    <View style={{ height: 8 }} />
                  </View>
                )}

                {/* ── Device voices ─────────────────────────────────────── */}
                {deviceVoices.length === 0 ? (
                  <Text
                    style={[
                      styles.emptyTxt,
                      {
                        color: isDark
                          ? 'rgba(255,255,255,0.38)'
                          : 'rgba(0,0,0,0.38)',
                      },
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
                            { color: gold },
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
                                  backgroundColor: sel
                                    ? gold + '14'
                                    : 'transparent',
                                  borderColor: sel
                                    ? gold + '55'
                                    : isDark
                                      ? 'rgba(255,255,255,0.07)'
                                      : 'rgba(0,0,0,0.07)',
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
                                    {
                                      color: isDark
                                        ? 'rgba(255,255,255,0.35)'
                                        : 'rgba(0,0,0,0.35)',
                                    },
                                  ]}
                                >
                                  {v.language}
                                </Text>
                              </View>
                              {sel ? (
                                <CheckCircle size={17} color={gold} />
                              ) : (
                                isRtl ? (
                                  <ChevronDown
                                    size={15}
                                    color={
                                      isDark
                                        ? 'rgba(255,255,255,0.22)'
                                        : 'rgba(0,0,0,0.20)'
                                    }
                                  />
                                ) : (
                                  <ChevronRight
                                    size={15}
                                    color={
                                      isDark
                                        ? 'rgba(255,255,255,0.22)'
                                        : 'rgba(0,0,0,0.20)'
                                    }
                                  />
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

// ─── SliderBlock ──────────────────────────────────────────────────────────────

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
  const mutedTrack = isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.09)';

  return (
    <View style={sliderStyles.block}>
      {/* Header row */}
      <View style={[sliderStyles.header, isRtl && { flexDirection: 'row-reverse' }]}>
        {icon}
        <Text style={[sliderStyles.label, { color: COLORS.text }]}>
          {label}
        </Text>

        {isDeviceDefault ? (
          /* Device-default badge — no reset needed, already at default */
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
          /* Custom value badge + reset button */
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
                {
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.14)'
                    : 'rgba(0,0,0,0.12)',
                },
              ]}
            >
              <RotateCcw
                size={12}
                color={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)'}
              />
                <Text
                  style={[
                    sliderStyles.resetTxt,
                    {
                      color: isDark
                        ? 'rgba(255,255,255,0.45)'
                        : 'rgba(0,0,0,0.40)',
                    },
                  ]}
                >
                {resetLabel || 'Reset'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Hint shown only when device default is active */}
        {isDeviceDefault && (
          <Text
            style={[
              sliderStyles.deviceHint,
              { color: isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)' },
            ]}
          >
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
            ? isDark
              ? 'rgba(255,255,255,0.35)'
              : 'rgba(0,0,0,0.28)'
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
                    color: active
                      ? trackColor
                      : isDark
                        ? 'rgba(255,255,255,0.25)'
                        : 'rgba(0,0,0,0.25)',
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

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ text, isDark, isRtl }: { text: string; isDark: boolean; isRtl?: boolean }) {
  return (
    <Text
      style={[
        styles.sectionLbl,
        isRtl && styles.sectionLblRtl,
        { color: isDark ? 'rgba(255,255,255,0.27)' : 'rgba(0,0,0,0.28)' },
      ]}
    >
      {text}
    </Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Hero
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

  // Voice button
  // Provider toggle
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

  // Preview
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

  // Control card
  controlCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  divider: { height: 1, marginHorizontal: SPACING.lg },

  // Sheet
  sheetBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
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
