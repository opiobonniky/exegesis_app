import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import AppNavigation from './src/component/navigations/AppNavigation';
import { AppProvider } from './src/common/AppContext';
import { initializeNotifications } from './src/utilits/firebaseService';
import SocketProvider from './src/services/socket/SocketProvider';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/helpers/Toash.helper';

const App = () => {
  useEffect(() => {
    // Initialize notifications when app starts
    const setupNotifications = async () => {
      try {
        const token = await initializeNotifications();
        if (token) {
          console.log('✅ App notifications initialized with token:', token);
          // TODO: Send token to your backend server
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    setupNotifications();
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
