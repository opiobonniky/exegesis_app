/**
 * Unit tests for BibleTTSManager — Edge TTS fallback logic.
 *
 * We test through the exported singleton (`bibleTTS`) because the class is
 * not exported directly.  All native modules are mocked so tests run in a
 * pure Node.js environment.
 *
 * IMPORTANT: For the device-TTS path we resolve the internal `_pendingResolve`
 * callback directly, rather than simulating TTS engine events.  This tests
 * the *fallback orchestration* — whether Edge failure correctly enters the
 * device path and whether `_edgeEnabled` is flipped to `false`.
 *
 * NOTE on jest mock lifecycle:
 *   - We avoid jest.restoreAllMocks() because it strips .mockResolvedValue()
 *     from mocks inside jest.mock() factories.
 *   - Date.now() is controlled via jest.spyOn().mockImplementation().
 *   - jest.clearAllMocks() is safe: it clears call history but preserves
 *     mock implementations created in the jest.mock() factories.
 *
 * NOTE on async execution:
 *   - _speakViaBackend has two `await` points (ttsService.speak and
 *     RNFS.writeFile) before reaching `return new Promise(...)` where
 *     `new Sound()` is called.  These `await`s yield microtasks.
 *   - Tests must yield microtasks (via await Promise.resolve() or
 *     setTimeout) BEFORE calling fireSoundLoaded / fireSoundPlayComplete
 *     to give _speakViaBackend time to construct the Sound object.
 */

// ── Mocks (hoisted by jest) ────────────────────────────────────────────────

jest.mock('react-native-tts', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
    removeAllListeners: jest.fn(),
    setDefaultLanguage: jest.fn().mockResolvedValue(undefined),
    setDefaultRate: jest.fn().mockResolvedValue(undefined),
    setDefaultPitch: jest.fn().mockResolvedValue(undefined),
    setDefaultVoice: jest.fn().mockResolvedValue(undefined),
    voices: jest.fn().mockResolvedValue([]),
    speak: jest.fn().mockResolvedValue('test-utterance-id'),
    stop: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('react-native-sound', () => {
  const mockInstance = {
    play: jest.fn(function (this: any, cb?: (success: boolean) => void) {
      if (cb) (this as any)._playCb = cb;
    }),
    pause: jest.fn(),
    stop: jest.fn(),
    release: jest.fn(),
    currentTime: 0,
    duration: 0,
    numberOfChannels: 1,
    volume: 1,
    setVolume: jest.fn(),
    setNumberOfLoops: jest.fn(),
  };

  const SoundConstructor = jest.fn(
    (_path: string, _basePath: string, cb: (error?: string | null) => void) => {
      SoundConstructor._lastCb = cb;
      return mockInstance;
    },
  ) as unknown as jest.Mock & {
    setCategory: jest.Mock;
    _lastCb: ((error?: string | null) => void) | null;
    _lastInstance: typeof mockInstance;
  };

  SoundConstructor.setCategory = jest.fn();
  SoundConstructor._lastCb = null;
  SoundConstructor._lastInstance = mockInstance;
  return { __esModule: true, default: SoundConstructor };
});

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    CachesDirectoryPath: '/tmp/cache',
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('base64-js', () => ({
  fromByteArray: jest.fn().mockReturnValue('bW9ja2VkLWJhc2U2NA=='),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/services/ttsService', () => ({
  ttsService: {
    isEnabled: jest.fn().mockResolvedValue(true),
    speak: jest.fn(),
    getVoices: jest.fn(),
  },
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import Tts from 'react-native-tts';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bibleTTS, DeviceVoice } from '../src/utilits/bibleTTS';
import { ttsService } from '../src/services/ttsService';

// ── Types ───────────────────────────────────────────────────────────────────

type SoundMockType = jest.Mock & {
  setCategory: jest.Mock;
  _lastCb: ((error?: string | null) => void) | null;
  _lastInstance: {
    play: jest.Mock;
    pause: jest.Mock;
    stop: jest.Mock;
    release: jest.Mock;
  };
};

// ── Internal-state helpers ─────────────────────────────────────────────────

/**
 * Resolve any in-flight device-TTS promise by calling the internal
 * `_pendingResolve` callback directly.
 */
function resolveDeviceTtsPromise(): boolean {
  const mgr = bibleTTS as any;
  const resolve = mgr._pendingResolve as (() => void) | null;
  if (resolve) {
    if (mgr._utteranceTimeoutId !== null) {
      clearTimeout(mgr._utteranceTimeoutId);
      mgr._utteranceTimeoutId = null;
    }
    mgr._pendingResolve = null;
    mgr._utteranceStarted = false;
    resolve();
    return true;
  }
  return false;
}

/** Simulate react-native-sound loading the MP3 file. */
function fireSoundLoaded(error?: string | null) {
  const SoundModule = require('react-native-sound') as {
    default: SoundMockType;
  };
  const cb = SoundModule.default._lastCb;
  if (cb) cb(error ?? null);
}

/** Simulate react-native-sound finishing playback with the given success flag. */
function fireSoundPlayComplete(success: boolean) {
  const SoundModule = require('react-native-sound') as {
    default: SoundMockType;
  };
  const instance = SoundModule.default._lastInstance;
  const playCb = (instance as any)._playCb;
  if (playCb) playCb(success);
}

/**
 * Yield microtasks so _speakViaBackend can pass its await points and reach
 * `new Sound()`, then resolve any pending device-TTS promise.
 */
async function completeDeviceTts(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50));
  resolveDeviceTtsPromise();
}

// ── Date.now mock for silent-playback detection ─────────────────────────────

let mockNow = 0;

// ── Lifecycle ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockNow = 0;
  jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
  bibleTTS.setEdgeEnabled(false);
});

// Initialize once so device-TTS tests don't re-trigger init()
// (which would re-enable Edge via ttsService.isEnabled()).
beforeAll(async () => {
  await bibleTTS.init();
  bibleTTS.setEdgeEnabled(false);
});

afterEach(() => {
  bibleTTS.stop().catch(() => {});
  // Intentionally NOT calling jest.restoreAllMocks()
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('prepareText', () => {
  it('expands common Bible-book abbreviations', () => {
    expect(bibleTTS.prepareText('Jn 3:16')).toContain('John');
    expect(bibleTTS.prepareText('Rom 8:28')).toContain('Romans');
    expect(bibleTTS.prepareText('Ps 23')).toContain('Psalms');
    expect(bibleTTS.prepareText('Gen 1:1')).toContain('Genesis');
  });

  it('expands v. / ch. prefixes', () => {
    expect(bibleTTS.prepareText('v. 3')).toMatch(/verse\s+3/i);
    expect(bibleTTS.prepareText('ch. 5')).toMatch(/chapter\s+5/i);
  });

  it('removes markdown artefacts', () => {
    expect(bibleTTS.prepareText('**bold** [link](url)')).not.toMatch(
      /[\*\[]/,
    );
  });

  it('replaces em-dashes and semicolons with commas', () => {
    const result = bibleTTS.prepareText('word—another; end.');
    expect(result).not.toContain('—');
    expect(result).not.toContain(';');
    expect(result).toContain(',');
  });

  it('collapses multiple spaces', () => {
    expect(bibleTTS.prepareText('a    b   c')).toBe('a b c');
  });

  it('returns trimmed text', () => {
    expect(bibleTTS.prepareText('  hello world  ')).toBe('hello world');
  });
});

describe('Edge TTS — success path', () => {
  beforeEach(() => {
    bibleTTS.setEdgeEnabled(true);
    jest.mocked(ttsService.speak).mockResolvedValue(new ArrayBuffer(48000));
  });

  it('uses Edge TTS when enabled and backend returns valid audio', async () => {
    const speakPromise = bibleTTS.speak('Hello world', 0, 0, undefined, false, 1);

    // Yield so _speakViaBackend reaches new Sound()
    await new Promise(resolve => setTimeout(resolve, 50));
    fireSoundLoaded(null);
    mockNow += 1000;
    fireSoundPlayComplete(true);

    await expect(speakPromise).resolves.toBeUndefined();
    expect(ttsService.speak).toHaveBeenCalledWith(
      expect.stringContaining('Hello world'),
      expect.any(String),
      expect.any(Number),
    );
    expect(RNFS.writeFile).toHaveBeenCalled();
    expect(bibleTTS.edgeEnabled).toBe(true);
  });
});

describe('Edge TTS → device TTS fallback', () => {
  beforeEach(() => {
    bibleTTS.setEdgeEnabled(true);
  });

  it('falls back to device TTS when backend returns empty audio', async () => {
    jest.mocked(ttsService.speak).mockResolvedValue(new ArrayBuffer(0));
    bibleTTS.setEdgeEnabled(true);

    const speakPromise = bibleTTS.speak('For God so loved the world', 0, 0, undefined, false, 1);
    await completeDeviceTts();

    await expect(speakPromise).resolves.toBeUndefined();
    expect((bibleTTS as any)._edgeEnabled).toBe(false);
  });

  it('falls back to device TTS when ttsService.speak throws', async () => {
    jest.mocked(ttsService.speak).mockRejectedValue(new Error('Network error'));
    bibleTTS.setEdgeEnabled(true);

    const speakPromise = bibleTTS.speak('In the beginning', 0, 0, undefined, false, 1);
    await completeDeviceTts();

    await expect(speakPromise).resolves.toBeUndefined();
    expect((bibleTTS as any)._edgeEnabled).toBe(false);
  });

  it('falls back to device TTS when react-native-sound fails to load the MP3', async () => {
    jest.mocked(ttsService.speak).mockResolvedValue(new ArrayBuffer(48000));
    bibleTTS.setEdgeEnabled(true);

    const speakPromise = bibleTTS.speak('The Lord is my shepherd', 0, 0, undefined, false, 1);

    // Yield so _speakViaBackend reaches new Sound()
    await new Promise(resolve => setTimeout(resolve, 50));
    fireSoundLoaded('Could not load file');
    await completeDeviceTts();

    await expect(speakPromise).resolves.toBeUndefined();
    expect((bibleTTS as any)._edgeEnabled).toBe(false);
  });

  it('falls back to device TTS when playback is silent (< 500 ms)', async () => {
    jest.mocked(ttsService.speak).mockResolvedValue(new ArrayBuffer(48000));
    bibleTTS.setEdgeEnabled(true);

    const speakPromise = bibleTTS.speak('Create in me a clean heart', 0, 0, undefined, false, 1);

    // Yield so _speakViaBackend reaches new Sound()
    await new Promise(resolve => setTimeout(resolve, 50));
    fireSoundLoaded(null);
    // Do NOT advance mockNow → playDuration ~ 0 ms → triggers silent detection
    fireSoundPlayComplete(true);
    await completeDeviceTts();

    await expect(speakPromise).resolves.toBeUndefined();
    expect((bibleTTS as any)._edgeEnabled).toBe(false);
  });

  it('falls back when sound.play() reports failure', async () => {
    jest.mocked(ttsService.speak).mockResolvedValue(new ArrayBuffer(48000));
    bibleTTS.setEdgeEnabled(true);

    const speakPromise = bibleTTS.speak('He leadeth me beside the still waters', 0, 0, undefined, false, 1);

    // Yield so _speakViaBackend reaches new Sound()
    await new Promise(resolve => setTimeout(resolve, 50));
    fireSoundLoaded(null);
    mockNow += 1000;
    fireSoundPlayComplete(false);
    await completeDeviceTts();

    await expect(speakPromise).resolves.toBeUndefined();
    expect((bibleTTS as any)._edgeEnabled).toBe(false);
  });
});

describe('Edge TTS state management', () => {
  it('setEdgeEnabled / edgeEnabled getter', () => {
    expect(bibleTTS.edgeEnabled).toBe(false);
    bibleTTS.setEdgeEnabled(true);
    expect(bibleTTS.edgeEnabled).toBe(true);
    bibleTTS.setEdgeEnabled(false);
    expect(bibleTTS.edgeEnabled).toBe(false);
  });

  it('setEdgeVoice / edgeVoiceId getter', () => {
    expect(bibleTTS.edgeVoiceId).toBe('en-US-AriaNeural');
    bibleTTS.setEdgeVoice('en-US-JennyNeural');
    expect(bibleTTS.edgeVoiceId).toBe('en-US-JennyNeural');
  });

  it('setEdgeVoice persists voice ID to AsyncStorage', async () => {
    await bibleTTS.setEdgeVoice('en-US-DavisNeural');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'tts_edge_voice_id',
      'en-US-DavisNeural',
    );
  });

  it('setEdgeVoice ignores empty ID', async () => {
    await bibleTTS.setEdgeVoice('');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('Edge TTS takes priority when both are available', () => {
  beforeEach(() => {
    bibleTTS.setEdgeEnabled(true);
    jest.mocked(ttsService.speak).mockResolvedValue(new ArrayBuffer(48000));
  });

  it('does NOT call Tts.speak when Edge TTS succeeds', async () => {
    const speakPromise = bibleTTS.speak('Test text', 0, 0, undefined, false, 1);

    await new Promise(resolve => setTimeout(resolve, 50));
    fireSoundLoaded(null);
    mockNow += 1000;
    fireSoundPlayComplete(true);

    await speakPromise;
    expect(Tts.speak).not.toHaveBeenCalled();
  });

  it('gracefully falls through when Edge TTS fails and device TTS is available', async () => {
    jest.mocked(ttsService.speak).mockRejectedValue(new Error('Backend down'));
    bibleTTS.setEdgeEnabled(true);

    const speakPromise = bibleTTS.speak('Fallback test', 0, 0, undefined, false, 1);
    await completeDeviceTts();

    await expect(speakPromise).resolves.toBeUndefined();
    expect(Tts.speak).toHaveBeenCalledWith(expect.stringContaining('Fallback test'));
    expect((bibleTTS as any)._edgeEnabled).toBe(false);
  });
});

describe('speak — edge cases', () => {
  it('resolves immediately when called with empty text', async () => {
    await expect(bibleTTS.speak('')).resolves.toBeUndefined();
    expect(ttsService.speak).not.toHaveBeenCalled();
    expect(Tts.speak).not.toHaveBeenCalled();
  });
});

describe('getDeviceVoices', () => {
  it('returns empty array when Tts.voices throws', async () => {
    jest.mocked(Tts.voices).mockRejectedValue(new Error('Native error'));
    const voices = await bibleTTS.getDeviceVoices();
    expect(voices).toEqual([]);
  });

  it('filters non-English voices', async () => {
    jest.mocked(Tts.voices).mockResolvedValue([
      { id: 'fr-FR-Thomas', language: 'fr-FR', name: 'Thomas' },
      { id: 'en-US-Samantha', language: 'en-US', name: 'Samantha', notInstalled: false },
      { id: 'de-DE-Hanna', language: 'de-DE', name: 'Hanna' },
    ]);
    const voices = await bibleTTS.getDeviceVoices();
    expect(voices).toHaveLength(1);
    expect(voices[0].id).toBe('en-US-Samantha');
  });

  it('excludes uninstalled voices', async () => {
    jest.mocked(Tts.voices).mockResolvedValue([
      { id: 'en-US-Installed', language: 'en-US', name: 'Installed', notInstalled: false },
      { id: 'en-US-NotInstalled', language: 'en-US', name: 'Not Installed', notInstalled: true },
    ]);
    const voices = await bibleTTS.getDeviceVoices();
    expect(voices).toHaveLength(1);
    expect(voices[0].id).toBe('en-US-Installed');
  });
});

describe('settings — rate & pitch', () => {
  it('setRate saves to AsyncStorage', async () => {
    await bibleTTS.setRate(0.75);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('tts_rate', '0.75');
    expect(bibleTTS.getCurrentRate()).toBeCloseTo(0.75);
  });

  it('setPitch saves to AsyncStorage', async () => {
    await bibleTTS.setPitch(1.2);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('tts_pitch', '1.2');
    expect(bibleTTS.getCurrentPitch()).toBeCloseTo(1.2);
  });

  it('resetRate clears rate preference', async () => {
    await bibleTTS.setRate(0.5);
    await bibleTTS.resetRate();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('tts_rate');
    expect(bibleTTS.isRateCustomized()).toBe(false);
  });

  it('resetPitch clears pitch preference', async () => {
    await bibleTTS.setPitch(0.9);
    await bibleTTS.resetPitch();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('tts_pitch');
    expect(bibleTTS.isPitchCustomized()).toBe(false);
  });

  it('clamps rate to [0.1, 2.0]', async () => {
    await bibleTTS.setRate(-1);
    expect(bibleTTS.getCurrentRate()).toBeCloseTo(0.1);
    await bibleTTS.setRate(5);
    expect(bibleTTS.getCurrentRate()).toBeCloseTo(2.0);
  });

  it('clamps pitch to [0.5, 2.0]', async () => {
    await bibleTTS.setPitch(0);
    expect(bibleTTS.getCurrentPitch()).toBeCloseTo(0.5);
    await bibleTTS.setPitch(3);
    expect(bibleTTS.getCurrentPitch()).toBeCloseTo(2.0);
  });
});

describe('subscribe / notify', () => {
  it('notifies listeners on state changes', async () => {
    const listener = jest.fn();
    const unsub = bibleTTS.subscribe(listener);

    await bibleTTS.stop();
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0]).toMatchObject({
      isPlaying: false,
      isPaused: false,
      tier: 'idle',
    });

    unsub();
  });

  it('unsubscribe removes the listener', () => {
    const listener = jest.fn();
    const unsub = bibleTTS.subscribe(listener);
    unsub();

    const callCountBefore = listener.mock.calls.length;
    const mgr = bibleTTS as any;
    mgr.notifyListeners();
    expect(listener.mock.calls.length).toBe(callCountBefore);
  });
});
