import messaging from '@react-native-firebase/messaging';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import notifee, {
  AuthorizationStatus,
  AndroidImportance,
} from '@notifee/react-native';

/**
 * Request notification permissions for Android 13+ using NATIVE API
 * This is now the PRIMARY method (not fallback) due to react-native-permissions issues
 */
const requestAndroidNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('📱 Using native Android PermissionsAndroid API');

    // First check if already granted
    const checkResult = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    if (checkResult) {
      console.log('✅ POST_NOTIFICATIONS already granted');
      return true;
    }

    console.log('🔔 Requesting POST_NOTIFICATIONS permission...');

    // Request permission with dialog
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Enable Notifications',
        message:
          'This app needs notification permission to keep you updated with Bible verses and reminders',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
    console.log('Permission result:', granted, '| Granted:', isGranted);

    if (!isGranted) {
      console.log('❌ Permission denied by user');
      Alert.alert(
        'Notification Permission',
        'Notifications are disabled. You can enable them in Settings > Apps > Exegesis > Notifications',
        [{ text: 'OK' }],
      );
    } else {
      console.log('✅ Permission granted by user');
    }

    return isGranted;
  } catch (error) {
    console.error('❌ Error with native permission request:', error);
    return false;
  }
};

/**
 * Request notification permissions for both iOS and Android
 */
const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('🔔 Requesting notification permission...');
    console.log('Platform:', Platform.OS);
    console.log('Platform Version:', Platform.Version);

    if (Platform.OS === 'ios') {
      // iOS: Request permission using Firebase Messaging
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('iOS Authorization status:', authStatus);
      console.log('iOS Permission enabled:', enabled);
      return enabled;
    }

    // Android: Check version
    const androidVersion =
      typeof Platform.Version === 'string'
        ? parseInt(Platform.Version, 10)
        : Platform.Version;

    console.log('Android Version:', androidVersion);

    if (androidVersion >= 33) {
      // Android 13+: Use native PermissionsAndroid API directly
      console.log(
        'Android 13+: Requesting POST_NOTIFICATIONS using native API...',
      );
      return await requestAndroidNotificationPermission();
    }

    // Android < 13: Notifications are granted by default
    console.log('Android < 13: Notifications enabled by default');
    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    Alert.alert(
      'Permission Error',
      `Failed to request notification permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );

    return false;
  }
};

/**
 * Check current notification permission status
 */
const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking notification permission...');

    if (Platform.OS === 'ios') {
      const authStatus = await messaging().hasPermission();
      const hasPermission =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log(
        'iOS permission status:',
        authStatus,
        '- Has permission:',
        hasPermission,
      );
      return hasPermission;
    }

    // Android
    const androidVersion =
      typeof Platform.Version === 'string'
        ? parseInt(Platform.Version, 10)
        : Platform.Version;

    console.log('Android version:', androidVersion);

    if (androidVersion >= 33) {
      // Android 13+: Use native API
      console.log('🔍 Checking POST_NOTIFICATIONS using native API');
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      console.log('Native check result:', granted);
      return granted;
    }

    console.log('Android < 13: Notifications enabled by default');
    return true;
  } catch (error) {
    console.error('❌ Error checking notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token after requesting permissions
 */
const getFcmToken = async (): Promise<string | null> => {
  try {
    console.log('🔑 Getting FCM token...');

    // First, request permissions
    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) {
      console.log(
        '❌ Notification permission not granted, cannot get FCM token',
      );
      return null;
    }

    // Get FCM token
    console.log('📡 Fetching FCM token from Firebase...');
    const token = await messaging().getToken();
    console.log('✅ FCM Token obtained:', token.substring(0, 50) + '...');
    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    Alert.alert(
      'FCM Token Error',
      `Failed to get FCM token: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );

    return null;
  }
};

/**
 * Create notification channel for Android (required for local notifications)
 */
const createNotificationChannel = async (): Promise<string | null> => {
  try {
    if (Platform.OS !== 'android') {
      console.log('ℹ️ Notification channels not needed on iOS');
      return null;
    }

    console.log('📢 Creating notification channel...');

    const channelId = await notifee.createChannel({
      id: 'exegesis-default',
      name: 'Exegesis Default Channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    console.log('✅ Channel created:', channelId);
    return channelId;
  } catch (error) {
    console.error('❌ Error creating notification channel:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }
};

/**
 * Display a simple test notification
 */
const displayTestNotification = async (
  title: string = 'Test Notification',
  body: string = 'This is a test notification',
): Promise<boolean> => {
  try {
    console.log('📤 Displaying test notification...');

    // Check permission first
    const hasPermission = await checkNotificationPermission();

    if (!hasPermission) {
      console.log('❌ No notification permission, requesting...');
      const granted = await requestNotificationPermission();
      if (!granted) {
        console.log('❌ Permission denied, cannot show notification');
        return false;
      }
    }

    const channelId = await createNotificationChannel();

    const notificationId = await notifee.displayNotification({
      title: title,
      body: body,
      ...(Platform.OS === 'android' && {
        android: {
          channelId: channelId || 'exegesis-default',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          sound: 'default',
          smallIcon: 'ic_launcher',
        },
      }),
      ...(Platform.OS === 'ios' && {
        ios: {
          sound: 'default',
          badgeCount: 1,
        },
      }),
    });

    console.log('✅ Test notification displayed, ID:', notificationId);
    return true;
  } catch (error) {
    console.error('❌ Error displaying test notification:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }
};

/**
 * Display a custom notification with data
 */
const displayCustomTestNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<boolean> => {
  try {
    console.log('📤 Displaying custom notification...');

    const hasPermission = await checkNotificationPermission();

    if (!hasPermission) {
      console.log('❌ No notification permission');
      const granted = await requestNotificationPermission();
      if (!granted) {
        return false;
      }
    }

    const channelId = await createNotificationChannel();

    const notificationId = await notifee.displayNotification({
      title: title,
      body: body,
      data: data,
      ...(Platform.OS === 'android' && {
        android: {
          channelId: channelId || 'exegesis-default',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          sound: 'default',
          smallIcon: 'ic_launcher',
        },
      }),
      ...(Platform.OS === 'ios' && {
        ios: {
          sound: 'default',
          badgeCount: 1,
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      }),
    });

    console.log('✅ Custom notification displayed, ID:', notificationId);
    return true;
  } catch (error) {
    console.error('❌ Error displaying custom test notification:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }
};

/**
 * Display a scheduled test notification
 */
const scheduleTestNotification = async (
  title: string = 'Scheduled Test',
  body: string = 'This is a scheduled test notification',
  delayInSeconds: number = 5,
): Promise<string | null> => {
  try {
    console.log(`⏰ Scheduling notification for ${delayInSeconds} seconds...`);

    const hasPermission = await checkNotificationPermission();

    if (!hasPermission) {
      console.log('❌ Permission not granted for scheduled notification');
      const granted = await requestNotificationPermission();
      if (!granted) {
        return null;
      }
    }

    const channelId = await createNotificationChannel();
    const trigger = {
      type: 1 as const, // TimestampTrigger
      timestamp: Date.now() + delayInSeconds * 1000,
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        title: title,
        body: body,
        ...(Platform.OS === 'android' && {
          android: {
            channelId: channelId || 'exegesis-default',
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
            sound: 'default',
            smallIcon: 'ic_launcher',
          },
        }),
        ...(Platform.OS === 'ios' && {
          ios: {
            sound: 'default',
          },
        }),
      },
      trigger,
    );

    console.log(`✅ Notification scheduled with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('❌ Error scheduling test notification:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }
};

/**
 * Setup FCM listeners for foreground and background notifications
 */
const setupNotificationListeners = () => {
  console.log('📡 Setting up notification listeners...');

  // Handle foreground notifications
  messaging().onMessage(async remoteMessage => {
    console.log('📬 Foreground notification received:', remoteMessage);

    const channelId = await createNotificationChannel();

    // Display notification using Notifee for better control
    await notifee.displayNotification({
      title: remoteMessage.notification?.title || 'New Message',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data,
      ...(Platform.OS === 'android' && {
        android: {
          channelId: channelId || 'exegesis-default',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          sound: 'default',
          smallIcon: 'ic_launcher',
        },
      }),
      ...(Platform.OS === 'ios' && {
        ios: {
          sound: 'default',
          badgeCount: 1,
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      }),
    });
  });

  // Handle notification opened (app was in background/quit state)
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('📱 Notification opened app from background:', remoteMessage);
    // Navigate to specific screen based on notification data
  });

  // Check if app was opened by a notification (from quit state)
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log(
          '🚀 App opened from quit state by notification:',
          remoteMessage,
        );
        // Navigate to specific screen based on notification data
      }
    });

  // Handle background messages (both iOS and Android)
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('📭 Background message received:', remoteMessage);
  });

  // Handle notification press events from Notifee
  notifee.onForegroundEvent(({ type, detail }) => {
    console.log('EVENT TYPE = ', type);

    if (type === 1) {
      console.log('🔥 Notification CLICKED (foreground)');
      console.log('Notification data:', detail.notification?.data);

      // Example action
      console.log('User tapped notification');
    }
  });

  console.log('✅ Notification listeners setup complete');
};

/**
 * Request permission to use Notifee for local notifications
 */
const requestNotifeePermission = async (): Promise<boolean> => {
  try {
    console.log('🔔 Requesting Notifee permission...');
    const settings = await notifee.requestPermission();
    console.log('Notifee permission settings:', settings);

    if (Platform.OS === 'ios') {
      const hasPermission =
        settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
      console.log('iOS Notifee permission:', hasPermission);
      return hasPermission;
    }

    const hasPermission =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    console.log('Android Notifee permission:', hasPermission);
    return hasPermission;
  } catch (error) {
    console.error('❌ Error requesting Notifee permission:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }
};

/**
 * Initialize FCM and notification services
 */
const initializeNotifications = async () => {
  try {
    console.log('🚀 Initializing notifications...');

    // Create default channel for Android
    await createNotificationChannel();

    // Setup listeners first
    setupNotificationListeners();

    // Request permissions and get token
    const token = await getFcmToken();

    if (token) {
      console.log('✅ Notifications initialized successfully');
      return token;
    } else {
      console.log('❌ Failed to initialize notifications - no token received');
      return null;
    }
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }
};

/**
 * Test all notification types
 */
const runNotificationTests = async () => {
  console.log('🧪 Running notification tests...');

  // Test 1: Simple notification
  console.log('Test 1: Displaying simple notification...');
  await displayTestNotification(
    'Welcome to Exegesis! 📖',
    'Your daily Bible verse is ready',
  );

  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 2: Custom notification
  console.log('Test 2: Displaying custom notification...');
  await displayCustomTestNotification(
    'New Bible Verse Available',
    "Tap to read today's verse of inspiration",
    { screen: 'BibleVerse', verseId: '123' },
  );

  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 3: Scheduled notification
  console.log('Test 3: Scheduling notification for 5 seconds...');
  await scheduleTestNotification(
    'Reminder ⏰',
    'This is your scheduled test notification',
    5,
  );

  console.log('✅ All notification tests completed!');
};

export {
  getFcmToken,
  requestNotificationPermission,
  setupNotificationListeners,
  checkNotificationPermission,
  requestNotifeePermission,
  initializeNotifications,
  displayTestNotification,
  displayCustomTestNotification,
  scheduleTestNotification,
  createNotificationChannel,
  runNotificationTests,
};
