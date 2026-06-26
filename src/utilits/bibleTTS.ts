import Tts from 'react-native-tts';
import Sound from 'react-native-sound';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fromByteArray } from 'base64-js';
import { ttsService } from '../services/ttsService';

// Enable playback in silence mode (iOS background audio) and route audio through
// the speaker even when the device is in silent mode.
Sound.setCategory('Playback');

// ── TTS Architecture ─────────────────────────────────────────────────────────
// The app supports two TTS providers:
//   1. Device TTS (react-native-tts) — works offline, uses system voices
//   2. Backend Edge TTS — high-quality neural voices via /tts/speak, returns
//      MP3 audio written to a temp file and played via react-native-sound
//
// On init the app probes the backend /tts/status endpoint. If the backend is
// available, Edge TTS is used first. On failure (empty audio / network error)
// it falls back to device TTS for the remainder of the session.

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  rate: 'tts_rate',
  pitch: 'tts_pitch',
  deviceVoice: 'tts_device_voice',
};

// ─── Narration defaults ───────────────────────────────────────────────────────
const DEFAULT_RATE = 0.9;   // slightly slower for natural pacing
const DEFAULT_PITCH = 1.0;  // neutral pitch sounds less robotic

// ─── AsyncStorage keys — Edge TTS ────────────────────────────────────────────
const STORAGE_KEYS_EDGE = {
  edgeVoiceId: 'tts_edge_voice_id',
  edgeEnabled: 'tts_edge_enabled',
};

const DEFAULT_EDGE_VOICE_ID = 'en-US-EmmaNeural';

const PREFERRED_VOICES: string[] =
  Platform.select({
    ios: [
      // iOS device enhanced (neural) voices
      'com.apple.voice.enhanced.en-US.Samantha',
      'com.apple.voice.enhanced.en-GB.Daniel',
      'com.apple.voice.enhanced.en-US.Aaron',
      'com.apple.voice.enhanced.en-AU.Karen',
      'com.apple.voice.enhanced.en-IE.Moira',
      'com.apple.voice.enhanced.en-ZA.Tessa',
      'com.apple.voice.enhanced.en-IN.Ravi',
      'com.apple.voice.enhanced.en-US.Alex',
      'com.apple.voice.enhanced.en-GB.Serena',
      'com.apple.voice.premium.en-US.Zoe',
      'com.apple.voice.premium.en-US.Evan',
      'com.apple.voice.premium.en-GB.Daniel',
      // macOS / iOS Simulator voices (different ID format)
      'com.apple.speech.synthesis.voice.samantha.premium',
      'com.apple.speech.synthesis.voice.samantha',
      'com.apple.speech.synthesis.voice.daniel.premium',
      'com.apple.speech.synthesis.voice.daniel',
      'com.apple.speech.synthesis.voice.aaron.premium',
      'com.apple.speech.synthesis.voice.aaron',
      'com.apple.speech.synthesis.voice.karen.premium',
      'com.apple.speech.synthesis.voice.karen',
      'com.apple.speech.synthesis.voice.moira.premium',
      'com.apple.speech.synthesis.voice.moira',
      'com.apple.speech.synthesis.voice.tessa.premium',
      'com.apple.speech.synthesis.voice.tessa',
      'com.apple.speech.synthesis.voice.alex',
    ],
    android: [
      // Google TTS network (neural) voices — most human-sounding.
      'en-us-x-iom-network',
      'en-us-x-sfg-network',
      'en-us-x-tpf-network',
      'en-us-x-wbk-network',
      'en-us-x-tbd-network',
      'en-us-x-cem-network',
      'en-us-x-aqk-network',
      'en-gb-x-gbd-network',
      'en-gb-x-gbw-network',
      'en-gb-x-gba-network',
      'en-au-x-aus-network',
      'en-au-x-aum-network',
      'en-in-x-ind-network',
      // Google TTS local fallbacks (same voices, device-stored).
      'en-us-x-iom-local',
      'en-us-x-sfg-local',
      'en-us-x-tpf-local',
      'en-us-x-wbk-local',
      'en-us-x-tbd-local',
      'en-gb-x-gbd-local',
      'en-gb-x-gbw-local',
      'en-au-x-aus-local',
      'en-in-x-ind-local',
      // Samsung TTS (common on Samsung devices).
      'en-us-x-sfg#f_st_1-local',
      'en-us-x-iom#f_st_1-local',
      'en-us-x-wbk#f_st_1-local',
      'en-gb-x-gbd#f_st_1-local',
    ],
  }) ?? [];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string;
  currentPosition: number;
  usingCloudVoice: boolean;
  tier: 'elevenlabs' | 'device' | 'idle';
  /**
   * Index of the word currently being spoken within the VERSE TEXT (0-based).
   * -1 = speaking the intro prefix (book / chapter / verse number).
   */
  wordIndex: number;
  /**
   * The verse number this utterance belongs to. Used by VerseCard to verify
   * it is the intended target before applying word-index highlights.
   * -1 = no active verse.
   */
  currentVerseNum: number;
}

export interface DeviceVoice {
  id: string;
  name: string;
  language: string;
  quality: 'neural' | 'enhanced' | 'local';
}

// ─── BibleTTSManager ──────────────────────────────────────────────────────────
class BibleTTSManager {
  private state: TTSState = {
    isPlaying: false,
    isPaused: false,
    currentText: '',
    currentPosition: 0,
    usingCloudVoice: false,
    tier: 'idle',
    wordIndex: -1,
    currentVerseNum: -1,
  };

  private listeners: Array<(state: TTSState) => void> = [];
  private initialized = false;
  private currentRate = DEFAULT_RATE;
  private currentPitch = DEFAULT_PITCH;
  private currentDeviceVoiceId: string | null = null;

  // The index of the first word in the current utterance relative to the full verse.
  // Used to ensure wordIndex remains absolute during mid-verse resumes.
  private _baseWordIndex = 0;

  // Saved at pause() so resume() can compute the verse-only pause position
  // even after speak() has overwritten _baseWordIndex.
  private _pausedBaseWordIndex = 0;

  private _rateCustomized = false;
  private _pitchCustomized = false;

  private stopRequested = false;
  private _pendingResolve: (() => void) | null = null;
  private _utteranceStarted = false;
  private _isTtsSpeaking = false;
  private _pauseInProgress = false;
  private _currentVerseNum = -1;
  // Absolute char position in the cleaned text where speech was paused.
  // Computed from the last raw engine charIndex + _charIndexBase (= -prefixLen).
  // -1 means unknown (no progress events fired before pause).
  private _pausedAbsoluteCharPos: number = -1;
  private _pausedVerseNum: number = -1;

  // ── Edge TTS (backend) fields ────────────────────────────────────────────
  private _edgeEnabled = false;
  private _edgeVoiceId: string = DEFAULT_EDGE_VOICE_ID;
  private _edgeSound: Sound | null = null;
  private _edgePendingResolve: (() => void) | null = null;

  // ── Prefetch fields ───────────────────────────────────────────────────────
  private _prefetchedFile: string | null = null;
  private _prefetchedText: string | null = null;

  // ── Pause / resume state ──────────────────────────────────────────────────
  //
  // BUG FIX: pause() calls Tts.stop(), which fires tts-cancel, which wipes
  // state.currentText before resume() can read it. We save what we need here
  // before the stop happens.
  //
  private _pausedText = '';
  private _pausedPrefixLen = 0;

  // ── Timer-based word highlighting (fallback) ──────────────────────────────
  private _wordTimers: ReturnType<typeof setTimeout>[] = [];
  private _timersStarted = false;
  private _pendingWordData: {
    prefixWords: string[];
    verseWords: string[];
  } | null = null;

  private _cleanPrefixCharLen = 0;
  private _cleanVerseWordSpans: Array<{ start: number; end: number }> = [];
  private _progressEventsFired = 0;

  private _charIndexBase = 0; // set per-utterance in speak()
  private _lastRawCharIndex = -1; // previous raw engine charIndex
  private _activeUtteranceId: string | number | null = null;

  constructor() {
    this.setupListeners();
    void this.loadSavedSettings();
  }

  // ── Device TTS event listeners ────────────────────────────────────────────
  private setupListeners() {
    if (!Tts) return;

    // ── tts-start ─────────────────────────────────────────────────────────────
    Tts.addEventListener('tts-start', (e?: any) => {
      const utteranceId = e && typeof e === 'object' ? e.utteranceId : e;
      if (utteranceId !== undefined && this._activeUtteranceId !== null && utteranceId !== this._activeUtteranceId) {
        console.log('[BibleTTS] tts-start ignored for old utterance:', utteranceId);
        return;
      }
      this._isTtsSpeaking = true;
      this._progressEventsFired = 0;
      this._lastRawCharIndex = -1;
      this.setState({
        isPlaying: true,
        isPaused: false,
        tier: 'device',
        currentVerseNum: this._currentVerseNum,
      });

      // Start timer-based highlighting as a fallback. Cancelled on the first
      // tts-progress event if the engine supports word-boundary callbacks.
      if (!this._timersStarted) {
        this._startWordTimers();
      }
    });

    // ── tts-progress ─────────────────────────────────────────────────────────
    Tts.addEventListener('tts-progress', (e: any) => {
      const utteranceId = e && typeof e === 'object' ? e.utteranceId : e;
      if (utteranceId !== undefined && this._activeUtteranceId !== null && utteranceId !== this._activeUtteranceId) {
        return;
      }
      if (this.stopRequested) return;

      const charIndex: number =
        e.charIndex !== undefined
          ? (e.charIndex as number)
          : e.start !== undefined
            ? (e.start as number)
            : 0;

      // First progress event: engine supports boundary callbacks — cancel timers.
      if (this._progressEventsFired === 0) {
        this._clearWordTimers();
      }

      if (
        this._progressEventsFired > 0 &&
        charIndex < this._lastRawCharIndex - 20
      ) {
        const nextWordIdx = Math.max(0, this.state.wordIndex + 1);
        const spans = this._cleanVerseWordSpans;
        if (nextWordIdx < spans.length) {
          this._charIndexBase = spans[nextWordIdx].start;
        }
      }

      this._lastRawCharIndex = charIndex;
      this._progressEventsFired++;

      // Resolve charIndex to a verse-word char offset.
      // Negative = still inside the prefix announcement → skip.
      const verseCharOffset = charIndex + this._charIndexBase;

      // Notify custom progress listener if attached
      if (this._onProgressCallback && verseCharOffset >= 0) {
        this._onProgressCallback(verseCharOffset);
      }

      if (verseCharOffset < 0) return;

      const spans = this._cleanVerseWordSpans;
      const wordIdx = this._binarySearchWordSpan(spans, verseCharOffset);

      if (wordIdx >= 0) {
        const absoluteWordIdx = wordIdx + this._baseWordIndex;
        if (absoluteWordIdx !== this.state.wordIndex) {
          this.state.wordIndex = absoluteWordIdx;
          this.notifyListeners();
        }
      }
    });

    // ── tts-finish ────────────────────────────────────────────────────────────
    Tts.addEventListener('tts-finish', (e?: any) => {
      const utteranceId = e && typeof e === 'object' ? e.utteranceId : e;
      if (utteranceId !== undefined && this._activeUtteranceId !== null && utteranceId !== this._activeUtteranceId) {
        console.log('[BibleTTS] tts-finish ignored for old utterance:', utteranceId);
        return;
      }
      console.log('[BibleTTS] tts-finish event fired');
      this._isTtsSpeaking = false;
      this._clearUtteranceTimeout();
      this._clearWordTimers();
      this.state.wordIndex = -1;
      this.setState({
        isPlaying: false,
        isPaused: false,
        currentPosition: 0,
        tier: 'idle',
        currentVerseNum: -1,
      });
      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      this._utteranceStarted = false;
      resolve?.();
    });

    // ── tts-cancel ────────────────────────────────────────────────────────────
    Tts.addEventListener('tts-cancel', (e?: any) => {
      const utteranceId = e && typeof e === 'object' ? e.utteranceId : e;
      if (utteranceId !== undefined && this._activeUtteranceId !== null && utteranceId !== this._activeUtteranceId) {
        console.log('[BibleTTS] tts-cancel ignored for old utterance:', utteranceId);
        return;
      }
      console.log('[BibleTTS] tts-cancel event fired');
      this._isTtsSpeaking = false;
      this._clearUtteranceTimeout();
      this._clearWordTimers();
      this.state.wordIndex = -1;

      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      const wasStarted = this._utteranceStarted;
      this._utteranceStarted = false;

      if (!wasStarted) {
        resolve?.();
        return;
      }

      if (this._pauseInProgress) {
        this.state.wordIndex = this._pausedWordIndex;
        this.setState({
          isPlaying: false,
          isPaused: true,
          tier: 'device',
          currentVerseNum: this._currentVerseNum,
        });
        resolve?.();
        return;
      }

      this.setState({
        isPlaying: false,
        isPaused: false,
        currentPosition: 0,
        tier: 'idle',
        currentVerseNum: -1,
      });
      resolve?.();
    });
  }

  // ── Binary search: find word index whose span contains charOffset ──────────
  private _binarySearchWordSpan(
    spans: Array<{ start: number; end: number }>,
    charOffset: number,
  ): number {
    if (!spans.length) return -1;
    let lo = 0;
    let hi = spans.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (spans[mid].end <= charOffset) {
        lo = mid + 1;
      } else if (spans[mid].start > charOffset) {
        hi = mid - 1;
      } else {
        return mid;
      }
    }
    // charOffset is in a gap (space / punctuation) — return next word to the
    // right so the highlight never jumps backwards.
    return Math.min(lo, spans.length - 1);
  }

  private setState(partial: Partial<TTSState>) {
    Object.assign(this.state, partial);
    this.notifyListeners();
  }

  // ── Timer-based word timing estimation (fallback) ─────────────────────────
  private _wordMs(word: string): number {
    // TTS rate 0.0–1.0 maps to roughly 80–280 WPM on most engines.
    const wpm = Math.max(80, 80 + this.currentRate * 180);
    const avgMs = 60_000 / wpm;

    // Adjust character-based estimation to be slightly more aggressive.
    // Bible text often has short, common words that are spoken very quickly.
    const charMs = (word.replace(/[^a-zA-Z0-9]/g, '').length / 5.2) * avgMs;

    // Punctuation pauses are critical for the "rhythm" of the highlight.
    const punct = /[,;]$/.test(word) ? 100 : /[.!?…]$/.test(word) ? 200 : 0;

    return Math.max(60, charMs + punct);
  }

  private _clearWordTimers() {
    this._wordTimers.forEach(t => clearTimeout(t));
    this._wordTimers = [];
    this._timersStarted = false;
  }

  // Called from tts-start so timers fire exactly when audio begins.
  private _startWordTimers(immediateResume = false) {
    this._clearWordTimers();
    this._timersStarted = true;
    const data = this._pendingWordData;
    if (!data || !data.verseWords.length) return;

    // Use a slightly faster estimation for the prefix words to ensure
    // we don't "miss" the start of the verse.
    const prefixMs = data.prefixWords.reduce(
      (sum, w) => sum + this._wordMs(w) * 0.92,
      0,
    );

    // Initial delay for the very first word of the verse.
    // If it's an immediate resume, we ignore the prefix delay entirely.
    let elapsed = immediateResume ? 0 : Math.max(0, prefixMs - 80); // 80ms "lead" to compensate for UI lag

    data.verseWords.forEach((word, i) => {
      const t = setTimeout(() => {
        if (!this.stopRequested) {
          this.state.wordIndex = i + this._baseWordIndex;
          this.notifyListeners();
        }
      }, elapsed);
      this._wordTimers.push(t);
      elapsed += this._wordMs(word);
    });

    // Clear pending data only if we didn't start them early
    if (!immediateResume) {
      this._pendingWordData = null;
    }
  }

  // ── Saved settings ────────────────────────────────────────────────────────
  async loadSavedSettings(): Promise<void> {
    try {
      const [savedRate, savedPitch, savedVoice] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.rate),
        AsyncStorage.getItem(STORAGE_KEYS.pitch),
        AsyncStorage.getItem(STORAGE_KEYS.deviceVoice),
      ]);
      if (savedRate) {
        this.currentRate = parseFloat(savedRate);
        this._rateCustomized = true;
      }
      if (savedPitch) {
        this.currentPitch = parseFloat(savedPitch);
        this._pitchCustomized = true;
      }
      if (savedVoice) this.currentDeviceVoiceId = savedVoice;

      // Load saved Edge TTS voice preference
      const savedEdgeVoice = await AsyncStorage.getItem(STORAGE_KEYS_EDGE.edgeVoiceId);
      if (savedEdgeVoice) this._edgeVoiceId = savedEdgeVoice;
    } catch (err) {
      console.warn('[BibleTTS] Failed to load saved settings:', err);
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  async init(): Promise<void> {
    if (this.initialized) return;

    if (!Tts) {
      console.warn(
        '[BibleTTS] Tts module not available - native module may not be linked',
      );
      return;
    }

    try {
      await Tts.setDefaultLanguage('en-US');

      if (this._rateCustomized) await Tts.setDefaultRate(this.currentRate);
      if (this._pitchCustomized) await Tts.setDefaultPitch(this.currentPitch);

      if (Platform.OS === 'android') {
        try {
          await (Tts as any).setSpokenWordProgress(true);
        } catch {
          // Android 14+ may throw; tts-progress events still fire natively.
        }
      }

      const voices = await Tts.voices();
      const best = this.selectBestVoice(voices);
      if (best) {
        await Tts.setDefaultVoice(best);
        console.log('[BibleTTS] Using voice:', best);
      }

      this.initialized = true;

      // ── Probe backend Edge TTS availability ──────────────────────────────
      try {
        const enabled = await ttsService.isEnabled();
        this._edgeEnabled = enabled;
        if (enabled) {
          console.log('[BibleTTS] Backend Edge TTS is available');
        }
      } catch {
        this._edgeEnabled = false;
        console.log('[BibleTTS] Backend Edge TTS not available, using device TTS');
      }
    } catch (err) {
      console.warn('[BibleTTS] Init failed:', err);
    }
  }

  private selectBestVoice(voices: any[]): string | null {
    const english = voices.filter(v => {
      if (!v.language?.toLowerCase().startsWith('en')) return false;
      if (v.notInstalled === true) return false;
      return true;
    });

    if (this.currentDeviceVoiceId) {
      const saved = english.find(v => v.id === this.currentDeviceVoiceId);
      if (saved) return saved.id;
    }

    for (const id of PREFERRED_VOICES) {
      const match = english.find(
        v =>
          v.id === id ||
          v.id?.includes(id) ||
          v.name?.toLowerCase().includes(id.toLowerCase()),
      );
      if (match) return match.id;
    }

    // Also match by name — some engines put quality in display name
    const byName = (keyword: string) =>
      english.find(
        v =>
          v.id?.toLowerCase().includes(keyword) ||
          v.name?.toLowerCase().includes(keyword),
      );

    const neural =
      english.find(
        v => v.id?.includes('network') || v.networkConnectionRequired,
      ) ?? byName('neural');
    if (neural) return neural.id;

    const quality =
      english.find(
        v =>
          (v.id?.includes('premium') || v.name?.includes('premium')) &&
          !v.id?.includes('?'),
      ) ?? byName('enhanced');
    if (quality) return quality.id;

    // macOS premium voices: com.apple.speech.synthesis.voice.*.premium
    const macPremium = english.find(
      v =>
        v.id?.startsWith('com.apple.speech.synthesis.voice.') &&
        v.id?.endsWith('.premium'),
    );
    if (macPremium) return macPremium.id;

    return english[0]?.id ?? null;
  }

  // ── Text preparation ──────────────────────────────────────────────────────
  prepareText(text: string): string {
    return text
      .replace(/^#\s+/gm, '')
      .replace(/\[([^\]]+)\]/g, '$1')
      .replace(/\{[^}]*\}/g, '')
      .replace(/[*_`#]/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\n/g, ' ')
      .replace(/\bv\.\s*(\d+)/gi, 'verse $1')
      .replace(/\bvv\.\s*(\d+)/gi, 'verses $1')
      .replace(/\bch\.\s*(\d+)/gi, 'chapter $1')
      .replace(/\bvs?\.\s*(\d+)/gi, 'verse $1')
      .replace(/\bJn\b/g, 'John')
      .replace(/\bRom\b/g, 'Romans')
      .replace(/\bPs\b/g, 'Psalms')
      .replace(/\bGen\b/g, 'Genesis')
      .replace(/\bEx\b/g, 'Exodus')
      .replace(/\bMt\b/g, 'Matthew')
      .replace(/\bMk\b/g, 'Mark')
      .replace(/\bLk\b/g, 'Luke')
      .replace(/\bRev\b/g, 'Revelation')
      .replace(/\bLORD\b/g, 'Lord')
      .replace(/\bGOD\b/g, 'God')
      .replace(/\s*—\s*/g, ', ')
      .replace(/(\d)\s*–\s*(\d)/g, '$1 to $2')
      .replace(/;\s*/g, ', ')
      .replace(/:\s+([a-z])/g, ', $1')
      .replace(/\(([^)]+)\)/g, ', $1,')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      .replace(/\.{3}/g, '... ')
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*,/g, ',')
      .trim();
  }

  private _utteranceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private _clearUtteranceTimeout() {
    if (this._utteranceTimeoutId !== null) {
      clearTimeout(this._utteranceTimeoutId);
      this._utteranceTimeoutId = null;
    }
  }

  private _onProgressCallback: ((charIndex: number) => void) | null = null;

  // ── Core speak ────────────────────────────────────────────────────────────
  async speak(
    text: string,
    prefixLen = 0,
    baseWordIndex = 0,
    onProgress?: (charIndex: number) => void,
    alreadyClean = false,
    verseNum = -1,
  ): Promise<void> {
    if (!text) {
      console.warn('[BibleTTS] speak called with empty text');
      return Promise.resolve();
    }

    this.stopRequested = false;

    // ── Edge TTS (backend) ──────────────────────────────────────────────────
    if (this._edgeEnabled) {
      try {
        const cleanText = alreadyClean ? text : this.prepareText(text);
        await this._speakViaBackend(cleanText, verseNum);
        return;
      } catch (err) {
        console.warn('[BibleTTS] Edge TTS failed, falling back to device TTS:', err);
        this._edgeEnabled = false;
        // Fall through to device TTS path below
      }
    }

    // ── Device TTS (react-native-tts) ───────────────────────────────────────
    if (!Tts) {
      console.error('[BibleTTS] Tts module not available - cannot speak');
      return Promise.resolve();
    }

    console.log(
      '[BibleTTS] speak called with text length:',
      text.length,
      'prefixLen:',
      prefixLen,
    );

    this._onProgressCallback = onProgress || null;
    this._baseWordIndex = baseWordIndex;
    this._currentVerseNum = verseNum;
    this._activeUtteranceId = 'transitioning';

    this.stopRequested = false;
    const clean = alreadyClean ? text : this.prepareText(text);
    console.log('[BibleTTS] prepared text:', clean.substring(0, 50), '...');
    this.state.currentText = clean;
    this.state.wordIndex = -1;
    this.state.currentVerseNum = verseNum;

    this._cleanPrefixCharLen = prefixLen;
    this._charIndexBase = -prefixLen;
    this._lastRawCharIndex = -1;

    const verseText = clean.slice(prefixLen);
    const spanRe = /\S+/g;
    let sm: RegExpExecArray | null;
    const spans: Array<{ start: number; end: number }> = [];
    while ((sm = spanRe.exec(verseText)) !== null) {
      spans.push({ start: sm.index, end: sm.index + sm[0].length });
    }
    this._cleanVerseWordSpans = spans;

    const verseWords = clean.slice(prefixLen).match(/\S+/g) ?? [];
    this._pendingWordData = {
      prefixWords: [],
      verseWords,
    };

    if (this.stopRequested) return;
    if (!this.initialized) await this.init();
    this.setState({ usingCloudVoice: false, tier: 'device' });

    if (baseWordIndex > 0 || prefixLen === 0) {
      this.state.wordIndex = baseWordIndex;
      this.notifyListeners();

      if (baseWordIndex > 0) {
        this._startWordTimers(true);
      }
    }

    try {
      console.log(
        '[BibleTTS] _isTtsSpeaking before speak:',
        this._isTtsSpeaking,
      );

      await new Promise<void>(resolve => {
        const doSpeak = () => {
          this._pendingResolve = resolve;
          this._utteranceStarted = false;

          console.log(
            '[BibleTTS] doSpeak called, stopRequested:',
            this.stopRequested,
          );

          if (this.stopRequested) {
            this._pendingResolve = null;
            this._utteranceStarted = false;
            this._clearUtteranceTimeout();
            resolve();
            return;
          }
          this._utteranceStarted = true;
          this._isTtsSpeaking = true;
          console.log(
            '[BibleTTS] Calling Tts.speak with text:',
            clean.substring(0, 30),
            '...',
          );

          this._clearUtteranceTimeout();
          this._utteranceTimeoutId = setTimeout(() => {
            if (this._pendingResolve === resolve) {
              console.warn(
                '[BibleTTS] Utterance timeout — engine may have dropped it (Android 14)',
              );
              this._isTtsSpeaking = false;
              this._pendingResolve = null;
              this._utteranceStarted = false;
              this._clearWordTimers();
              this.state.wordIndex = -1;
              this.setState({
                isPlaying: false,
                isPaused: false,
                tier: 'idle',
                currentVerseNum: -1,
              });
              resolve();
            }
          }, 30_000);

          Promise.resolve(Tts.speak(clean))
            .then((id) => {
              this._activeUtteranceId = id;
              console.log('[BibleTTS] Tts.speak resolved, utteranceId:', id);
            })
            .catch(err => {
              console.error('[BibleTTS] Tts.speak error:', err);
              this._clearUtteranceTimeout();
              this._isTtsSpeaking = false;
              this._pendingResolve = null;
              this._utteranceStarted = false;
              resolve();
            });
        };

        if (this._isTtsSpeaking) {
          const oldResolve = this._pendingResolve;
          this._pendingResolve = null;
          oldResolve?.();

          Tts.stop()
            .then(doSpeak)
            .catch(() => {
              this._isTtsSpeaking = false;
              this.initialized = false;
              doSpeak();
            });
        } else {
          this._pendingResolve = resolve;
          this._utteranceStarted = false;
          doSpeak();
        }
      });
    } catch (err) {
      this._pendingResolve = null;
      this._utteranceStarted = false;
      console.warn('[BibleTTS] Speak error:', err);
    }
  }

  // ── Backend Edge TTS playback (react-native-sound) ────────────────────────
  private async _speakViaBackend(cleanText: string, verseNum: number): Promise<void> {
    this._currentVerseNum = verseNum;
    this.state.currentText = cleanText;
    this.state.wordIndex = -1;
    this.state.currentVerseNum = verseNum;

    const spanRe = /\S+/g;
    let sm: RegExpExecArray | null;
    const spans: Array<{ start: number; end: number }> = [];
    while ((sm = spanRe.exec(cleanText)) !== null) {
      spans.push({ start: sm.index, end: sm.index + sm[0].length });
    }
    this._cleanVerseWordSpans = spans;
    this._cleanPrefixCharLen = 0;

    const verseWords = cleanText.match(/\S+/g) ?? [];
    this._pendingWordData = { prefixWords: [], verseWords };

    // ── Use prefetched file if it matches, otherwise fetch now ──────────────
    let filePath: string;

    if (this._prefetchedFile && this._prefetchedText === cleanText) {
      filePath = this._prefetchedFile;
      this._prefetchedFile = null;
      this._prefetchedText = null;
    } else {
      // No prefetch hit — clean up stale prefetch and fetch synchronously
      if (this._prefetchedFile) {
        RNFS.unlink(this._prefetchedFile).catch(() => {});
        this._prefetchedFile = null;
        this._prefetchedText = null;
      }

      const arrayBuffer = await ttsService.speak(
        cleanText,
        this._edgeVoiceId || DEFAULT_EDGE_VOICE_ID,
        this.currentRate,
      );
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Backend returned empty audio');
      }
      const base64 = fromByteArray(new Uint8Array(arrayBuffer));
      filePath = `${RNFS.CachesDirectoryPath}/tts_${Date.now()}.mp3`;
      await RNFS.writeFile(filePath, base64, 'base64');
    }

    // ── Play ────────────────────────────────────────────────────────────────
    return new Promise<void>((resolve, reject) => {
      if (this.stopRequested) {
        RNFS.unlink(filePath).catch(() => {});
        resolve();
        return;
      }

      this._isTtsSpeaking = true;
      this.setState({
        isPlaying: true,
        isPaused: false,
        tier: 'device',
        currentVerseNum: verseNum,
      });

      this._clearWordTimers();
      this._startWordTimers();

      const playStartTime = Date.now();

      const sound = new Sound(filePath, '', (error) => {
        if (error) {
          console.warn('[BibleTTS] react-native-sound load error:', error);
          this._isTtsSpeaking = false;
          this._clearWordTimers();
          this.state.wordIndex = -1;
          this.setState({ isPlaying: false, isPaused: false, tier: 'idle', currentVerseNum: -1 });
          RNFS.unlink(filePath).catch(() => {});
          reject(new Error('Sound load failed'));
          return;
        }

        sound.play((success) => {
          const playDuration = Date.now() - playStartTime;
          sound.release();
          this._edgeSound = null;
          this._isTtsSpeaking = false;
          this._clearWordTimers();
          this.state.wordIndex = -1;
          this.setState({ isPlaying: false, isPaused: false, tier: 'idle', currentVerseNum: -1 });
          RNFS.unlink(filePath).catch(() => {});

          if (!success || (playDuration < 500 && cleanText.length > 5)) {
            reject(new Error('Silent or failed playback (' + playDuration + 'ms)'));
          } else {
            resolve();
          }
        });
      });

      this._edgeSound = sound;
    });
  }

  // ── Public narration API ──────────────────────────────────────────────────

  async speakVerses(
    verses: Array<{ num: number; text: string }>,
    book: string,
    chapter: number,
    opts: { announceLocation?: boolean; announceVerseNumbers?: boolean } = {},
  ): Promise<void> {
    if (!verses.length) return;

    const announce = opts.announceLocation ?? verses.length === 1;
    const readVerseNums = opts.announceVerseNumbers ?? false;

    let fullText: string;
    let prefixRaw = '';
    let verseNum: number;

    if (verses.length === 1) {
      const v = verses[0];
      verseNum = v.num;
      if (announce) {
        prefixRaw = `${book}, chapter ${chapter}. `;
        fullText = readVerseNums
          ? `${prefixRaw}verse ${v.num}. ${v.text}`
          : `${prefixRaw}${v.text}`;
      } else {
        fullText = readVerseNums
          ? `${v.num}. ${v.text}`
          : v.text;
      }
    } else {
      verseNum = verses[0].num;
      const joinedText = readVerseNums
        ? verses.map(v => `verse ${v.num}. ${v.text}`).join(' ').replace(/\s{2,}/g, ' ').trim()
        : verses.map(v => v.text).join(' ').replace(/\s{2,}/g, ' ').trim();
      if (announce) {
        prefixRaw = `${book}, chapter ${chapter}. `;
        fullText = `${prefixRaw}${joinedText}`;
      } else {
        fullText = joinedText;
      }
    }

    const cleanedFull = this.prepareText(fullText);
    let prefixLen = 0;
    if (prefixRaw) {
      const cleanedPrefix = this.prepareText(prefixRaw);
      if (cleanedFull.startsWith(cleanedPrefix)) {
        prefixLen = cleanedPrefix.length;
      } else {
        const firstWord = cleanedFull.match(/\S+/);
        if (firstWord) {
          const idx = cleanedFull.indexOf(firstWord[0], Math.max(0, cleanedPrefix.length - 5));
          prefixLen = idx >= 0 ? idx : 0;
        }
      }
    }

    await this.speak(fullText, prefixLen, 0, undefined, false, verseNum);
  }

  async speakVerseOfDay(text: string, reference: string): Promise<void> {
    if (!text) return;
    await this.stop();
    const prefixRaw = `Verse of the day.  ${reference}.   `;
    const fullText = `${prefixRaw}${text}.   ${reference}.`;
    const cleanFull = this.prepareText(fullText);
    const cleanPfx = this.prepareText(prefixRaw);
    const searchFrom = Math.max(0, cleanPfx.length - 2);
    const firstWord = (this.prepareText(text).match(/\S+/) ?? [''])[0];
    const verseStart = firstWord ? cleanFull.indexOf(firstWord, searchFrom) : 0;
    const prefixLen = verseStart >= 0 ? verseStart : 0;
    await this.speak(fullText, prefixLen);
  }

  async prefetchAudio(text: string): Promise<void> {
    if (!this._edgeEnabled) return;
    const cleanText = this.prepareText(text);
    if (this._prefetchedText === cleanText) return;

    try {
      const arrayBuffer = await ttsService.speak(
        cleanText,
        this._edgeVoiceId || DEFAULT_EDGE_VOICE_ID,
        this.currentRate,
      );
      if (!arrayBuffer || arrayBuffer.byteLength === 0) return;

      if (this._prefetchedFile) {
        RNFS.unlink(this._prefetchedFile).catch(() => {});
      }

      const base64 = fromByteArray(new Uint8Array(arrayBuffer));
      const filePath = `${RNFS.CachesDirectoryPath}/tts_prefetch.mp3`;
      await RNFS.writeFile(filePath, base64, 'base64');
      this._prefetchedFile = filePath;
      this._prefetchedText = cleanText;
    } catch {
      // silent — _speakViaBackend will fetch normally
    }
  }

  // ── Playback controls ─────────────────────────────────────────────────────

  private _pausedWordIndex: number = -1;

  async pause(): Promise<void> {
    if (!this.state.isPlaying || this.state.isPaused) return;

    // If using Edge TTS (react-native-sound), pause the sound directly
    if (this._edgeSound) {
      try {
        this._edgeSound.pause();
      } catch {}
      this._clearWordTimers();
      this._pausedWordIndex = this.state.wordIndex;
      this._pausedText = this.state.currentText;
      this._pausedVerseNum = this._currentVerseNum;
      this._pauseInProgress = true;
      this.setState({
        isPaused: true,
        isPlaying: false,
        tier: 'device',
        currentVerseNum: this._currentVerseNum,
      });
      this._pauseInProgress = false;
      return;
    }

    this._pausedWordIndex = this.state.wordIndex;
    this._pausedPrefixLen = this._cleanPrefixCharLen;
    this._pausedBaseWordIndex = this._baseWordIndex;
    this._pausedText = this.state.currentText;
    this._pausedVerseNum = this._currentVerseNum;
    this._pausedAbsoluteCharPos =
      this._lastRawCharIndex >= 0
        ? Math.max(this._cleanPrefixCharLen, this._lastRawCharIndex)
        : -1;
    this._pauseInProgress = true;
    console.log(
      '[BibleTTS] pause() saving: wordIndex=',
      this.state.wordIndex,
      'prefixLen=',
      this._cleanPrefixCharLen,
      'baseWordIndex=',
      this._baseWordIndex,
      'lastRawCharIndex=',
      this._lastRawCharIndex,
      'pausedAbsoluteCharPos=',
      this._pausedAbsoluteCharPos,
      'spans.length=',
      this._cleanVerseWordSpans.length,
      'textLen=',
      this.state.currentText.length,
    );
    try {
      await Tts.stop();
      this.setState({
        isPaused: true,
        isPlaying: false,
        tier: 'device',
        currentVerseNum: this._currentVerseNum,
      });
    } catch (err) {
      console.warn('[BibleTTS] Pause error:', err);
    } finally {
      this._pauseInProgress = false;
    }
  }

  get hasPausedText(): boolean {
    return this._pausedText.length > 0;
  }

  async resume(): Promise<void> {
    // If using Edge TTS (react-native-sound), resume the sound directly
    if (this._edgeSound && this.state.isPaused) {
      try {
        this._edgeSound.play();
      } catch {}
      this.setState({ isPaused: false, isPlaying: true, currentVerseNum: this._currentVerseNum });
      return;
    }

    if (!this._pausedText) return;

    const cleanedText = this._pausedText;
    const prefixLen = this._pausedPrefixLen;
    const pausedWordIdx = this._pausedWordIndex;
    const pausedBaseIdx = this._pausedBaseWordIndex;
    const pausedCharPos = this._pausedAbsoluteCharPos;
    const pausedVerseNum = this._pausedVerseNum;

    this._pausedText = '';
    this._pausedPrefixLen = 0;
    this._pausedWordIndex = -1;
    this._pausedBaseWordIndex = 0;
    this._pausedAbsoluteCharPos = -1;
    this._pausedVerseNum = -1;

    this.setState({ isPaused: false, currentVerseNum: pausedVerseNum });

    try {
      if (pausedCharPos > prefixLen) {
        let snapPos = pausedCharPos;
        while (snapPos > prefixLen && !/\s/.test(cleanedText[snapPos - 1])) {
          snapPos--;
        }
        while (
          snapPos < cleanedText.length &&
          /\s/.test(cleanedText[snapPos])
        ) {
          snapPos++;
        }

        const resumeText = cleanedText.slice(snapPos).trim();
        console.log(
          '[BibleTTS] resume() strategy1: charPos=',
          pausedCharPos,
          'snapPos=',
          snapPos,
          'text=',
          resumeText.substring(0, 60),
        );

        if (resumeText.length > 0) {
          await this.speak(
            resumeText,
            0,
            pausedWordIdx,
            undefined,
            true,
            pausedVerseNum,
          );
          return;
        }
      }

      const spans = this._cleanVerseWordSpans;
      const verseOnlyIdx = pausedWordIdx - pausedBaseIdx;

      console.log(
        '[BibleTTS] resume() strategy2: pausedWordIdx=',
        pausedWordIdx,
        'verseOnlyIdx=',
        verseOnlyIdx,
        'spans.length=',
        spans.length,
      );

      if (
        pausedWordIdx >= 0 &&
        spans.length > 0 &&
        verseOnlyIdx >= 0 &&
        verseOnlyIdx < spans.length
      ) {
        const absoluteCharPos = prefixLen + spans[verseOnlyIdx].start;
        const resumeText = cleanedText.slice(absoluteCharPos).trim();

        console.log(
          '[BibleTTS] resume() strategy2: absoluteCharPos=',
          absoluteCharPos,
          'text=',
          resumeText.substring(0, 60),
        );

        if (resumeText.length > 0) {
          await this.speak(
            resumeText,
            0,
            pausedWordIdx,
            undefined,
            true,
            pausedVerseNum,
          );
          return;
        }
      }

      console.log('[BibleTTS] resume(): falling back to verse start');
      const verseText = cleanedText.slice(prefixLen).trim();
      await this.speak(
        verseText.length > 0 ? verseText : cleanedText,
        0,
        0,
        undefined,
        true,
        pausedVerseNum,
      );
    } catch (err) {
      console.warn('[BibleTTS] Resume error:', err);
    }
  }

  async stop(): Promise<void> {
    try {
      this.stopRequested = true;
      this._isTtsSpeaking = false;
      this._activeUtteranceId = null;
      this._pauseInProgress = false;
      this._pausedText = '';
      this._pausedPrefixLen = 0;
      this._pausedWordIndex = -1;
      this._pausedBaseWordIndex = 0;
      this._pausedAbsoluteCharPos = -1;
      this._pausedVerseNum = -1;
      this._clearUtteranceTimeout();
      this._clearWordTimers();
      this.state.wordIndex = -1;

      // Clean up any prefetched file
      if (this._prefetchedFile) {
        RNFS.unlink(this._prefetchedFile).catch(() => {});
        this._prefetchedFile = null;
        this._prefetchedText = null;
      }

      // Stop Edge TTS sound if playing
      if (this._edgeSound) {
        try {
          this._edgeSound.stop();
          this._edgeSound.release();
        } catch {}
        this._edgeSound = null;
      }
      const edgeResolve = this._edgePendingResolve;
      this._edgePendingResolve = null;
      edgeResolve?.();

      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      this._utteranceStarted = false;
      resolve?.();

      if (Tts) await Tts.stop();

      this.setState({
        isPlaying: false,
        isPaused: false,
        currentPosition: 0,
        currentText: '',
        usingCloudVoice: false,
        tier: 'idle',
        currentVerseNum: -1,
      });
    } catch (err) {
      console.warn('[BibleTTS] Stop error:', err);
    }
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async setRate(rate: number): Promise<void> {
    this.currentRate = Math.max(0.1, Math.min(2.0, rate));
    this._rateCustomized = true;
    await AsyncStorage.setItem(
      STORAGE_KEYS.rate,
      String(this.currentRate),
    ).catch(() => {});
    try {
      if (Tts) await Tts.setDefaultRate(this.currentRate);
    } catch {}
  }

  async setPitch(pitch: number): Promise<void> {
    this.currentPitch = Math.max(0.5, Math.min(2.0, pitch));
    this._pitchCustomized = true;
    await AsyncStorage.setItem(
      STORAGE_KEYS.pitch,
      String(this.currentPitch),
    ).catch(() => {});
    try {
      if (Tts) await Tts.setDefaultPitch(this.currentPitch);
    } catch {}
  }

  async setVoice(voiceId: string): Promise<void> {
    if (!voiceId) return;
    this.currentDeviceVoiceId = voiceId;
    this.initialized = false;
    await AsyncStorage.setItem(STORAGE_KEYS.deviceVoice, voiceId).catch(
      () => {},
    );
    try {
      if (Tts) await Tts.setDefaultVoice(voiceId);
    } catch {}
  }

  async applySettings(opts: {
    rate?: number;
    pitch?: number;
    deviceVoiceId?: string;
    elevenVoiceId?: string;
    elevenKey?: string;
  }): Promise<void> {
    if (opts.rate !== undefined) await this.setRate(opts.rate);
    if (opts.pitch !== undefined) await this.setPitch(opts.pitch);
    if (opts.deviceVoiceId !== undefined)
      await this.setVoice(opts.deviceVoiceId);
  }

  // ── Edge TTS public API ──────────────────────────────────────────────────

  async setEdgeVoice(voiceId: string): Promise<void> {
    if (!voiceId) return;
    this._edgeVoiceId = voiceId;
    await AsyncStorage.setItem(STORAGE_KEYS_EDGE.edgeVoiceId, voiceId).catch(() => {});
  }

  setEdgeEnabled(enabled: boolean): void {
    this._edgeEnabled = enabled;
  }

  get edgeEnabled(): boolean {
    return this._edgeEnabled;
  }

  get edgeVoiceId(): string {
    return this._edgeVoiceId;
  }

  // ── Public getters ────────────────────────────────────────────────────────

  getCurrentRate(): number {
    return this.currentRate;
  }
  getCurrentPitch(): number {
    return this.currentPitch;
  }
  getCurrentVoiceId(): string | null {
    return this.currentDeviceVoiceId;
  }

  isRateCustomized(): boolean {
    return this._rateCustomized;
  }
  isPitchCustomized(): boolean {
    return this._pitchCustomized;
  }

  async resetRate(): Promise<void> {
    this._rateCustomized = false;
    this.currentRate = DEFAULT_RATE;
    await AsyncStorage.removeItem(STORAGE_KEYS.rate).catch(() => {});
    this.initialized = false;
  }

  async resetPitch(): Promise<void> {
    this._pitchCustomized = false;
    this.currentPitch = DEFAULT_PITCH;
    await AsyncStorage.removeItem(STORAGE_KEYS.pitch).catch(() => {});
    this.initialized = false;
  }

  async getDeviceVoices(): Promise<DeviceVoice[]> {
    try {
      const all = await Tts.voices();
      const english = all.filter(v => {
        if (!v.language?.toLowerCase().startsWith('en')) return false;
        if (v.notInstalled === true) return false;
        return true;
      });
      return english.map(v => ({
        id: v.id,
        name: v.name ?? v.id,
        language: v.language ?? 'en',
        quality: (() => {
          const id = v.id ?? '';
          const name = v.name ?? '';
          if (
            id.includes('network') ||
            v.networkConnectionRequired ||
            name.toLowerCase().includes('neural')
          )
            return 'neural';
          if (
            id.includes('premium') ||
            id.includes('enhanced') ||
            name.toLowerCase().includes('premium') ||
            name.toLowerCase().includes('enhanced')
          )
            return 'enhanced';
          if (
            id.startsWith('com.apple.speech.synthesis.voice.') &&
            id.endsWith('.premium')
          )
            return 'enhanced';
          return 'local';
        })(),
      }));
    } catch {
      return [];
    }
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener: (state: TTSState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  getState(): TTSState {
    return { ...this.state };
  }

  get isUsingCloudVoice(): boolean {
    return false;
  }
  get hasElevenLabs(): boolean {
    return false;
  }

  cleanup(): void {
    if (!Tts) return;
    this._clearUtteranceTimeout();
    this._clearWordTimers();
    Tts.removeAllListeners('tts-start');
    Tts.removeAllListeners('tts-progress');
    Tts.removeAllListeners('tts-finish');
    Tts.removeAllListeners('tts-cancel');
  }

  async clearAudioCache(): Promise<void> {}
  async getCacheSize(): Promise<string> {
    return 'N/A (device TTS)';
  }

  setElevenLabsKey(_key: string): void {}
  setElevenLabsVoice(_id: string): void {}
}

export const bibleTTS = new BibleTTSManager();

export const initBibleTTS = () => bibleTTS.init();
export const speak = (text: string) => bibleTTS.speak(text);
export const stop = () => bibleTTS.stop();
export const pause = () => bibleTTS.pause();
export const resume = () => bibleTTS.resume();