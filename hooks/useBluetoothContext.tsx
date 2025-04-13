import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only import Bluetooth on Android and ensure it's loaded
let RNBluetoothSerial: any = null;
if (Platform.OS === 'android') {
  try {
    const BluetoothSerialModule = require('react-native-bluetooth-serial-next');
    RNBluetoothSerial = BluetoothSerialModule.default || BluetoothSerialModule;
    if (!RNBluetoothSerial) {
      console.error('Failed to load BluetoothSerial module');
    }
  } catch (error) {
    console.error('Error loading BluetoothSerial module:', error);
  }
}

interface BluetoothDevice {
  id: string;
  name: string;
  address?: string;
  class?: string | number;
  bondState?: number;
}

interface ConnectedDeviceInfo {
  id: string;
  name: string;
}

type BluetoothContextType = {
  isEnabled: boolean;
  isConnected: boolean;
  autoConnect: boolean;
  availableDevices: BluetoothDevice[];
  pairedDevices: BluetoothDevice[];
  connectedDeviceInfo: ConnectedDeviceInfo | null;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  scanDevices: () => Promise<void>;
  toggleAutoConnect: () => Promise<void>;
};

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

const isSupportedPlatform = Platform.OS === 'android';

export function BluetoothProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDeviceInfo, setConnectedDeviceInfo] = useState<ConnectedDeviceInfo | null>(null);
  const [isBluetoothReady, setIsBluetoothReady] = useState(false);

  const initializeBluetooth = async () => {
    if (!isSupportedPlatform) {
      setIsBluetoothReady(false);
      return;
    }

    if (!RNBluetoothSerial) {
      console.error('BluetoothSerial module not available');
      setIsBluetoothReady(false);
      return;
    }

    try {
      // First check if the module is properly loaded
      if (typeof RNBluetoothSerial.isEnabled !== 'function') {
        throw new Error('BluetoothSerial methods not available');
      }

      // Check if Bluetooth is enabled
      const enabled = await RNBluetoothSerial.isEnabled();
      setIsEnabled(enabled);

      if (enabled) {
        // Verify list method is available
        if (typeof RNBluetoothSerial.list !== 'function') {
          throw new Error('BluetoothSerial list method not available');
        }
        const devices = await RNBluetoothSerial.list();
        setPairedDevices(devices);
        setIsBluetoothReady(true);
      } else {
        try {
          // Verify requestEnable method is available
          if (typeof RNBluetoothSerial.requestEnable !== 'function') {
            throw new Error('BluetoothSerial requestEnable method not available');
          }
          const enabled = await RNBluetoothSerial.requestEnable();
          setIsEnabled(enabled);
          if (enabled) {
            const devices = await RNBluetoothSerial.list();
            setPairedDevices(devices);
            setIsBluetoothReady(true);
          }
        } catch (enableError) {
          console.error('Error enabling Bluetooth:', enableError);
          setIsBluetoothReady(false);
        }
      }
    } catch (error) {
      console.error('Error initializing Bluetooth:', error);
      setIsBluetoothReady(false);
      setIsEnabled(false);
    }
  };

  useEffect(() => {
    loadBluetoothPreferences();
    if (isSupportedPlatform) {
      initializeBluetooth();
    }
  }, []);

  useEffect(() => {
    if (autoConnect && !isConnected && pairedDevices.length > 0) {
      connectToLastDevice();
    }
  }, [autoConnect, isEnabled, pairedDevices]);

  // Add new useEffect to verify Bluetooth module on mount
  useEffect(() => {
    if (isSupportedPlatform) {
      // Verify module is loaded
      if (!RNBluetoothSerial) {
        console.error('BluetoothSerial module not available on mount');
        setIsBluetoothReady(false);
        return;
      }

      // Verify required methods exist
      const requiredMethods = ['isEnabled', 'requestEnable', 'list', 'connect', 'disconnect', 'discoverUnpairedDevices'];
      const missingMethods = requiredMethods.filter(method => typeof RNBluetoothSerial[method] !== 'function');
      
      if (missingMethods.length > 0) {
        console.error('Missing BluetoothSerial methods:', missingMethods);
        setIsBluetoothReady(false);
        return;
      }

      setIsBluetoothReady(true);
    }
  }, []);

  const loadBluetoothPreferences = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setAutoConnect(settings.autoBluetoothConnect || false);
      }
    } catch (error) {
      console.error('Error loading Bluetooth preferences:', error);
    }
  };

  const connectToLastDevice = async () => {
    if (!isSupportedPlatform) return;
    
    try {
      const lastDeviceJson = await AsyncStorage.getItem('lastConnectedDevice');
      if (lastDeviceJson) {
        const lastDevice: ConnectedDeviceInfo = JSON.parse(lastDeviceJson);
        await connect(lastDevice.id);
      }
    } catch (error) {
      console.error('Error auto-connecting:', error);
    }
  };

  const connect = async (deviceId: string) => {
    if (!isSupportedPlatform || !RNBluetoothSerial) {
      return;
    }

    try {
      // Check if Bluetooth is ready
      if (!isBluetoothReady) {
        throw new Error('Bluetooth not ready');
      }

      await RNBluetoothSerial.connect(deviceId);
      setIsConnected(true);

      // Find the device info from either paired or available devices
      const device = [...pairedDevices, ...availableDevices].find(d => d.id === deviceId);
      if (device) {
        const deviceInfo = { id: device.id, name: device.name };
        setConnectedDeviceInfo(deviceInfo);
        await AsyncStorage.setItem('lastConnectedDevice', JSON.stringify(deviceInfo));
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
      setIsConnected(false);
      setConnectedDeviceInfo(null);
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  const disconnect = async () => {
    // Early return if not on Android
    if (!isSupportedPlatform) {
      setIsConnected(false);
      setConnectedDeviceInfo(null);
      return;
    }

    // Check if module is available
    if (!RNBluetoothSerial) {
      console.error('BluetoothSerial module not available');
      setIsConnected(false);
      setConnectedDeviceInfo(null);
      return;
    }

    try {
      // Verify disconnect method exists
      if (typeof RNBluetoothSerial.disconnect !== 'function') {
        throw new Error('BluetoothSerial disconnect method not available');
      }

      // Only try to disconnect if we think we're connected
      if (isConnected) {
        await RNBluetoothSerial.disconnect();
      }

      // Clean up state
      setIsConnected(false);
      setConnectedDeviceInfo(null);
    } catch (error) {
      console.error('Error during disconnect:', error);
      // Still clean up state even if disconnect fails
      setIsConnected(false);
      setConnectedDeviceInfo(null);
      
      // Show error to user
      Alert.alert(
        'Disconnect Error',
        'Failed to disconnect from device. The connection state has been reset.'
      );
    }
  };

  const scanDevices = async () => {
    if (!isSupportedPlatform || !RNBluetoothSerial) {
      return;
    }

    try {
      if (!isEnabled) {
        await initializeBluetooth();
      }
      
      const devices = await RNBluetoothSerial.discoverUnpairedDevices();
      setAvailableDevices(devices);
    } catch (error) {
      console.error('Error scanning devices:', error);
      Alert.alert('Scan Error', 'Failed to scan for devices');
    }
  };

  const toggleAutoConnect = async () => {
    try {
      const newAutoConnect = !autoConnect;
      const savedSettings = await AsyncStorage.getItem('userSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      const newSettings = { ...settings, autoBluetoothConnect: newAutoConnect };
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setAutoConnect(newAutoConnect);
    } catch (error) {
      console.error('Error saving auto-connect preference:', error);
    }
  };

  // Default context value for non-supported platforms
  const defaultContextValue: BluetoothContextType = {
    isEnabled: false,
    isConnected: false,
    autoConnect: false,
    availableDevices: [],
    pairedDevices: [],
    connectedDeviceInfo: null,
    connect: async () => {},
    disconnect: async () => {},
    scanDevices: async () => {},
    toggleAutoConnect: async () => {},
  };

  return (
    <BluetoothContext.Provider
      value={isSupportedPlatform ? {
        isEnabled,
        isConnected,
        autoConnect,
        availableDevices,
        pairedDevices,
        connectedDeviceInfo,
        connect,
        disconnect,
        scanDevices,
        toggleAutoConnect,
      } : defaultContextValue}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const context = useContext(BluetoothContext);
  if (context === undefined) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
}