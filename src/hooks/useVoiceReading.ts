import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Animated } from 'react-native';
import { bibleTTS } from '../utilits/bibleTTS';
import { ttsService, TTSVoice } from '../services/ttsService';
import { computeWordMap, WordSpan } from '../utilits/bibleUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseVoiceReadingOptions {
  /** Verse text data keyed by verse number */
  verses: Record<number, string>;
  /** Ordered array of verses */
  versesArray: Array<{ num: number; text: string }>;
  currentBook: string;
  currentChapter: number;
  currentBookRef: React.MutableRefObject<string>;
  currentChapterRef: React.MutableRefObject<number>;
  flatListRef: React.RefObject<any>;
}

export interface VoiceReadingResult {
  // ── State ────────────────────────────────────────────────────────────────
  showAudioPlayer: boolean;
  activeAudioVerse: number | null;
  isAudioPaused: boolean;
  audioPlaylist: Array<{ num: number; text: string }>;
  audioVerseIndex: number;
  audioScope: 'chapter' | 'selection';
  afterPlayBehaviour: 'stop' | 'repeat_one' | 'repeat' | 'continue';
  speechRate: number;
  sleepTimerRemaining: number;
  activeVerseWordMap: WordSpan[] | null;
  currentVoiceId: string;
  voiceList: TTSVoice[];
  edgeEnabled: boolean;

  // ── Callbacks ────────────────────────────────────────────────────────────
  startReadingChapter: () => void;
  startReadingSelectedVerses: (selectedVerseNumbers: number[]) => void;
  handleAudioStop: () => Promise<void>;
  handleAudioTogglePlayPause: () => Promise<void>;
  goToNextSelectedVerse: () => Promise<void>;
  goToPreviousSelectedVerse: () => Promise<void>;
  onSpeedToggle: () => void;
  onSpeedReset: () => void;
  onSleepTimerToggle: () => void;
  handleAudioScopeChange: (scope: 'chapter' | 'selection') => void;
  handleAfterPlayChange: (
    behaviour: 'stop' | 'repeat_one' | 'repeat' | 'continue',
  ) => void;
  onVoiceSelect: (voiceId: string) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVoiceReading({
  verses,
  versesArray,
  currentBook,
  currentChapter,
  currentBookRef,
  currentChapterRef,
  flatListRef,
}: UseVoiceReadingOptions): VoiceReadingResult {
  // ── State ──────────────────────────────────────────────────────────────────
  const [showAudioPlayer, setShowAudioPlayer] = useState<boolean>(false);
  const [activeAudioVerse, setActiveAudioVerse] = useState<number | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState<boolean>(false);
  const [audioPlaylist, setAudioPlaylist] = useState<
    Array<{ num: number; text: string }>
  >([]);
  const [audioVerseIndex, setAudioVerseIndex] = useState<number>(0);
  const [audioScope, setAudioScope] = useState<'chapter' | 'selection'>(
    'chapter',
  );
  const [afterPlayBehaviour, setAfterPlayBehaviour] = useState<
    'stop' | 'repeat_one' | 'repeat' | 'continue'
  >('continue');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number>(0);
  const [currentVoiceId, setCurrentVoiceId] = useState<string>(
    bibleTTS.edgeVoiceId,
  );
  const [voiceList, setVoiceList] = useState<TTSVoice[]>([]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const audioPlaylistRef = useRef<Array<{ num: number; text: string }>>([]);
  const audioVerseIndexRef = useRef<number>(0);
  const audioScopeRef = useRef<'chapter' | 'selection'>('chapter');
  const afterPlayBehaviourRef = useRef<
    'stop' | 'repeat_one' | 'repeat' | 'continue'
  >('continue');

  const isPausedRef = useRef<boolean>(false);
  const stopRequestedRef = useRef<boolean>(false);
  const ttsActiveRef = useRef<boolean>(false);
  const confirmedAudioIndexRef = useRef<number>(-1);
  const lastTTSVerseNumRef = useRef<number | null>(null);
  const _userNavigatingRef = useRef<boolean>(false);
  const _targetVerseIndexRef = useRef<number>(-1);
  const _requestIdRef = useRef<number>(0);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs synced with state
  useEffect(() => {
    audioPlaylistRef.current = audioPlaylist;
  }, [audioPlaylist]);
  useEffect(() => {
    audioVerseIndexRef.current = audioVerseIndex;
  }, [audioVerseIndex]);
  useEffect(() => {
    audioScopeRef.current = audioScope;
  }, [audioScope]);
  useEffect(() => {
    afterPlayBehaviourRef.current = afterPlayBehaviour;
  }, [afterPlayBehaviour]);

  // ── Voice list + selection ─────────────────────────────────────────────────
  useEffect(() => {
    ttsService.getVoices().then(list => {
      if (list.length > 0) {
        setVoiceList(list);
        const saved = bibleTTS.edgeVoiceId;
        if (!list.find(v => v.voiceId === saved)) {
          setCurrentVoiceId(list[0].voiceId);
        }
      }
    });
  }, []);

  const onVoiceSelect = useCallback((voiceId: string) => {
    setCurrentVoiceId(voiceId);
    bibleTTS.setEdgeVoice(voiceId);
  }, []);

  // ── Active verse word map (for word-level highlighting) ────────────────────
  const activeVerseWordMap = useMemo((): WordSpan[] | null => {
    if (!activeAudioVerse || !verses[activeAudioVerse]) return null;
    return computeWordMap(verses[activeAudioVerse]);
  }, [activeAudioVerse, verses]);

  // ── TTS engine → UI sync ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = bibleTTS.subscribe(ttsState => {
      if (ttsState.isPlaying) {
        if (ttsState.currentVerseNum >= 0) {
          const idx = audioPlaylistRef.current.findIndex(
            v => v.num === ttsState.currentVerseNum,
          );
          if (idx >= 0) {
            confirmedAudioIndexRef.current = idx;
            if (ttsState.currentVerseNum !== lastTTSVerseNumRef.current) {
              lastTTSVerseNumRef.current = ttsState.currentVerseNum;
              setActiveAudioVerse(ttsState.currentVerseNum);
              setAudioVerseIndex(idx);
            }
          }
        }
        setShowAudioPlayer(true);
        setIsAudioPaused(false);
      } else if (ttsState.isPaused) {
        setShowAudioPlayer(true);
        setIsAudioPaused(true);
      } else if (ttsState.tier === 'idle') {
        if (!isPausedRef.current && !ttsActiveRef.current) {
          setShowAudioPlayer(false);
          setIsAudioPaused(false);
        }
      }
    });
    return unsub;
  }, []);

  // ── Core verse playback loop ───────────────────────────────────────────────
  const speakVerseAtIndex = useCallback(
    async (index: number, fromUserNav = false) => {
      const requestId = _requestIdRef.current;

      const playlist = audioPlaylistRef.current;
      if (!playlist.length || index < 0 || index >= playlist.length) {
        ttsActiveRef.current = false;
        setShowAudioPlayer(false);
        setActiveAudioVerse(null);
        setIsAudioPaused(false);
        lastTTSVerseNumRef.current = null;
        return;
      }

      if (!fromUserNav && _userNavigatingRef.current) {
        _userNavigatingRef.current = false;
        return;
      }

      const verse = playlist[index];
      _targetVerseIndexRef.current = index;

      // Sync UI immediately
      audioVerseIndexRef.current = index;
      confirmedAudioIndexRef.current = index;
      setAudioVerseIndex(index);
      setActiveAudioVerse(verse.num);
      lastTTSVerseNumRef.current = verse.num;

      // Scroll verse into view
      flatListRef.current?.scrollToIndex({
        index: Math.max(0, index),
        animated: true,
        viewPosition: 0.3,
      });

      try {
        const speakPromise = bibleTTS.speakVerses(
          [verse],
          currentBookRef.current,
          currentChapterRef.current,
          {
            announceLocation:
              index === 0 && audioScopeRef.current === 'chapter',
          },
        );

        // Prefetch the next verse while current one plays (eliminates transition gap)
        const nextIndex = index + 1;
        if (nextIndex < playlist.length && bibleTTS.edgeEnabled) {
          const nextVerse = playlist[nextIndex];
          bibleTTS.prefetchAudio(nextVerse.text).catch(() => {});
        }

        await speakPromise;
      } catch (err) {
        console.warn('[useVoiceReading] speakVerses error:', err);
      }

      // ── Post-utterance decision ───────────────────────────────────────────
      if (isPausedRef.current) return;
      if (stopRequestedRef.current) return;

      if (
        _targetVerseIndexRef.current !== index ||
        requestId !== _requestIdRef.current
      ) {
        return;
      }

      const behaviour = afterPlayBehaviourRef.current;
      _userNavigatingRef.current = false;

      const next = index + 1;

      if (behaviour === 'repeat_one') {
        speakVerseAtIndex(index, false);
      } else if (behaviour === 'repeat' && next >= playlist.length) {
        _targetVerseIndexRef.current = 0;
        speakVerseAtIndex(0, false);
      } else if (behaviour === 'continue' && next < playlist.length) {
        speakVerseAtIndex(next, false);
      } else {
        ttsActiveRef.current = false;
        setShowAudioPlayer(false);
        setActiveAudioVerse(null);
        setAudioPlaylist([]);
        audioPlaylistRef.current = [];
        setAudioVerseIndex(0);
        audioVerseIndexRef.current = 0;
        confirmedAudioIndexRef.current = -1;
        setIsAudioPaused(false);
        lastTTSVerseNumRef.current = null;
      }
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Internal launcher ──────────────────────────────────────────────────────
  const _startPlayback = useCallback(
    async (playlist: Array<{ num: number; text: string }>, startIndex = 0) => {
      if (!playlist.length) return;

      _targetVerseIndexRef.current = startIndex;
      _userNavigatingRef.current = false;
      _requestIdRef.current = 0;

      isPausedRef.current = false;
      stopRequestedRef.current = true;
      ttsActiveRef.current = true;
      await bibleTTS.stop();
      stopRequestedRef.current = false;

      audioPlaylistRef.current = playlist;
      setAudioPlaylist(playlist);

      audioVerseIndexRef.current = startIndex;
      setAudioVerseIndex(startIndex);

      const startVerse = playlist[startIndex];
      setActiveAudioVerse(startVerse?.num ?? null);

      confirmedAudioIndexRef.current = startIndex;
      setShowAudioPlayer(true);
      setIsAudioPaused(false);

      speakVerseAtIndex(startIndex, false);
    },
    [speakVerseAtIndex],
  );

  // ── Public audio API ───────────────────────────────────────────────────────

  const startReadingChapter = useCallback(() => {
    const playlist = versesArray.map(v => ({ num: v.num, text: v.text }));
    setAudioScope('chapter');
    _startPlayback(playlist, 0);
  }, [versesArray, _startPlayback]);

  const startReadingSelectedVerses = useCallback(
    (selectedVerseNumbers: number[]) => {
      if (!selectedVerseNumbers.length) return;
      const playlist = selectedVerseNumbers
        .map(v => ({
          num: v,
          text: verses[v] || '',
        }))
        .filter(v => v.text);
      setAudioScope('selection');
      _startPlayback(playlist, 0);
    },
    [verses, _startPlayback],
  );

  const handleAudioStop = useCallback(async () => {
    _targetVerseIndexRef.current = -1;
    _userNavigatingRef.current = false;
    _requestIdRef.current = 0;
    isPausedRef.current = false;
    stopRequestedRef.current = true;
    ttsActiveRef.current = false;
    await bibleTTS.stop();
    stopRequestedRef.current = false;
    lastTTSVerseNumRef.current = null;
    setShowAudioPlayer(false);
    setActiveAudioVerse(null);
    setAudioPlaylist([]);
    audioPlaylistRef.current = [];
    setAudioVerseIndex(0);
    audioVerseIndexRef.current = 0;
    confirmedAudioIndexRef.current = -1;
    setIsAudioPaused(false);
  }, []);

  // ── PAUSE / RESUME ──────────────────────────────────────────────────────────
  const handleAudioTogglePlayPause = useCallback(async () => {
    if (isPausedRef.current) {
      // ── RESUME ────────────────────────────────────────────────────────────
      isPausedRef.current = false;
      setIsAudioPaused(false);
      setShowAudioPlayer(true);
      ttsActiveRef.current = true;

      const currentIndex = audioVerseIndexRef.current;

      if (bibleTTS.hasPausedText) {
        try {
          await bibleTTS.resume();
        } catch (err) {
          console.warn('[useVoiceReading] resume error:', err);
        }

        if (isPausedRef.current || stopRequestedRef.current) return;
        if (!ttsActiveRef.current) return;

        const behaviour = afterPlayBehaviourRef.current;
        const next = currentIndex + 1;
        const playlist = audioPlaylistRef.current;

        if (behaviour === 'repeat_one') {
          speakVerseAtIndex(currentIndex, false);
        } else if (behaviour === 'repeat' && next >= playlist.length) {
          speakVerseAtIndex(0, false);
        } else if (next < playlist.length) {
          speakVerseAtIndex(next, false);
        } else {
          ttsActiveRef.current = false;
          setShowAudioPlayer(false);
          setActiveAudioVerse(null);
          setAudioPlaylist([]);
          audioPlaylistRef.current = [];
          setAudioVerseIndex(0);
          audioVerseIndexRef.current = 0;
          confirmedAudioIndexRef.current = -1;
          setIsAudioPaused(false);
          lastTTSVerseNumRef.current = null;
        }
      } else {
        speakVerseAtIndex(currentIndex, false);
      }
    } else {
      // ── PAUSE ─────────────────────────────────────────────────────────────
      isPausedRef.current = true;
      setIsAudioPaused(true);
      ttsActiveRef.current = false;
      await bibleTTS.pause();
    }
  }, [speakVerseAtIndex]);

  // ── Skip next / previous ────────────────────────────────────────────────────
  const goToNextSelectedVerse = useCallback(async () => {
    _userNavigatingRef.current = true;
    _requestIdRef.current++;

    const playlist = audioPlaylistRef.current;
    const currentIndex =
      confirmedAudioIndexRef.current >= 0
        ? confirmedAudioIndexRef.current
        : audioVerseIndexRef.current;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= playlist.length) {
      if (afterPlayBehaviourRef.current === 'repeat') {
        await speakVerseAtIndex(0, true);
      }
      return;
    }

    await speakVerseAtIndex(nextIndex, true);
  }, [speakVerseAtIndex]);

  const goToPreviousSelectedVerse = useCallback(async () => {
    _userNavigatingRef.current = true;
    _requestIdRef.current++;

    const playlist = audioPlaylistRef.current;
    const currentIndex =
      confirmedAudioIndexRef.current >= 0
        ? confirmedAudioIndexRef.current
        : audioVerseIndexRef.current;
    const prevIndex = currentIndex - 1;

    if (prevIndex < 0) return;

    await speakVerseAtIndex(prevIndex, true);
  }, [speakVerseAtIndex]);

  // ── Speed ────────────────────────────────────────────────────────────────────
  const onSpeedToggle = useCallback(() => {
    setSpeechRate(prev => {
      const rates = [0.5, 1.0, 1.5, 2.0];
      const next = rates[(rates.indexOf(prev) + 1) % rates.length];
      bibleTTS
        .setRate(next)
        .then(() => {
          if (
            ttsActiveRef.current &&
            !isPausedRef.current &&
            !stopRequestedRef.current
          ) {
            const idx = audioVerseIndexRef.current;
            stopRequestedRef.current = true;
            bibleTTS
              .stop()
              .then(() => {
                stopRequestedRef.current = false;
                speakVerseAtIndex(idx, true);
              })
              .catch(console.warn);
          }
        })
        .catch(console.warn);
      return next;
    });
  }, [speakVerseAtIndex]);

  const onSpeedReset = useCallback(() => {
    setSpeechRate(1.0);
    bibleTTS.setRate(1.0).then(() => {
      if (
        ttsActiveRef.current &&
        !isPausedRef.current &&
        !stopRequestedRef.current
      ) {
        const idx = audioVerseIndexRef.current;
        stopRequestedRef.current = true;
        bibleTTS
          .stop()
          .then(() => {
            stopRequestedRef.current = false;
            speakVerseAtIndex(idx, true);
          })
          .catch(console.warn);
      }
    });
  }, [speakVerseAtIndex]);

  // ── Sleep timer ──────────────────────────────────────────────────────────────
  const sleepTimerValues = [0, 300, 600, 900, 1800, 60]; // 0 = off, then 5min, 10min, 15min, 30min, 1min

  const onSleepTimerToggle = useCallback(() => {
    setSleepTimerRemaining(prev => {
      const currentIdx = sleepTimerValues.indexOf(prev);
      const nextIdx = (currentIdx + 1) % sleepTimerValues.length;
      const nextValue = sleepTimerValues[nextIdx];

      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);

      if (nextValue === 0) {
        return 0;
      }

      sleepTimerRef.current = setInterval(() => {
        setSleepTimerRemaining(p => {
          if (p <= 1) {
            handleAudioStop();
            return 0;
          }
          return p - 1;
        });
      }, 1000);

      return nextValue;
    });
  }, [handleAudioStop]);

  // ── Scope / after-play ───────────────────────────────────────────────────────
  const handleAudioScopeChange = useCallback(
    (scope: 'chapter' | 'selection') => {
      setAudioScope(scope);
      if (scope === 'chapter') startReadingChapter();
    },
    [startReadingChapter],
  );

  const handleAfterPlayChange = useCallback(
    (behaviour: 'stop' | 'repeat_one' | 'repeat' | 'continue') => {
      afterPlayBehaviourRef.current = behaviour;
      setAfterPlayBehaviour(behaviour);
    },
    [],
  );

  // ── Return ─────────────────────────────────────────────────────────────────
  return {
    showAudioPlayer,
    activeAudioVerse,
    isAudioPaused,
    audioPlaylist,
    audioVerseIndex,
    audioScope,
    afterPlayBehaviour,
    speechRate,
    sleepTimerRemaining,
    activeVerseWordMap,
    currentVoiceId,
    voiceList,
    edgeEnabled: bibleTTS.edgeEnabled,
    startReadingChapter,
    startReadingSelectedVerses,
    handleAudioStop,
    handleAudioTogglePlayPause,
    goToNextSelectedVerse,
    goToPreviousSelectedVerse,
    onSpeedToggle,
    onSpeedReset,
    onSleepTimerToggle,
    handleAudioScopeChange,
    handleAfterPlayChange,
    onVoiceSelect,
  };
}
