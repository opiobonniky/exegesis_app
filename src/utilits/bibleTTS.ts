import Tts from 'react-native-tts';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  rate: 'tts_rate',
  pitch: 'tts_pitch',
  deviceVoice: 'tts_device_voice',
};

// ─── Narration defaults ───────────────────────────────────────────────────────
const DEFAULT_RATE = 1;
const DEFAULT_PITCH = 0.95;

const PREFERRED_VOICES: string[] =
  Platform.select({
    ios: [
      'com.apple.voice.premium.en-GB.Daniel',
      'com.apple.voice.premium.en-US.Zoe',
      'com.apple.voice.premium.en-US.Evan',
      'com.apple.voice.enhanced.en-GB.Daniel',
      'com.apple.voice.enhanced.en-US.Samantha',
      'com.apple.voice.enhanced.en-US.Alex',
    ],
    android: [
      // Android 14+ Google TTS voices (new ID format in API 34)
      'en-us-x-iom-network',
      'en-us-x-iom-local',
      'en-us-x-sfg-network',
      'en-us-x-sfg-local',
      'en-us-x-tpf-network',
      'en-us-x-tpf-local',
      'en-gb-x-gbd-network',
      'en-gb-x-gbd-local',
      // Samsung TTS (common on Android 14 OEM devices)
      'en-us-x-sfg#f_st_1-local',
      'en-us-x-iom#f_st_1-local',
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

  constructor() {
    this.setupListeners();
    void this.loadSavedSettings();
  }

  // ── Device TTS event listeners ────────────────────────────────────────────
  private setupListeners() {
    if (!Tts) return;

    // ── tts-start ─────────────────────────────────────────────────────────────
    Tts.addEventListener('tts-start', () => {
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
    //
    Tts.addEventListener('tts-progress', (e: any) => {
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
    Tts.addEventListener('tts-finish', () => {
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
    Tts.addEventListener('tts-cancel', () => {
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
      const match = english.find(v => v.id === id || v.id?.includes(id));
      if (match) return match.id;
    }

    const neural = english.find(
      v => v.id?.includes('network') || v.networkConnectionRequired,
    );
    if (neural) return neural.id;

    const quality = english.find(
      v => v.id?.includes('premium') || v.id?.includes('enhanced'),
    );
    if (quality) return quality.id;

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

    // Timer fallback word data — verseWords are relative to verse start (index 0),
    // matching _cleanVerseWordSpans[0] as the first word of the verse.
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
        // ── IMPORTANT: delay setting _pendingResolve if we must stop first ─────
        // When the previous utterance is still speaking, Tts.stop() fires
        // tts-cancel for the OLD utterance. If _pendingResolve is already set,
        // the cancel handler resolves the NEW promise prematurely — before the
        // new verse has started speaking. This causes speakVerseAtIndex to run
        // its auto-advance logic early, skipping verses and breaking sync.
        // Fix: only set _pendingResolve after Tts.stop() completes.
        // ──────────────────────────────────────────────────────────────────────

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

          // Android 14 safety net: if the engine drops the utterance silently
          // (no finish/cancel within 30 s) we resolve anyway so the loop moves on.
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
            .then(() => console.log('[BibleTTS] Tts.speak resolved'))
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
          // Don't set _pendingResolve yet — wait for stop to complete first
          // to prevent the old utterance's tts-cancel from resolving this promise.
          Tts.stop()
            .then(doSpeak)
            .catch(() => {
              // Android 14 can throw "IllegalStateException: not speaking" here.
              // The engine isn't speaking, so there's nothing to stop — just
              // speak the new text directly. NEVER resolve without speaking,
              // otherwise speakVerseAtIndex will auto-advance before audio starts.
              this._isTtsSpeaking = false;
              this.initialized = false; // force re-init: engine state may be corrupt
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

  // ── Public narration API ──────────────────────────────────────────────────

  async speakVerses(
    verses: Array<{ num: number; text: string }>,
    book: string,
    chapter: number,
    opts: { announceLocation?: boolean } = {},
  ): Promise<void> {
    if (!verses.length) return;

    const announce = opts.announceLocation ?? verses.length === 1;

    let fullText: string;
    // prefixRaw is the raw prefix string before prepareText — we clean it
    // separately to find where the verse starts in the cleaned full string
    // without relying on indexOf(firstWord) which can match inside the prefix
    // (e.g. verse starting with "God" when prefix contains "God").
    let prefixRaw: string;

    if (verses.length === 1) {
      const v = verses[0];
      prefixRaw = announce
        ? `${book}, chapter ${chapter}, verse ${v.num}. `
        : `${v.num}. `;
      fullText = `${prefixRaw}${v.text}`;
    } else {
      prefixRaw = announce
        ? `${book}, chapter ${chapter}. verse ${verses[0].num}. `
        : '';
      fullText = announce
        ? `${book}, chapter ${chapter}. ` +
          verses
            .map((v, i) =>
              i === 0 ? `verse ${v.num}. ${v.text}` : `${v.num}. ${v.text}`,
            )
            .join(' ')
        : verses.map(v => `${v.num}. ${v.text}`).join(' ');
    }

    const cleanedFull = this.prepareText(fullText);

    // BUG FIX: search for the first verse word starting AFTER the prefix area,
    // not from the beginning of the string. This prevents a false match when
    // the verse opens with a word that also appears in the prefix (e.g. "God",
    // "Genesis", "Lord").
    const cleanedPrefix = this.prepareText(prefixRaw);
    const searchFrom = Math.max(0, cleanedPrefix.length - 2);

    const verseOnlyRaw =
      verses.length === 1
        ? verses[0].text
        : verses.map(v => `${v.num}. ${v.text}`).join(' ');
    const cleanedVerseOnly = this.prepareText(verseOnlyRaw);

    const firstVerseWord = (cleanedVerseOnly.match(/\S+/) ?? [''])[0];
    const verseStartInFull = firstVerseWord
      ? cleanedFull.indexOf(firstVerseWord, announce ? searchFrom : 0)
      : 0;

    const prefixLen = Math.max(
      0,
      verseStartInFull >= 0
        ? verseStartInFull
        : cleanedFull.length - cleanedVerseOnly.length,
    );

    const verseNum = verses.length === 1 ? verses[0].num : verses[0].num;
    await this.speak(fullText, prefixLen, 0, undefined, false, verseNum);
  }

  async speakVerseOfDay(text: string, reference: string): Promise<void> {
    if (!text) return;
    await this.stop();
    // Compute prefixLen so word-highlighting begins at [text], not at the
    // "Verse of the day / reference" announcement.
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

  async prefetchAudio(_text: string): Promise<void> {
    return;
  }

  // ── Playback controls ─────────────────────────────────────────────────────

  private _pausedWordIndex: number = -1;

  async pause(): Promise<void> {
    if (!this.state.isPlaying || this.state.isPaused) return;
    this._pausedWordIndex = this.state.wordIndex;
    this._pausedPrefixLen = this._cleanPrefixCharLen;
    this._pausedBaseWordIndex = this._baseWordIndex;
    this._pausedText = this.state.currentText;
    this._pausedVerseNum = this._currentVerseNum;
    // Save the absolute char position from the last engine progress event.
    // _lastRawCharIndex is the raw engine charIndex (into the full clean string).
    // _charIndexBase = -prefixLen, so absoluteCharPos = _lastRawCharIndex - prefixLen...
    // but we want the position in the full cleanedText, so:
    //   absoluteCharPos = _lastRawCharIndex  (it's already an index into cleanedText)
    // We clamp to prefixLen so we never resume inside the announcement prefix.
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
      // tts-cancel may have already set isPaused:true via the event handler.
      // Either way, ensure the final state is correct before clearing the flag.
      this.setState({
        isPaused: true,
        isPlaying: false,
        tier: 'device',
        currentVerseNum: this._currentVerseNum,
      });
    } catch (err) {
      console.warn('[BibleTTS] Pause error:', err);
    } finally {
      // Always clear the flag so future cancels are not mis-identified as pauses.
      this._pauseInProgress = false;
    }
  }

  get hasPausedText(): boolean {
    return this._pausedText.length > 0;
  }

  async resume(): Promise<void> {
    // _pausedText is set synchronously in pause() before Tts.stop(), so it is
    // always available even if state.isPaused has not been confirmed yet.
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
      // ── Strategy 1: use the raw engine char position (most accurate) ────────
      // pausedCharPos is the last charIndex the TTS engine reported before we
      // called stop().  It is an absolute index into cleanedText.
      // We snap backwards to the nearest word boundary so we never start
      // mid-word, then resume from there.
      if (pausedCharPos > prefixLen) {
        // Find the word boundary at or before pausedCharPos.
        // Walk backwards from pausedCharPos until we hit whitespace or the
        // verse start, then take the next non-space character.
        let snapPos = pausedCharPos;
        // Step back to the start of the current word if we're inside one.
        while (snapPos > prefixLen && !/\s/.test(cleanedText[snapPos - 1])) {
          snapPos--;
        }
        // snapPos now points to the start of the word the engine was on.
        // If we overshot to whitespace, step forward to the next word.
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
          // FIX: pass pausedWordIdx as baseWordIndex so the highlight continues
          // from the paused word, not from word 0 of the verse.
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

      // ── Strategy 2: use the word index from tts-progress / timer ────────────
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
          // FIX: pausedWordIdx is the absolute verse-word index at pause time.
          // Passing it as baseWordIndex means tts-progress/timer indices are
          // added on top of it → state.wordIndex stays aligned with wordMap[].
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

      // ── Strategy 3: fallback — restart from verse start (skip prefix) ───────
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

  // ── Public getters (used by VoiceSettings screen) ─────────────────────────

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

  /** Clear the saved rate preference and let the device engine use its own default. */
  async resetRate(): Promise<void> {
    this._rateCustomized = false;
    this.currentRate = DEFAULT_RATE; // in-memory sentinel only
    await AsyncStorage.removeItem(STORAGE_KEYS.rate).catch(() => {});
    // Don't push anything to the engine — it will revert to its own default
    // on the next init() call (which happens on next speak()).
    this.initialized = false;
  }

  /** Clear the saved pitch preference and let the device engine use its own default. */
  async resetPitch(): Promise<void> {
    this._pitchCustomized = false;
    this.currentPitch = DEFAULT_PITCH; // in-memory sentinel only
    await AsyncStorage.removeItem(STORAGE_KEYS.pitch).catch(() => {});
    this.initialized = false;
  }

  async getDeviceVoices(): Promise<DeviceVoice[]> {
    try {
      const all = await Tts.voices();
      const english = all.filter(v => {
        if (!v.language?.toLowerCase().startsWith('en')) return false;
        // Android 14: filter out voices that are listed but not yet downloaded.
        // Showing them in UI and then selecting them causes silent TTS failure.
        if (v.notInstalled === true) return false;
        return true;
      });
      return english.map(v => ({
        id: v.id,
        name: v.name ?? v.id,
        language: v.language ?? 'en',
        quality:
          v.id?.includes('network') || v.networkConnectionRequired
            ? 'neural'
            : v.id?.includes('premium') || v.id?.includes('enhanced')
              ? 'enhanced'
              : 'local',
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
