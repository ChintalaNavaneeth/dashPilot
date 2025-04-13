import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';

type WakeContextType = {
  keepScreenOn: boolean;
  toggleKeepScreen: () => void;
};

const WakeContext = createContext<WakeContextType | undefined>(undefined);

export function WakeProvider({ children }: { children: React.ReactNode }) {
  const [keepScreenOn, setKeepScreenOn] = useState(true);

  useEffect(() => {
    loadWakePreference();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // For web, we'll try to activate wake lock only when the document is visible
      const handleVisibilityChange = () => {
        if (keepScreenOn) {
          if (document.visibilityState === 'visible') {
            activateKeepAwake();
          } else {
            deactivateKeepAwake();
          }
        }
      };

      // Initial check
      if (keepScreenOn && document.visibilityState === 'visible') {
        activateKeepAwake();
      }

      // Listen for visibility changes
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (keepScreenOn) {
          deactivateKeepAwake();
        }
      };
    } else {
      // For native platforms, we can directly use keep awake
      if (keepScreenOn) {
        try {
          activateKeepAwake();
        } catch (error) {
          console.error('Error activating keep awake:', error);
        }
      } else {
        try {
          deactivateKeepAwake();
        } catch (error) {
          console.error('Error deactivating keep awake:', error);
        }
      }

      return () => {
        try {
          deactivateKeepAwake();
        } catch (error) {
          console.error('Error deactivating keep awake on cleanup:', error);
        }
      };
    }
  }, [keepScreenOn]);

  const loadWakePreference = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setKeepScreenOn(settings.keepScreenOn);
      }
    } catch (error) {
      console.error('Error loading wake preference:', error);
    }
  };

  const toggleKeepScreen = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      const newSettings = { ...settings, keepScreenOn: !keepScreenOn };
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setKeepScreenOn(!keepScreenOn);
    } catch (error) {
      console.error('Error saving wake preference:', error);
    }
  };

  return (
    <WakeContext.Provider value={{ keepScreenOn, toggleKeepScreen }}>
      {children}
    </WakeContext.Provider>
  );
}

export function useWake() {
  const context = useContext(WakeContext);
  if (context === undefined) {
    throw new Error('useWake must be used within a WakeProvider');
  }
  return context;
}