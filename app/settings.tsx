import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { useTheme } from '@/hooks/useThemeContext';
import { useWake } from '@/hooks/useWakeContext';
import { useBluetooth } from '@/hooks/useBluetoothContext';

interface Settings {
  darkMode: boolean;
  keepScreenOn: boolean;
  useVoiceCommands: boolean;
  useMetricUnits: boolean;
  autoBluetoothConnect: boolean;
}

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { keepScreenOn, toggleKeepScreen } = useWake();
  const { 
    isEnabled, 
    isConnected, 
    autoConnect, 
    toggleAutoConnect, 
    availableDevices, 
    pairedDevices,
    connectedDeviceInfo,
    connect,
    disconnect,
    scanDevices
  } = useBluetooth();

  const [settings, setSettings] = useState<Settings>({
    darkMode: isDarkMode,
    keepScreenOn: keepScreenOn,
    useVoiceCommands: true,
    useMetricUnits: true,
    autoBluetoothConnect: autoConnect,
  });
  
  const [showBluetoothModal, setShowBluetoothModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'paired' | 'available'>('paired');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setSettings(prev => ({ 
      ...prev, 
      darkMode: isDarkMode,
      keepScreenOn: keepScreenOn,
      autoBluetoothConnect: autoConnect
    }));
  }, [isDarkMode, keepScreenOn, autoConnect]);

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
        case 'autoBluetoothConnect':
          toggleAutoConnect();
          break;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleDevicePress = async (deviceId: string, isConnected: boolean) => {
    try {
      if (isConnected) {
        await disconnect();
      } else {
        await connect(deviceId);
      }
    } catch (error) {
      console.error('Error handling device connection:', error);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await scanDevices();
      setSelectedTab('available');
    } catch (error) {
      console.error('Error scanning:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const renderDeviceItem = (device: { id: string; name: string; address?: string }, isActive: boolean = false) => (
    <TouchableOpacity
      key={device.id}
      style={[
        styles.deviceItem, 
        { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' },
        isActive && styles.activeDevice
      ]}
      onPress={() => handleDevicePress(device.id, isActive)}
    >
      <View style={[styles.deviceIcon, { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }]}>
        <Ionicons 
          name={isActive ? "bluetooth" : "bluetooth-outline"} 
          size={24} 
          color={isActive ? '#4CAF50' : (isDarkMode ? 'white' : 'black')} 
        />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceName, { color: isDarkMode ? 'white' : 'black' }]}>
          {device.name || 'Unknown Device'}
        </Text>
        {device.address && (
          <Text style={[styles.deviceAddress, { color: isDarkMode ? '#888' : '#666' }]}>
            {device.address}
          </Text>
        )}
      </View>
      <Ionicons 
        name={isActive ? "close-circle" : "checkmark-circle"} 
        size={24} 
        color={isActive ? '#f44336' : '#4CAF50'} 
      />
    </TouchableOpacity>
  );

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
        
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]}
          onPress={() => setShowBluetoothModal(true)}
        >
          <View style={[styles.settingIcon, { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }]}>
            <Ionicons 
              name="bluetooth" 
              size={24} 
              color={isConnected ? '#4CAF50' : (isDarkMode ? 'white' : 'black')} 
            />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: isDarkMode ? 'white' : 'black' }]}>
              OBD Devices
            </Text>
            <Text style={[styles.settingDescription, { color: isDarkMode ? '#888' : '#666' }]}>
              {isConnected 
                ? `Connected to ${connectedDeviceInfo?.name}`
                : 'Manage OBD device connections'}
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isDarkMode ? 'white' : 'black'} 
          />
        </TouchableOpacity>

        {renderSettingItem(
          'Auto-connect',
          'Automatically connect to last used OBD device',
          'autoBluetoothConnect',
          'git-network'
        )}

        <View style={[styles.appInfo, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]}>
          <Text style={[styles.appInfoTitle, { color: isDarkMode ? 'white' : 'black' }]}>
            About DashPilot
          </Text>
          <Text style={[styles.appInfoText, { color: isDarkMode ? '#888' : '#666' }]}>
            Version: 2.0.0
          </Text>
          <Text style={[styles.appInfoText, { color: isDarkMode ? '#888' : '#666' }]}>
            Build: 1
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showBluetoothModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBluetoothModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1a1a1a' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? 'white' : 'black' }]}>
                OBD Devices
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }]}
                onPress={() => setShowBluetoothModal(false)}
              >
                <Ionicons name="close" size={24} color={isDarkMode ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  selectedTab === 'paired' && styles.activeTab,
                  { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }
                ]}
                onPress={() => setSelectedTab('paired')}
              >
                <Text style={[styles.tabText, { color: isDarkMode ? 'white' : 'black' }]}>
                  Paired
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  selectedTab === 'available' && styles.activeTab,
                  { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }
                ]}
                onPress={() => setSelectedTab('available')}
              >
                <Text style={[styles.tabText, { color: isDarkMode ? 'white' : 'black' }]}>
                  Available
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.deviceList}>
              {selectedTab === 'paired' ? (
                pairedDevices.length > 0 ? (
                  pairedDevices.map(device => 
                    renderDeviceItem(device, connectedDeviceInfo?.id === device.id)
                  )
                ) : (
                  <Text style={[styles.emptyText, { color: isDarkMode ? '#888' : '#666' }]}>
                    No paired devices found
                  </Text>
                )
              ) : (
                availableDevices.length > 0 ? (
                  availableDevices.map(device => 
                    renderDeviceItem(device, connectedDeviceInfo?.id === device.id)
                  )
                ) : (
                  <Text style={[styles.emptyText, { color: isDarkMode ? '#888' : '#666' }]}>
                    No available devices found
                  </Text>
                )
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.scanButton,
                { backgroundColor: isScanning ? '#666' : '#4CAF50' }
              ]}
              onPress={handleScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="refresh" size={24} color="white" />
                  <Text style={styles.scanButtonText}>Scan for Devices</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceList: {
    maxHeight: 400,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  activeDevice: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
  },
  deviceAddress: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});