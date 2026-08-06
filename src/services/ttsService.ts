import RNBlobUtil from 'react-native-blob-util';
import { api } from './api';
import { toByteArray } from 'base64-js';

export interface TTSVoice {
  name: string;
  voiceId: string;
  source: 'api' | 'builtin' | 'edge';
  category?: string;
}

const DEFAULT_VOICE_ID = 'en-GB-RyanNeural';

export const ttsService = {
  isEnabled: async (): Promise<boolean> => {
    try {
      const response = await api.get('/tts/status');
      return response.data.returnData?.enabled === true;
    } catch {
      return false;
    }
  },

  getVoices: async (): Promise<TTSVoice[]> => {
    try {
      const response = await api.get('/tts/voices');
      if (response.data.returnCode === 200 && response.data.returnData) {
        return response.data.returnData;
      }
      return getEdgeVoices();
    } catch {
      return getEdgeVoices();
    }
  },

  speak: async (
    text: string,
    voiceId?: string,
    speed?: number,
  ): Promise<ArrayBuffer> => {
    // Pull the base URL from the existing Axios instance so we stay in sync
    // with whatever environment (dev/prod) the app is configured for.
    const baseURL: string = (api.defaults.baseURL as string) ?? '';
    const url = `${baseURL}/tts/speak`;

    // Get the auth token from the existing Axios default headers
    const authHeader =
      (api.defaults.headers?.common?.['Authorization'] as string) ||
      (api.defaults.headers?.['Authorization'] as string) ||
      '';

    const res = await RNBlobUtil.fetch(
      'POST',
      url,
      {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      JSON.stringify({
        text,
        voiceId: voiceId || DEFAULT_VOICE_ID,
        speed: speed ?? 1.0,
      }),
    );

    // RNBlobUtil gives us the response as a base64 string
    const base64 = res.base64();
    if (!base64) {
      throw new Error('TTS backend returned empty audio');
    }

    // Convert base64 → ArrayBuffer so the rest of bibleTTS is unchanged
    const bytes = toByteArray(base64);
    return bytes.buffer as ArrayBuffer;
  },

  speakWithTimings: async (
    text: string,
    voiceId?: string,
    speed?: number,
    priority: 'high' | 'low' = 'low',
  ): Promise<{ audio: ArrayBuffer; wordOffsetsMs: number[] }> => {
    const baseURL: string = (api.defaults.baseURL as string) ?? '';
    const authHeader =
      (api.defaults.headers?.common?.['Authorization'] as string) ||
      (api.defaults.headers?.['Authorization'] as string) ||
      '';
    const res = await RNBlobUtil.fetch(
      'POST',
      `${baseURL}/tts/speak-with-timings`,
      {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      JSON.stringify({
        text,
        voiceId: voiceId || DEFAULT_VOICE_ID,
        speed: speed ?? 1.0,
        priority,
      }),
    );
    const payload = JSON.parse(await res.text());
    if (!payload.audioBase64) throw new Error('Timed TTS returned empty audio');
    const bytes = toByteArray(payload.audioBase64);
    return {
      audio: bytes.buffer as ArrayBuffer,
      wordOffsetsMs: Array.isArray(payload.wordOffsetsMs)
        ? payload.wordOffsetsMs
        : [],
    };
  },
};

function getEdgeVoices(): TTSVoice[] {
  return [
    {
      name: 'Ryan (Male)',
      voiceId: 'en-GB-RyanNeural',
      source: 'edge',
      category: 'Neural',
    },

    {
      name: 'Aria (Female)',
      voiceId: 'en-US-AriaNeural',
      source: 'edge',
      category: 'Neural',
    },
    {
      name: 'Emma (Female)',
      voiceId: 'en-US-EmmaNeural',
      source: 'edge',
      category: 'Neural',
    },
    {
      name: 'Jenny (Female)',
      voiceId: 'en-US-JennyNeural',
      source: 'edge',
      category: 'Neural',
    },
    {
      name: 'Guy (Male)',
      voiceId: 'en-US-GuyNeural',
      source: 'edge',
      category: 'Neural',
    },
    {
      name: 'Christopher (Male)',
      voiceId: 'en-US-ChristopherNeural',
      source: 'edge',
      category: 'Neural',
    },
    {
      name: 'Brian (Male)',
      voiceId: 'en-US-BrianNeural',
      source: 'edge',
      category: 'Neural',
    },
    {
      name: 'Sonia (Female)',
      voiceId: 'en-GB-SoniaNeural',
      source: 'edge',
      category: 'Neural',
    },
  ];
}
