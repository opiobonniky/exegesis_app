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
const DEFAULT_RATE = 0.5;
const DEFAULT_PITCH = 0.92;

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
  };

  private listeners: Array<(state: TTSState) => void> = [];
  private initialized = false;
  private currentRate = DEFAULT_RATE;
  private currentPitch = DEFAULT_PITCH;
  private currentDeviceVoiceId: string | null = null;

  // The index of the first word in the current utterance relative to the full verse.
  // Used to ensure wordIndex remains absolute during mid-verse resumes.
  private _baseWordIndex = 0;

  // Whether the user has explicitly saved a rate/pitch preference.
  // When false the engine is left at its own device default — we never push
  // our hardcoded DEFAULT_RATE / DEFAULT_PITCH onto the engine on first launch.
  private _rateCustomized = false;
  private _pitchCustomized = false;

  private stopRequested = false;
  private _pendingResolve: (() => void) | null = null;
  private _utteranceStarted = false;
  private _isTtsSpeaking = false;
  // True while pause() is executing Tts.stop() so tts-cancel knows not to
  // reset isPaused state — pause() will set it correctly after stop resolves.
  private _isPauseStop = false;

  // ── Pause / resume state ──────────────────────────────────────────────────
  //
  // BUG FIX: pause() calls Tts.stop(), which fires tts-cancel, which wipes
  // state.currentText before resume() can read it. We save what we need here
  // before the stop happens.
  //
  private _pausedText = '';
  private _pausedPrefixLen = 0;
  private _pausedWordIndex = -1;

  // ── Timer-based word highlighting (fallback) ──────────────────────────────
  private _wordTimers: ReturnType<typeof setTimeout>[] = [];
  private _timersStarted = false;
  private _pendingWordData: {
    prefixWords: string[];
    verseWords: string[];
  } | null = null;

  // ── Progress-event-based highlighting (primary, Android + iOS) ────────────
  //
  // Strategy:
  //   1. Subscribe to `tts-progress` (fires with charIndex on each word boundary).
  //   2. Map charIndex to a word index in the VERSE portion of the clean text.
  //   3. On the first progress event, cancel the timer fallback — engine events
  //      are more accurate than estimated timers.
  //   4. If no progress event ever arrives (some iOS voices), the timers that
  //      were started in tts-start keep running unchanged.
  //
  private _cleanPrefixCharLen = 0;
  private _cleanVerseWordSpans: Array<{ start: number; end: number }> = [];
  private _progressEventsFired = 0;

  // ── Android chunk-restart tracking ───────────────────────────────────────
  //
  // Some Android TTS engines silently split long utterances into internal
  // chunks at clause boundaries (commas). When a new chunk begins, charIndex
  // RESETS TO 0. Without this fix every progress event from chunk 2 onward
  // satisfies charIndex < _cleanPrefixCharLen and is discarded, causing
  // word highlighting to freeze mid-verse.
  //
  // Fix: track the previous raw charIndex. A significant drop (>20 chars)
  // means a new chunk started. Recalculate _charIndexBase so that charIndex=0
  // in the new chunk maps to the correct next verse word.
  //
  //   resolvedVerseOffset = charIndex + _charIndexBase
  //
  // Initial value = -_cleanPrefixCharLen so the formula is identical to the
  // original  charIndex - _cleanPrefixCharLen  for the very first chunk.
  //
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
      this.setState({ isPlaying: true, isPaused: false, tier: 'device' });

      // Start timer-based highlighting as a fallback. Cancelled on the first
      // tts-progress event if the engine supports word-boundary callbacks.
      if (!this._timersStarted) {
        this._startWordTimers();
      }
    });

    // ── tts-progress ──────────────────────────────────────────────────────────
    //
    // react-native-tts fires this on every spoken word with the char position
    // in the string passed to Tts.speak(). Used as primary source of truth;
    // timers are discarded the moment the first event arrives.
    //
    Tts.addEventListener('tts-progress', (e: any) => {
      if (this.stopRequested) return;

      // Android 14 (API 34) changed the progress event shape:
      //   - e.charIndex is REMOVED; only e.start (and e.end) are present.
      //   - e.start is the UTF-16 code-unit offset of the first char of the word.
      //   - e.end is exclusive end. We use it to validate the span when available.
      // On older Android / iOS, e.charIndex is the canonical field.
      // Normalise to a single variable that works across all API levels.
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

      // ── Chunk-restart detection (Android) ──────────────────────────────────
      // A significant drop in charIndex means the engine started a new internal
      // chunk. Update _charIndexBase so charIndex=0 in the new chunk maps to
      // the correct next verse word rather than landing inside the prefix.
      if (
        this._progressEventsFired > 0 &&
        charIndex < this._lastRawCharIndex - 20
      ) {
        // Android chunk restart: charIndex resets to 0 for the new chunk.
        // We need: charIndex(=0) + _charIndexBase = spans[nextWordIdx].start
        // spans are verse-local, so _charIndexBase = spans[nextWordIdx].start
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
      });
      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      this._utteranceStarted = false;
      resolve?.();
    });

    // ── tts-cancel ────────────────────────────────────────────────────────────
    Tts.addEventListener('tts-cancel', () => {
      console.log(
        '[BibleTTS] tts-cancel event fired, _isPauseStop:',
        this._isPauseStop,
      );
      this._isTtsSpeaking = false;
      this._clearUtteranceTimeout();
      this._clearWordTimers();
      this.state.wordIndex = -1;

      // BUG FIX: capture and clear _pendingResolve BEFORE any early return so
      // the promise never leaks regardless of _utteranceStarted state.
      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      const wasStarted = this._utteranceStarted;
      this._utteranceStarted = false;

      // BUG FIX: if this cancel was triggered by pause() calling Tts.stop(),
      // do NOT reset isPaused/isPlaying here — pause() will set
      // { isPaused: true, isPlaying: false } itself after Tts.stop() resolves.
      // Overwriting with isPaused:false here is a race that breaks resume().
      if (this._isPauseStop) {
        resolve?.();
        return;
      }

      if (!wasStarted) {
        // Cancel fired before speech began — resolve but don't touch
        // playing-state (it was never set to playing).
        resolve?.();
        return;
      }

      this.setState({
        isPlaying: false,
        isPaused: false,
        currentPosition: 0,
        tier: 'idle',
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

    this.stopRequested = false;
    const clean = this.prepareText(text);
    console.log('[BibleTTS] prepared text:', clean.substring(0, 50), '...');
    this.state.currentText = clean;
    this.state.wordIndex = -1;

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

    // Timer fallback word data
    // Use baseWordIndex to start highlighting from the correct word
    const allWords = clean.match(/\S+/g) ?? [];
    const prefixWordCount =
      prefixLen > 0
        ? (clean.slice(0, prefixLen).match(/\S+/g) ?? []).length
        : 0;
    this._pendingWordData = {
      prefixWords: allWords.slice(0, prefixWordCount),
      verseWords: allWords.slice(prefixWordCount),
    };
    
    // Update current word index to the baseWordIndex for visual highlighting
    this.state.wordIndex = baseWordIndex;

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
        this._pendingResolve = resolve;
        this._utteranceStarted = false;

        const doSpeak = () => {
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
          // Reset pause-stop guard right before starting new speech, so any
          // stale tts-cancel from the previous pause() that fires before this
          // point is still handled by the _isPauseStop guard.
          this._isPauseStop = false;
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
          Tts.stop()
            .then(doSpeak)
            .catch(() => {
              // Android 14 can throw "IllegalStateException: not speaking" here.
              // Mark engine as not speaking and force re-init on next call.
              this._isTtsSpeaking = false;
              this._clearUtteranceTimeout();
              this.initialized = false; // force re-init: engine state may be corrupt
              this._pendingResolve = null;
              this._utteranceStarted = false;
              resolve();
            });
        } else {
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

    await this.speak(fullText, prefixLen);
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

  async prefetchAudio(_text: string): Promise<void> {
    return;
  }

  // ── Playback controls ─────────────────────────────────────────────────────

  async pause(): Promise<void> {
    if (!this.state.isPlaying || this.state.isPaused) return;
    
    // Save the text and position for potential resume
    this._pausedText = this.state.currentText;
    this._pausedPrefixLen = this._cleanPrefixCharLen;
    this._pausedWordIndex = this.state.wordIndex;

    this._isPauseStop = true;
    try {
      await Tts.stop();
      // Clear the pending promise from the original speak() call so the
      // async tts-cancel (which may fire after this method returns) won't
      // resolve a stale _pendingResolve from the pre-pause utterance.
      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      resolve?.();
      
      this._isTtsSpeaking = false;
      this._clearWordTimers();
      this._clearUtteranceTimeout();
      this.state.wordIndex = -1;
      this.setState({ isPaused: true, isPlaying: false });
    } catch (err) {
      this._isTtsSpeaking = false;
      console.warn('[BibleTTS] Pause error:', err);
    }
  }

  async resume(): Promise<void> {
    // Use _pausedWordIndex as the source of truth for where we were paused
    // Note: The device TTS engine cannot seek mid-utterance, so this is
    // a logical position only. The actual audio will start from the beginning.
    // This gives visual feedback that the user is resuming, but the audio
    // will re-read from the beginning of the verse.
    if (!this._pausedText || this._pausedWordIndex === -1) return;
    
    const text = this._pausedText;
    const prefixLen = this._pausedPrefixLen;
    const baseWordIndex = this._pausedWordIndex;
    
    // Reset pause state
    this._pausedText = '';
    this._pausedPrefixLen = 0;
    this._pausedWordIndex = -1;
    
    try {
      // Set isPlaying:true immediately so the UI bar shows the Play button
      // transitioning back to Pause. This gives visual feedback that the user
      // is resuming.
      this.setState({ isPaused: false, isPlaying: true });
      
      // Speak the text with the baseWordIndex to start from the correct word
      // for visual highlighting, but the audio will always start from the beginning
      await this.speak(text, prefixLen, baseWordIndex);
    } catch (err) {
      console.warn('[BibleTTS] Resume error:', err);
    }
  }

  /** True if there is saved paused text and position that can be resumed. */
  get hasPausedText(): boolean {
    return !!this._pausedText && this._pausedWordIndex >= 0;
  }

  async stop(): Promise<void> {
    try {
      this.stopRequested = true;
      this._isPauseStop = false;
      this._isTtsSpeaking = false;
      this._pausedText = '';
      this._pausedPrefixLen = 0;
      this._pausedWordIndex = -1;
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
      });
    } catch (err) {
      console.warn('[BibleTTS] Stop error:', err);
    }
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async setRate(rate: number): Promise<void> {
    this.currentRate = Math.max(0.1, Math.min(1.0, rate));
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
