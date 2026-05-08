import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import AppNavigation from './src/component/navigations/AppNavigation';
import { AppProvider } from './src/common/AppContext';
import { initializeNotifications } from './src/utilits/firebaseService';
import { initBibleTTS } from './src/utilits/bibleTTS';
import SocketProvider from './src/services/socket/SocketProvider';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/helpers/Toash.helper';

const App = () => {
  useEffect(() => {
    const setupApp = async () => {
      try {
        const token = await initializeNotifications();
        if (token) {
          console.log('✅ App notifications initialized with token:', token);
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }

      try {
        await initBibleTTS();
        console.log('✅ Bible TTS initialized');
      } catch (error) {
        console.error('Failed to initialize Bible TTS:', error);
      }
    };

    setupApp();
  }, []);

  return (
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
    </AppProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
