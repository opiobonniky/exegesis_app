import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { AppContext } from '../../common/AppContext';
import {
  connectSocket,
  disconnectSocket,
  refreshSocketAuth,
} from './socketClient';
import { handleSocketNotification } from './socketNotificationsBridge';
import { route } from '../../component/navigations/routes';
import {
  getLocalISODate,
  normalizeDailyVerse,
  saveDailyVerseCache,
} from '../../features/home/dailyVerseCache';

type Props = {
  children: React.ReactNode;
  topics?: string[];
  /** Enable verbose socket logs */
  debug?: boolean;
};

/**
 * Keeps the socket connected while the JS runtime is alive.
 *
 * Important: on iOS/Android, when the app is fully killed the JS runtime stops,
 * so a websocket cannot "run continuously" in that state.
 */
export default function SocketProvider({ children, topics, debug }: Props) {
  const app = useContext(AppContext);
  const topicsKey = useMemo(() => (topics ?? []).join(','), [topics]);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const connectAndAttach = () => {
      connectSocket({ topics, debug })
        .then(sock => {
          // Attach listeners idempotently
          sock.off('notification:new');
          sock.on('notification:new', payload => {
            handleSocketNotification(payload).catch(err =>
              console.error('socket notification failed:', err),
            );
          });

          // Optional server push for daily verse
          sock.off('bible:daily-verse');
          sock.on('bible:daily-verse', payload => {
            const body =
              payload?.text ??
              payload?.message ??
              "Open Exegesis to read today's verse and reflection.";

            const cached = normalizeDailyVerse(
              {
                ...payload,
                text: typeof payload?.text === 'string' ? payload.text : '',
              },
              getLocalISODate(),
              'push',
            );
            if (cached) {
              saveDailyVerseCache(cached).catch(() => {});
            }

            handleSocketNotification({
              title: 'Verse of the Day',
              body,
              data: { screen: route.home, kind: 'daily-verse' },
            }).catch(err =>
              console.error('daily verse socket notif failed:', err),
            );
          });
        })
        .catch(err => console.error('socket connect failed:', err));
    };

    // Connect early on mount (best effort)
    connectAndAttach();

    const sub = AppState.addEventListener('change', nextState => {
      const prev = appState.current;
      appState.current = nextState;

      // When coming back to foreground, ensure we reconnect.
      if (prev !== 'active' && nextState === 'active') {
        connectAndAttach();
      }
    });

    return () => {
      sub.remove();
      disconnectSocket().catch(err =>
        console.error('socket disconnect failed:', err),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debug, topicsKey]);

  // If auth changes, refresh socket auth (or disconnect on logout)
  useEffect(() => {
    refreshSocketAuth().catch(err =>
      console.error('socket auth refresh failed:', err),
    );
  }, [app?.userInfo?.token]);

  return <>{children}</>;
}
