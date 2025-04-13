import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useThemeContext';
import { useBluetooth } from '../hooks/useBluetoothContext';
import BluetoothSerial from 'react-native-bluetooth-serial-next';

interface OBDData {
  rpm: number | null;
  speed: number | null;
  coolantTemp: number | null;
  fuelLevel: number | null;
  engineLoad: number | null;
  throttlePos: number | null;
  batteryVoltage: number | null;
}

const INITIAL_OBD_DATA: OBDData = {
  rpm: null,
  speed: null,
  coolantTemp: null,
  fuelLevel: null,
  engineLoad: null,
  throttlePos: null,
  batteryVoltage: null,
};

// OBD-II PID commands
const PID_COMMANDS = {
  RPM: '010C',            // Engine RPM
  SPEED: '010D',          // Vehicle speed
  COOLANT_TEMP: '0105',   // Engine coolant temperature
  FUEL_LEVEL: '012F',     // Fuel level input
  ENGINE_LOAD: '0104',    // Calculated engine load
  THROTTLE_POS: '0111',   // Throttle position
  CONTROL_MODULE_VOLTAGE: '0142', // Control module voltage
};

const OBD_DRIVER_CONFIG = {
  baudRate: 38400,
  protocol: 'elm327' as const,
  bufferSize: 1024,
};

export default function OBDScreen() {
  const { isDarkMode } = useTheme();
  const { 
    isConnected, 
    connectedDeviceInfo, 
    connectionError,
    connect,
    sendCommand,
    clearBuffer 
  } = useBluetooth();
  
  const [data, setData] = useState<OBDData>(INITIAL_OBD_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sendOBDCommand = useCallback(async (command: string): Promise<string> => {
    try {
      clearBuffer(); // Clear any stale data
      const response = await sendCommand(command + '\r');
      const parts = response.split(' ');
      if (parts[0] === '41') {
        return parts.slice(2).join('');
      }
      throw new Error('Invalid OBD response format');
    } catch (error) {
      console.error(`Error sending OBD command ${command}:`, error);
      throw error;
    }
  }, [sendCommand, clearBuffer]);

  const parseOBDData = useCallback((pid: string, hexData: string): number => {
    const value = parseInt(hexData, 16);
    switch (pid) {
      case PID_COMMANDS.RPM:
        return ((value >> 8) * 256 + (value & 0xFF)) / 4; // RPM = ((A * 256) + B) / 4
      case PID_COMMANDS.SPEED:
        return value; // Speed in km/h
      case PID_COMMANDS.COOLANT_TEMP:
        return value - 40; // Temperature in °C
      case PID_COMMANDS.FUEL_LEVEL:
        return (value * 100) / 255; // Percentage
      case PID_COMMANDS.ENGINE_LOAD:
        return (value * 100) / 255; // Percentage
      case PID_COMMANDS.THROTTLE_POS:
        return (value * 100) / 255; // Percentage
      case PID_COMMANDS.CONTROL_MODULE_VOLTAGE:
        return value / 1000; // Voltage
      default:
        return value;
    }
  }, []);

  const fetchOBDData = useCallback(async () => {
    if (!isConnected) {
      setError('No OBD device connected');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const newData: OBDData = { ...INITIAL_OBD_DATA };

      // Fetch each PID value
      const [rpm, speed, coolant, fuel, load, throttle, voltage] = await Promise.all([
        sendOBDCommand(PID_COMMANDS.RPM),
        sendOBDCommand(PID_COMMANDS.SPEED),
        sendOBDCommand(PID_COMMANDS.COOLANT_TEMP),
        sendOBDCommand(PID_COMMANDS.FUEL_LEVEL),
        sendOBDCommand(PID_COMMANDS.ENGINE_LOAD),
        sendOBDCommand(PID_COMMANDS.THROTTLE_POS),
        sendOBDCommand(PID_COMMANDS.CONTROL_MODULE_VOLTAGE),
      ]);

      // Parse the responses
      newData.rpm = parseOBDData(PID_COMMANDS.RPM, rpm);
      newData.speed = parseOBDData(PID_COMMANDS.SPEED, speed);
      newData.coolantTemp = parseOBDData(PID_COMMANDS.COOLANT_TEMP, coolant);
      newData.fuelLevel = parseOBDData(PID_COMMANDS.FUEL_LEVEL, fuel);
      newData.engineLoad = parseOBDData(PID_COMMANDS.ENGINE_LOAD, load);
      newData.throttlePos = parseOBDData(PID_COMMANDS.THROTTLE_POS, throttle);
      newData.batteryVoltage = parseOBDData(PID_COMMANDS.CONTROL_MODULE_VOLTAGE, voltage);

      setData(newData);
    } catch (error) {
      console.error('Error fetching OBD data:', error);
      setError('Failed to fetch OBD data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, sendOBDCommand, parseOBDData]);

  useEffect(() => {
    if (isConnected) {
      // Initial fetch
      fetchOBDData();

      // Set up polling interval
      const interval = setInterval(fetchOBDData, 1000);
      return () => clearInterval(interval);
    } else {
      setData(INITIAL_OBD_DATA);
      setIsLoading(false);
    }
  }, [isConnected, fetchOBDData]);

  const renderDataItem = (label: string, value: number | null, unit: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={[styles.dataItem, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]}>
      <View style={[styles.dataIcon, { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }]}>
        <Ionicons name={icon} size={24} color={isDarkMode ? 'white' : 'black'} />
      </View>
      <View style={styles.dataInfo}>
        <Text style={[styles.dataLabel, { color: isDarkMode ? '#888' : '#666' }]}>{label}</Text>
        <Text style={[styles.dataValue, { color: isDarkMode ? 'white' : 'black' }]}>
          {value !== null ? `${value.toFixed(1)} ${unit}` : 'N/A'}
        </Text>
      </View>
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

      <Text style={[styles.title, { color: isDarkMode ? 'white' : 'black' }]}>OBD Data</Text>
      
      {!isConnected ? (
        <View style={styles.noConnectionContainer}>
          <Text style={[styles.noConnectionText, { color: isDarkMode ? 'white' : 'black' }]}>
            No OBD device connected
          </Text>
          <Text style={[styles.noConnectionSubtext, { color: isDarkMode ? '#888' : '#666' }]}>
            Please connect an OBD device in Settings
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#888' : '#666' }]}>
            Connecting to {connectedDeviceInfo?.name || 'OBD Device'}...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#f44336" />
          <Text style={[styles.errorText, { color: isDarkMode ? 'white' : 'black' }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchOBDData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <Text style={[styles.connectedDevice, { color: isDarkMode ? '#4CAF50' : '#2E7D32' }]}>
            Connected to: {connectedDeviceInfo?.name || 'OBD Device'}
          </Text>
          {renderDataItem('Engine RPM', data.rpm, 'RPM', 'speedometer')}
          {renderDataItem('Vehicle Speed', data.speed, 'km/h', 'car')}
          {renderDataItem('Coolant Temp', data.coolantTemp, '°C', 'thermometer')}
          {renderDataItem('Fuel Level', data.fuelLevel, '%', 'water')}
          {renderDataItem('Engine Load', data.engineLoad, '%', 'fitness')}
          {renderDataItem('Throttle', data.throttlePos, '%', 'arrow-up')}
          {renderDataItem('Battery', data.batteryVoltage, 'V', 'battery-charging')}
        </ScrollView>
      )}
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
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  dataIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  dataInfo: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 16,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  noConnectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noConnectionText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noConnectionSubtext: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedDevice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    paddingHorizontal: 20,
  }
});