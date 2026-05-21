import React, { use, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import AppNavigation from './src/component/navigations/AppNavigation';
import { AppProvider } from './src/common/AppContext';
import { initializeNotifications } from './src/utilits/firebaseService';
import { initBibleTTS } from './src/utilits/bibleTTS';
import SocketProvider from './src/services/socket/SocketProvider';
import { toastConfig } from './src/helpers/Toash.helper';
import { LanguageProvider } from './src/component/language-translation/LanguageProvider';
import Toast from 'react-native-toast-message';
import {getVersion} from 'react-native-device-info';
import { getLatestAppVersion } from './src/config/get_app_version';
import ActionModal from './src/reusable/ActionModal';
const App = () => {

  const [isAppUpdated, setIsAppUpdated] = useState(true);

  useEffect(() => {
  const checkAppVersion = async () => {
    try {
      const latestVersion = await getLatestAppVersion();
      const currentVersion = getVersion();

      console.log('Latest version from Firestore:', latestVersion);
      console.log('Current app version:', currentVersion);

      if (latestVersion && currentVersion) {
        setIsAppUpdated(latestVersion === currentVersion);
        console.log('Is app updated?', latestVersion === currentVersion+ ' is app updated?' + isAppUpdated);
      } else {
        console.warn('Could not determine app version.');
        
        setIsAppUpdated(true); // Assume updated if we can't check
      }
    } catch (error:any) {
      console.error('Error fetching app version:', error.message);
      setIsAppUpdated(true); // Assume updated in case of error
    }
  }
  checkAppVersion();
  }, []);



  useEffect(() => {
    const setupApp = async () => {
      try {
        await initializeNotifications();
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
        <View style={styles.root}>
          <SocketProvider
            topics={['notifications', 'daily-verse']}
            debug={__DEV__}
          >
            <AppNavigation />
          </SocketProvider>
          <Toast config={toastConfig} />
        </View>
      <ActionModal
        visible={!isAppUpdated}
        severity='warning'
        title='Update Available'
        message='A newer version of Exegesis is available. Please update to continue.'
        confirmLabel='Update'
        onConfirm={() => {
        // Open Google Play internal test page for Android update
        Linking.openURL('https://play.google.com/apps/internaltest/4701501480508116942');
        setIsAppUpdated(true);
        }}
      />
    </AppProvider>
    </LanguageProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;