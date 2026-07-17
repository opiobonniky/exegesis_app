import React, { use, useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';
import AppNavigation from './src/component/navigations/AppNavigation';
import { AppProvider } from './src/common/AppContext';
import { initializeNotifications } from './src/utilits/firebaseService';
import { initBibleTTS } from './src/utilits/bibleTTS';
import SocketProvider from './src/services/socket/SocketProvider';
import { ConnectivityProvider } from './src/providers/ConnectivityProvider';
import OfflineBanner from './src/reusable/OfflineBanner';
import { toastConfig } from './src/helpers/Toash.helper';
import { LanguageProvider } from './src/component/language-translation/LanguageProvider';
import Toast from 'react-native-toast-message';
import {getVersion} from 'react-native-device-info';
import { getLatestAppVersion } from './src/config/get_app_version';
import ActionModal from './src/reusable/ActionModal';
const App = () => {

  const [isAppUpdated, setIsAppUpdated] = useState(true);
  const isAndroid = Platform.OS === 'android';
  const isIos = Platform.OS === 'ios';

  useEffect(() => {
  const checkAppVersion = async () => {
    try {
      const latestVersion = await getLatestAppVersion();
      const currentVersion = getVersion();

      if (latestVersion && currentVersion) {
        setIsAppUpdated(latestVersion === currentVersion);
      } else {
        setIsAppUpdated(true);
      }
    } catch (error:any) {
      console.error('Error fetching app version:', error.message);
      setIsAppUpdated(true);
    }
  }
  checkAppVersion();
  }, []);

  


  useEffect(() => {
    const setupApp = async () => {
      try {
        // await initializeNotifications();
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }

      try {
        await initBibleTTS();
      } catch (error) {
        console.error('Failed to initialize Bible TTS:', error);
      }
    };

    setupApp();
  }, []);

  return (
    <LanguageProvider>
      <AppProvider>
        <ConnectivityProvider>
        <View style={styles.root}>
          <SocketProvider
            topics={['notifications', 'daily-verse']}
            debug={__DEV__}
          >
            <AppNavigation />
          </SocketProvider>
          <OfflineBanner />
          <Toast config={toastConfig} />
        </View>
    <ActionModal
  visible={!isAppUpdated}  // works for both platforms now
  severity='warning'
  title='Update Available'
  message='A newer version of Exegesis is available. Please update to continue.'
  confirmLabel='Update'
  onConfirm={() => {
    if (isAndroid) {
      Linking.openURL('https://play.google.com/apps/internaltest/4701501480508116942');
    } else if (isIos) {
      Linking.openURL('https://testflight.apple.com/join/gppwGgRF'); // replace with your App Store ID
    }
    setIsAppUpdated(true);
  }}
/>
    </ConnectivityProvider>
    </AppProvider>
    </LanguageProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;