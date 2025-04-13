import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BluetoothSerial from 'react-native-bluetooth-serial-next';
import { Alert, Platform } from 'react-native';

type BluetoothDevice = {
  id: string;
  name: string;
  address?: string;
};

type BluetoothContextType = {
  isEnabled: boolean;
  isConnected: boolean;
  autoConnect: boolean;
  connectionError: string | null;
  availableDevices: BluetoothDevice[];
  pairedDevices: BluetoothDevice[];
  connectedDeviceInfo: BluetoothDevice | null;
  toggleAutoConnect: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendCommand: (command: string) => Promise<string>;
  clearBuffer: () => void;
  scanDevices: () => Promise<void>;
};

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

const LAST_CONNECTED_DEVICE_KEY = 'lastConnectedBluetoothDevice';
const DRIVER_CONFIG = {
  baudRate: 38400,
  protocol: 'elm327' as const,
  bufferSize: 1024,
};

export function BluetoothProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDeviceInfo, setConnectedDeviceInfo] = useState<BluetoothDevice | null>(null);
  const bluetoothInitialized = useRef(false);

  useEffect(() => {
    if (!bluetoothInitialized.current) {
      initializeBluetooth();
      loadAutoConnectPreference();
      bluetoothInitialized.current = true;
    }

    return () => {
      if (isConnected && BluetoothSerial?.disconnect) {
        BluetoothSerial.disconnect().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (autoConnect && !isConnected) {
      connectToLastDevice();
    }
  }, [autoConnect, isEnabled]);

  const initializeBluetooth = async () => {
    if (Platform.OS === 'web') return;

    try {
      const enabled = await BluetoothSerial.isEnabled();
      setIsEnabled(enabled);

      if (!enabled) {
        const requested = await BluetoothSerial.requestEnable();
        setIsEnabled(requested);
        if (!requested) {
          setConnectionError('Bluetooth is not enabled');
          return;
        }
      }

      const devices = await BluetoothSerial.list();
      setPairedDevices(devices);

      BluetoothSerial.on('data', (data: any) => {
        if (data?.type === 'connect') {
          setIsConnected(true);
        } else if (data?.type === 'disconnect') {
          setIsConnected(false);
          setConnectedDeviceInfo(null);
        }
      });

      BluetoothSerial.on('error', (error) => {
        console.error('Bluetooth error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        setConnectedDeviceInfo(null);
      });

    } catch (error) {
      console.error('Error initializing Bluetooth:', error);
      setConnectionError('Failed to initialize Bluetooth');
      setIsEnabled(false);
    }
  };

  const loadAutoConnectPreference = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setAutoConnect(settings.autoBluetoothConnect ?? false);
      }
    } catch (error) {
      console.error('Error loading auto-connect preference:', error);
    }
  };

  const toggleAutoConnect = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      const newAutoConnect = !autoConnect;
      await AsyncStorage.setItem('userSettings', JSON.stringify({
        ...settings,
        autoBluetoothConnect: newAutoConnect
      }));
      setAutoConnect(newAutoConnect);
    } catch (error) {
      console.error('Error toggling auto-connect:', error);
      throw new Error('Failed to toggle auto-connect');
    }
  };

  const connectToLastDevice = async () => {
    try {
      const lastDeviceId = await AsyncStorage.getItem(LAST_CONNECTED_DEVICE_KEY);
      if (lastDeviceId) {
        await connect(lastDeviceId);
      }
    } catch (error) {
      console.error('Error connecting to last device:', error);
    }
  };

  const connect = async (deviceId: string) => {
    if (!isEnabled) {
      throw new Error('Bluetooth is not enabled');
    }

    try {
      setConnectionError(null);
      const connected = await BluetoothSerial.connect(deviceId, DRIVER_CONFIG);
      if (connected) {
        const device = [...pairedDevices, ...availableDevices].find(d => d.id === deviceId);
        if (device) {
          setConnectedDeviceInfo(device);
          setIsConnected(true);
          await AsyncStorage.setItem(LAST_CONNECTED_DEVICE_KEY, deviceId);
        }
      } else {
        throw new Error('Failed to connect to device');
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
      setConnectionError('Failed to connect to device');
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      if (!isConnected) return;

      if (!BluetoothSerial || typeof BluetoothSerial.disconnect !== 'function') {
        throw new Error('BluetoothSerial is not available or improperly initialized');
      }

      const enabled = await BluetoothSerial.isEnabled();
      if (!enabled) {
        throw new Error('Bluetooth is not enabled');
      }

      const disconnected = await BluetoothSerial.disconnect();
      if (!disconnected) {
        throw new Error('Failed to disconnect from device');
      }

      setIsConnected(false);
      setConnectedDeviceInfo(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      setIsConnected(false);
      setConnectedDeviceInfo(null);
      throw error;
    }
  };

  const sendCommand = async (command: string): Promise<string> => {
    if (!isConnected) {
      throw new Error('No device connected');
    }

    try {
      await BluetoothSerial.write(command);
      const response = await Promise.race([
        BluetoothSerial.readLine(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Command timeout')), 5000)
        )
      ]);
      return response as string;
    } catch (error) {
      console.error('Error sending command:', error);
      throw new Error('Failed to send command to device');
    }
  };

  const clearBuffer = () => {
    if (isConnected && typeof BluetoothSerial.clear === 'function') {
      BluetoothSerial.clear();
    }
  };

  const scanDevices = async () => {
    if (!isEnabled) {
      throw new Error('Bluetooth is not enabled');
    }

    try {
      const devices = await BluetoothSerial.discoverUnpairedDevices();
      setAvailableDevices(devices.filter(device =>
        !pairedDevices.some(paired => paired.id === device.id)
      ));
    } catch (error) {
      console.error('Error scanning devices:', error);
      throw new Error('Failed to scan for devices');
    }
  };

  return (
    <BluetoothContext.Provider value={{
      isEnabled,
      isConnected,
      autoConnect,
      connectionError,
      availableDevices,
      pairedDevices,
      connectedDeviceInfo,
      toggleAutoConnect,
      connect,
      disconnect,
      sendCommand,
      clearBuffer,
      scanDevices,
    }}>
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
