import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { bibleTTS } from '../utilits/bibleTTS';
import { ttsService, TTSVoice } from '../services/ttsService';
import { computeWordMap, WordSpan } from '../utilits/bibleUtils';

const AUDIO_WINDOW_SIZE = 5;
const SLEEP_TIMER_VALUES = [0, 300, 600, 900, 1800, 60];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseVoiceReadingOptions {
  /** Verse text data keyed by verse number */
  verses: Record<number, string>;
  /** Ordered array of verses */
  versesArray: Array<{ num: number; text: string }>;
  /** Section headings keyed to the verse where each section begins */
  chapterHeadings: Array<{ verse: number; heading: string }>;
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
  chapterHeadings,
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
  const [speechRate, setSpeechRate] = useState<number>(
    bibleTTS.getCurrentRate(),
  );
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
  const speechRateRef = useRef<number>(bibleTTS.getCurrentRate());
  const playbackSettingQueueRef = useRef<Promise<void>>(Promise.resolve());
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
  useEffect(
    () => () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    },
    [],
  );

  const headingsByVerse = useMemo(() => {
    const grouped = new Map<number, string[]>();
    chapterHeadings.forEach(({ verse, heading }) => {
      const cleanHeading = heading.trim().replace(/[.!?;:,]+$/, '');
      if (!cleanHeading) return;
      const current = grouped.get(verse) || [];
      current.push(cleanHeading);
      grouped.set(verse, current);
    });
    return grouped;
  }, [chapterHeadings]);

  const getNarrationText = useCallback(
    (verse: { num: number; text: string }) => {
      const headings = headingsByVerse.get(verse.num);
      return headings?.length
        ? `${headings.join(', ')}, ${verse.text}`
        : verse.text;
    },
    [headingsByVerse],
  );

  const getContinuousText = useCallback(
    (versesToJoin: Array<{ num: number; text: string }>) =>
      versesToJoin
        .map(getNarrationText)
        .map(text => text.replace(/\.+(["'\u2019\u201d)\]]*)$/, '$1').trim())
        .join(', '),
    [getNarrationText],
  );

  const bufferUpcomingWindows = useCallback(
    (playlist: Array<{ num: number; text: string }>, index: number) => {
      if (!bibleTTS.edgeEnabled || playlist.length === 0) return;
      bibleTTS
        .prefetchAudio(getContinuousText(playlist.slice(index)))
        .catch(() => {});
    },
    [getContinuousText],
  );

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
              const listIndex = versesArray.findIndex(
                verse => verse.num === ttsState.currentVerseNum,
              );
              flatListRef.current?.scrollToIndex({
                index: Math.max(0, listIndex),
                animated: true,
                viewPosition: 0.3,
              });
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
  }, [flatListRef, versesArray]);

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
      const behaviour = afterPlayBehaviourRef.current;
      const chunkSize =
        behaviour === 'continue' || behaviour === 'repeat'
          ? bibleTTS.edgeEnabled
            ? playlist.length - index
            : AUDIO_WINDOW_SIZE
          : 1;
      const chunk = playlist.slice(index, index + chunkSize);
      _targetVerseIndexRef.current = index;

      // Sync UI immediately
      audioVerseIndexRef.current = index;
      confirmedAudioIndexRef.current = index;
      setAudioVerseIndex(index);
      setActiveAudioVerse(verse.num);
      lastTTSVerseNumRef.current = verse.num;

      // Scroll verse into view
      const listIndex = versesArray.findIndex(item => item.num === verse.num);
      flatListRef.current?.scrollToIndex({
        index: Math.max(0, listIndex),
        animated: true,
        viewPosition: 0.3,
      });

      try {
        const speakPromise = bibleTTS.speakVerses(
          chunk.map(chunkVerse => ({
            ...chunkVerse,
            text: getNarrationText(chunkVerse),
          })),
          currentBookRef.current,
          currentChapterRef.current,
          {
            announceLocation:
              index === 0 && audioScopeRef.current === 'chapter',
          },
        );

        // Reuse the continuous chapter track prepared at startup.
        bufferUpcomingWindows(playlist, index);

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

      _userNavigatingRef.current = false;

      const next = index + chunk.length;

      if (behaviour === 'repeat_one') {
        speakVerseAtIndex(index, false);
      } else if (behaviour === 'repeat') {
        const repeatIndex = next < playlist.length ? next : 0;
        _targetVerseIndexRef.current = repeatIndex;
        speakVerseAtIndex(repeatIndex, false);
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
    [
      bufferUpcomingWindows,
      currentBookRef,
      currentChapterRef,
      flatListRef,
      getNarrationText,
      versesArray,
    ],
  );

  // ── Internal launcher ──────────────────────────────────────────────────────
  const _startPlayback = useCallback(
    async (playlist: Array<{ num: number; text: string }>, startIndex = 0) => {
      if (!playlist.length || startIndex < 0 || startIndex >= playlist.length)
        return;

      const requestId = _requestIdRef.current + 1;
      _requestIdRef.current = requestId;
      _targetVerseIndexRef.current = startIndex;
      _userNavigatingRef.current = false;

      isPausedRef.current = false;
      stopRequestedRef.current = true;
      ttsActiveRef.current = false;
      await bibleTTS.stop();
      stopRequestedRef.current = false;

      const startVerse = playlist[startIndex];
      const narrationText = getContinuousText(
        playlist.slice(
          startIndex,
          bibleTTS.edgeEnabled
            ? playlist.length
            : startIndex + AUDIO_WINDOW_SIZE,
        ),
      );
      const initialText =
        audioScopeRef.current === 'chapter'
          ? `${currentBookRef.current}, chapter ${currentChapterRef.current}, ${narrationText}`
          : narrationText;
      await bibleTTS.prefetchAudio(initialText);

      if (requestId !== _requestIdRef.current) return;

      audioPlaylistRef.current = playlist;
      setAudioPlaylist(playlist);

      audioVerseIndexRef.current = startIndex;
      setAudioVerseIndex(startIndex);

      setActiveAudioVerse(startVerse?.num ?? null);

      confirmedAudioIndexRef.current = startIndex;
      ttsActiveRef.current = true;
      setShowAudioPlayer(true);
      setIsAudioPaused(false);

      bufferUpcomingWindows(playlist, startIndex);
      speakVerseAtIndex(startIndex, false);
    },
    [
      bufferUpcomingWindows,
      currentBookRef,
      currentChapterRef,
      getContinuousText,
      speakVerseAtIndex,
    ],
  );

  const applyPlaybackSetting = useCallback(
    (applySetting: () => Promise<void>) => {
      playbackSettingQueueRef.current = playbackSettingQueueRef.current.then(
        async () => {
          const shouldRestart =
            audioPlaylistRef.current.length > 0 &&
            (ttsActiveRef.current || isPausedRef.current);
          const currentIndex = audioVerseIndexRef.current;
          const requestId = shouldRestart
            ? _requestIdRef.current + 1
            : _requestIdRef.current;

          if (shouldRestart) {
            _requestIdRef.current = requestId;
            isPausedRef.current = false;
            setIsAudioPaused(false);
            ttsActiveRef.current = true;
            stopRequestedRef.current = true;
            await bibleTTS.stop();
          }

          try {
            await applySetting();
          } catch (err) {
            console.warn('[useVoiceReading] playback setting error:', err);
          }

          if (!shouldRestart || requestId !== _requestIdRef.current) return;
          stopRequestedRef.current = false;
          speakVerseAtIndex(currentIndex, true);
        },
      );
      return playbackSettingQueueRef.current;
    },
    [speakVerseAtIndex],
  );

  const onVoiceSelect = useCallback(
    (voiceId: string) => {
      setCurrentVoiceId(voiceId);
      applyPlaybackSetting(() => bibleTTS.setEdgeVoice(voiceId));
    },
    [applyPlaybackSetting],
  );

  // ── Public audio API ───────────────────────────────────────────────────────

  const startReadingChapter = useCallback(() => {
    const playlist = versesArray.map(v => ({ num: v.num, text: v.text }));
    audioScopeRef.current = 'chapter';
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
      audioScopeRef.current = 'selection';
      setAudioScope('selection');
      _startPlayback(playlist, 0);
    },
    [verses, _startPlayback],
  );

  const handleAudioStop = useCallback(async () => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerRemaining(0);
    _targetVerseIndexRef.current = -1;
    _userNavigatingRef.current = false;
    _requestIdRef.current++;
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
        const resumingBufferedAudio = bibleTTS.hasPausedEdgeAudio;
        try {
          await bibleTTS.resume();
        } catch (err) {
          console.warn('[useVoiceReading] resume error:', err);
        }

        if (isPausedRef.current || stopRequestedRef.current) return;
        if (!ttsActiveRef.current) return;
        // The original speakVerseAtIndex call is still awaiting this Sound
        // instance and will advance the playlist when playback completes.
        if (resumingBufferedAudio) return;

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
    const playlist = audioPlaylistRef.current;
    const currentIndex =
      confirmedAudioIndexRef.current >= 0
        ? confirmedAudioIndexRef.current
        : audioVerseIndexRef.current;
    let nextIndex = currentIndex + 1;

    if (nextIndex >= playlist.length) {
      if (afterPlayBehaviourRef.current !== 'repeat') return;
      nextIndex = 0;
    }

    _userNavigatingRef.current = true;
    _requestIdRef.current++;
    isPausedRef.current = false;
    setIsAudioPaused(false);
    ttsActiveRef.current = true;
    stopRequestedRef.current = true;
    await bibleTTS.stop(false);
    stopRequestedRef.current = false;
    await speakVerseAtIndex(nextIndex, true);
  }, [speakVerseAtIndex]);

  const goToPreviousSelectedVerse = useCallback(async () => {
    const currentIndex =
      confirmedAudioIndexRef.current >= 0
        ? confirmedAudioIndexRef.current
        : audioVerseIndexRef.current;
    const prevIndex = currentIndex - 1;

    if (prevIndex < 0) return;

    _userNavigatingRef.current = true;
    _requestIdRef.current++;
    isPausedRef.current = false;
    setIsAudioPaused(false);
    ttsActiveRef.current = true;
    stopRequestedRef.current = true;
    await bibleTTS.stop(false);
    stopRequestedRef.current = false;
    await speakVerseAtIndex(prevIndex, true);
  }, [speakVerseAtIndex]);

  // ── Speed ────────────────────────────────────────────────────────────────────
  const onSpeedToggle = useCallback(() => {
    const rates = [0.6, 0.75, 0.85, 1.0];
    const next =
      rates[(rates.indexOf(speechRateRef.current) + 1) % rates.length];
    speechRateRef.current = next;
    setSpeechRate(next);
    applyPlaybackSetting(() => bibleTTS.setRate(next));
  }, [applyPlaybackSetting]);

  const onSpeedReset = useCallback(() => {
    speechRateRef.current = 0.75;
    setSpeechRate(0.75);
    applyPlaybackSetting(() => bibleTTS.setRate(0.75));
  }, [applyPlaybackSetting]);

  // ── Sleep timer ──────────────────────────────────────────────────────────────
  const onSleepTimerToggle = useCallback(() => {
    setSleepTimerRemaining(prev => {
      const currentIdx = SLEEP_TIMER_VALUES.indexOf(prev);
      const nextIdx = (currentIdx + 1) % SLEEP_TIMER_VALUES.length;
      const nextValue = SLEEP_TIMER_VALUES[nextIdx];

      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);

      if (nextValue === 0) {
        return 0;
      }

      sleepTimerRef.current = setInterval(() => {
        setSleepTimerRemaining(p => {
          if (p <= 1) {
            if (sleepTimerRef.current) {
              clearInterval(sleepTimerRef.current);
              sleepTimerRef.current = null;
            }
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
