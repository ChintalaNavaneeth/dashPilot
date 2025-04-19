import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { useTheme } from '@/hooks/useThemeContext';
import { useWake } from '@/hooks/useWakeContext';

interface Settings {
  darkMode: boolean;
  keepScreenOn: boolean;
  useVoiceCommands: boolean;
  useMetricUnits: boolean;
}

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { keepScreenOn, toggleKeepScreen } = useWake();

  const [settings, setSettings] = useState<Settings>({
    darkMode: isDarkMode,
    keepScreenOn: keepScreenOn,
    useVoiceCommands: true,
    useMetricUnits: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setSettings(prev => ({ 
      ...prev, 
      darkMode: isDarkMode,
      keepScreenOn: keepScreenOn,
    }));
  }, [isDarkMode, keepScreenOn]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      
      switch (key) {
        case 'darkMode':
          toggleTheme();
          break;
        case 'keepScreenOn':
          toggleKeepScreen();
          break;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const renderSettingItem = (
    title: string,
    description: string,
    key: keyof Settings,
    icon: string
  ) => (
    <View style={[styles.settingItem, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]}>
      <View style={[styles.settingIcon, { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }]}>
        <Ionicons name={icon as any} size={24} color={isDarkMode ? 'white' : 'black'} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: isDarkMode ? 'white' : 'black' }]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, { color: isDarkMode ? '#888' : '#666' }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => updateSetting(key, value)}
        trackColor={{ false: '#767577', true: '#4CAF50' }}
        thumbColor={settings[key] ? '#fff' : '#f4f3f4'}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={36} color={isDarkMode ? 'white' : 'black'} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: isDarkMode ? 'white' : 'black' }]}>Settings</Text>

      <ScrollView style={styles.scrollView}>
        {renderSettingItem(
          'Dark Mode',
          'Enable dark theme for better visibility while driving',
          'darkMode',
          'moon'
        )}

        {renderSettingItem(
          'Keep Screen On',
          'Prevent screen from turning off while app is active',
          'keepScreenOn',
          'sunny'
        )}

        <View style={[styles.appInfo, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]}>
          <Text style={[styles.appInfoTitle, { color: isDarkMode ? 'white' : 'black' }]}>
            About DashPilot
          </Text>
          <Text style={[styles.appInfoText, { color: isDarkMode ? '#888' : '#666' }]}>
            Version: 1.0.0
          </Text>
          <Text style={[styles.appInfoText, { color: isDarkMode ? '#888' : '#666' }]}>
            Build: 1
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    borderRadius: 25,
    zIndex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 80,
    marginLeft: 20,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  appInfo: {
    marginTop: 30,
    padding: 20,
    borderRadius: 10,
  },
  appInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  appInfoText: {
    fontSize: 16,
    marginBottom: 5,
  },
});