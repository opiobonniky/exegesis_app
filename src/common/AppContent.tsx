import React, { useState, useEffect, useContext } from 'react';
import { View, Alert } from 'react-native';
import AppNavigation from '../component/navigations/AppNavigation';
import { AppProvider, AppContext } from './AppContext';
import { initializeNotifications } from '../utilits/firebaseService';
import { initBibleTTS } from '../utilits/bibleTTS';
import SocketProvider from '../services/socket/SocketProvider';
import { toastConfig } from '../helpers/Toash.helper';
import { LanguageProvider } from '../component/language-translation/LanguageProvider';
import Toast from 'react-native-toast-message';
import SplashOverlay from './SplashOverlay';

const MainContent: React.FC = () => {
  const { loading } = useContext(AppContext) ?? { loading: true };
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initServices = async () => {
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

    initServices();
  }, []);

  // Force dismiss splash after 10 seconds if still loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (showSplash) {
        console.log('Force dismissing splash after timeout');
        setShowSplash(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!loading && showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <View style={{ flex: 1 }}>
      <SplashOverlay visible={showSplash} onHide={() => setShowSplash(false)} />
      <SocketProvider
        topics={['notifications', 'daily-verse']}
        debug={__DEV__}
      >
        <AppNavigation />
      </SocketProvider>
      <Toast config={toastConfig} />
    </View>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </LanguageProvider>
  );
};

export default App;