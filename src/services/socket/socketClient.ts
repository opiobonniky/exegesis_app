import { io, Socket } from 'socket.io-client';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from '../api';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketConnectionState,
} from './socket.types';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let state: SocketConnectionState = 'disconnected';
let debugEnabled = __DEV__;
let resolvedDevSocketUrl: string | null = null;
let resolvingDevSocketUrl: Promise<string> | null = null;

const listeners = new Set<(s: SocketConnectionState) => void>();

const STORAGE_KEYS = {
  socketUrlOverride: 'socket_url_override',
};

const log = (...args: any[]) => {
  if (!debugEnabled) return;
  console.log('[socket]', ...args);
};

export const setSocketDebug = (enabled: boolean) => {
  debugEnabled = enabled;
};

export const setSocketUrlOverride = async (url: string | null) => {
  if (!url) {
    await AsyncStorage.removeItem(STORAGE_KEYS.socketUrlOverride);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.socketUrlOverride, url);
};

const getDevServerHost = (): string | null => {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  // e.g. http://192.168.0.12:8081/index.bundle?...
  const m = scriptURL?.match(/^https?:\/\/([^:/]+)(?::\d+)?\//);
  return m?.[1] ?? null;
};

const SOCKET_IO_PATH = '/socket.io';

// Keep this URL in sync with api.ts getBaseURL() (dev/prod)
const getSocketURL = async (): Promise<string> => {
  const override = await AsyncStorage.getItem(STORAGE_KEYS.socketUrlOverride);
  if (override) return override;

  if (__DEV__) {
    if (resolvedDevSocketUrl) return resolvedDevSocketUrl;
    if (resolvingDevSocketUrl) return resolvingDevSocketUrl;

    // We try a few dev candidates in order:
    // - Android physical device via USB reverse: localhost
    // - Android emulator: 10.0.2.2
    // - Wi-Fi device: Metro host IP
    const metroHost = getDevServerHost();
    const candidates: string[] = [
      'http://localhost:7001',
      ...(Platform.OS === 'android' ? ['http://10.0.2.2:7001'] : []),
      ...(metroHost ? [`http://${metroHost}:7001`] : []),
    ];

    const probe = async (baseUrl: string): Promise<boolean> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      try {
        // Polling handshake endpoint (works when Socket.IO server is alive)
        const url = `${baseUrl}${SOCKET_IO_PATH}/?EIO=4&transport=polling`;
        const res = await fetch(url, { signal: controller.signal });
        // Some servers/proxies may return non-200 but still reachable; treat any
        // response as "reachable" for host selection.
        return !!res;
      } catch {
        return false;
      } finally {
        clearTimeout(timeout);
      }
    };

    resolvingDevSocketUrl = (async () => {
      for (const c of candidates) {
        if (await probe(c)) {
          resolvedDevSocketUrl = c;
          return c;
        }
      }

      // Last resort: keep previous behavior (choose something deterministic)
      resolvedDevSocketUrl =
        Platform.OS === 'android'
          ? (candidates.find(x => x.includes('10.0.2.2')) ?? candidates[0])
          : candidates[0];
      return resolvedDevSocketUrl;
    })().finally(() => {
      resolvingDevSocketUrl = null;
    });

    return resolvingDevSocketUrl;
  }

  return 'https://exegesis-bible.onrender.com';
};

// Optional: if your backend uses a different socket namespace, set it here.
const getSocketPath = () => SOCKET_IO_PATH;

const setState = (s: SocketConnectionState) => {
  const prev = state;
  state = s;
  if (prev !== s) log('state', prev, '→', s);
  listeners.forEach(fn => fn(s));
};

export const socketState = () => state;

export const subscribeSocketState = (
  fn: (s: SocketConnectionState) => void,
) => {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
};

export const getSocket = () => socket;

export const connectSocket = async (opts?: {
  topics?: string[];
  debug?: boolean;
}) => {
  if (typeof opts?.debug === 'boolean') setSocketDebug(opts.debug);

  if (
    socket &&
    (socket.connected || state === 'connecting' || state === 'reconnecting')
  ) {
    return socket;
  }

  const token = await AsyncStorage.getItem(TOKEN_KEY);

  setState('connecting');

  const url = await getSocketURL();
  if (__DEV__) {
    log('metro', { scriptURL: NativeModules?.SourceCode?.scriptURL });
  }
  log('connecting', { url, path: getSocketPath(), topics: opts?.topics ?? [] });

  socket = io(url, {
    path: getSocketPath(),
    // Don't force websocket-only; some networks/proxies block WS and Socket.IO
    // needs polling as a fallback (or for the initial handshake).
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 6000,
    timeout: 15000,
    autoConnect: true,
    // If your backend supports auth in handshake:
    auth: token ? { token } : undefined,
  });

  socket.on('connect', () => {
    setState('connected');
    log('connected', { id: socket?.id });
    try {
      const transportName = socket?.io?.engine?.transport?.name;
      if (transportName) log('transport', transportName);
    } catch {
      // ignore
    }

    // If your backend expects auth after connect:
    if (token) {
      log('emit', 'client:auth');
      socket?.emit('client:auth', { token });
    }

    log('emit', 'client:hello');
    socket?.emit('client:hello', { platform: Platform.OS });

    // Subscribe to topics/channels (server-defined)
    if (opts?.topics?.length) {
      log('emit', 'client:subscribe', opts.topics);
      socket?.emit('client:subscribe', { topics: opts.topics });
    }
  });

  socket.on('connect_error', err => {
    log('connect_error', {
      message: err?.message ?? String(err),
      description: (err as any)?.description,
      type: (err as any)?.type,
    });
    setState('error');
  });

  socket.on('error', err => {
    log('error', err);
    setState('error');
  });

  socket.on('disconnect', reason => {
    log('disconnect', reason);
    setState('disconnected');
  });

  socket.io.on('reconnect_attempt', attempt => {
    log('reconnect_attempt', attempt);
    setState('reconnecting');
  });
  socket.io.on('reconnect', attempt => {
    log('reconnect', attempt);
    setState('connected');
  });

  socket.io.on('reconnect_error', err => {
    log('reconnect_error', {
      message: err?.message ?? String(err),
      description: (err as any)?.description,
      type: (err as any)?.type,
    });
    setState('error');
  });
  socket.io.on('reconnect_failed', () => {
    log('reconnect_failed');
    setState('error');
  });

  // Keepalive if server pings
  socket.on('server:ping', payload => {
    log('recv', 'server:ping');
    socket?.emit('client:pong', payload);
  });

  return socket;
};

export const disconnectSocket = async () => {
  if (!socket) return;

  try {
    socket.removeAllListeners();
    socket.disconnect();
  } finally {
    socket = null;
    setState('disconnected');
  }
};

/**
 * If token changes (login/logout), call this to re-auth.
 */
export const refreshSocketAuth = async () => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!socket) return;

  // Handshake auth can't be updated after connect in some servers,
  // so we emit auth again and/or reconnect.
  if (token) {
    socket.emit('client:auth', { token });
  } else {
    await disconnectSocket();
  }
};
