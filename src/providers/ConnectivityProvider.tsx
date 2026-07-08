import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { processQueue } from '../services/syncQueue';

interface ConnectivityContextType {
  isOnline: boolean | null;
  isChecking: boolean;
}

const ConnectivityContext = createContext<ConnectivityContextType>({
  isOnline: null,
  isChecking: true,
});

export const useConnectivity = () => useContext(ConnectivityContext);

export const ConnectivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const wasOffline = useRef(false);

  const handleConnectivityChange = useCallback((state: NetInfoState) => {
    const connected = state.isConnected ?? false;
    setIsOnline(connected);
    setIsChecking(false);

    if (connected && wasOffline.current) {
      processQueue();
    }

    wasOffline.current = !connected;
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected ?? false);
      setIsChecking(false);
    });
    return () => unsubscribe();
  }, [handleConnectivityChange]);

  return (
    <ConnectivityContext.Provider value={{ isOnline, isChecking }}>
      {children}
    </ConnectivityContext.Provider>
  );
};
