import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
import { handlePlanNotificationPress } from '../../features/ReadingPlan/planNotificationService';

const ensureChannel = async () => {
  if (Platform.OS !== 'android') return 'exegesis-default';

  return await notifee.createChannel({
    id: 'exegesis-default',
    name: 'Exegesis Default Channel',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
};

export const showLocalNotificationFromSocket = async (payload: any) => {
  const channelId = await ensureChannel();

  const title = payload?.title ?? 'New Update';
  const body = payload?.body ?? payload?.message ?? '';

  await notifee.displayNotification({
    title,
    body,
    data: payload?.data ?? payload ?? {},
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
      sound: 'default',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  });
};

export const handleSocketNotification = async (
  payload: any,
  navigateFn?: (screen: string, params?: Record<string, any>) => void,
) => {
  // 1) show banner
  await showLocalNotificationFromSocket(payload);

  // 2) if your server sends routing info (like FCM data)
  const data = (payload?.data ?? payload) as Record<string, string>;
  if (data?.screen && navigateFn) {
    handlePlanNotificationPress(data, navigateFn);
  }
};
