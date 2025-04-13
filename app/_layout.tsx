import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { Platform } from 'react-native';
import { StyleSheet, View } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/hooks/useThemeContext';
import { WakeProvider } from '@/hooks/useWakeContext';
import { BluetoothProvider } from '../hooks/useBluetoothContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNavigation({ theme }: { theme: 'light' | 'dark' }) {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
    // Hide system UI (immersive mode)
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <NavigationThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#000' : '#fff' }]}>
        <Stack screenOptions={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false,
          statusBarHidden: true
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="navigation" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="obd" />
          <Stack.Screen name="speedo" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <WakeProvider>
        <BluetoothProvider>
          <ThemeAwareNavigation />
        </BluetoothProvider>
      </WakeProvider>
    </ThemeProvider>
  );
}

function ThemeAwareNavigation() {
  const { isDarkMode } = useTheme();
  return <RootLayoutNavigation theme={isDarkMode ? 'dark' : 'light'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
