import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useBluetooth } from '../hooks/useBluetoothContext';
import { useTheme } from '../hooks/useThemeContext';
import BluetoothSerial from 'react-native-bluetooth-serial-next';

const { width } = Dimensions.get('window');
const GAUGE_SIZE = width * 0.7;
const NEEDLE_LENGTH = GAUGE_SIZE * 0.4;

const PID_COMMANDS = {
  SPEED: '010D', // Vehicle speed
  RPM: '010C',   // Engine RPM
};

const OBD_DRIVER_CONFIG = {
  baudRate: 38400,
  protocol: 'elm327' as const,
  bufferSize: 1024,
};

export default function SpeedoScreen() {
  const { isDarkMode } = useTheme();
  const { 
    isConnected, 
    connectedDeviceInfo,
    connectionError,
    sendCommand,
    clearBuffer 
  } = useBluetooth();

  const [speed, setSpeed] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sendOBDCommand = useCallback(async (command: string): Promise<string> => {
    try {
      clearBuffer(); // Clear any stale data
      const response = await sendCommand(command + '\r');
      const parts = response.split(' ');
      if (parts[0] === '41') {
        return parts.slice(2).join('');
      }
      throw new Error('Invalid response format');
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
      default:
        return value;
    }
  }, []);

  const fetchOBDData = useCallback(async () => {
    if (!isConnected) {
      setError('No OBD device connected');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [speedResponse, rpmResponse] = await Promise.all([
        sendOBDCommand(PID_COMMANDS.SPEED),
        sendOBDCommand(PID_COMMANDS.RPM),
      ]);

      setSpeed(parseOBDData(PID_COMMANDS.SPEED, speedResponse));
      setRpm(parseOBDData(PID_COMMANDS.RPM, rpmResponse));
    } catch (error) {
      console.error('Error fetching OBD data:', error);
      setError('Failed to fetch data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [isConnected, sendOBDCommand, parseOBDData]);

  useEffect(() => {
    if (isConnected) {
      fetchOBDData();
      const interval = setInterval(fetchOBDData, 100); // Update every 100ms for smooth animation
      return () => clearInterval(interval);
    } else {
      setSpeed(0);
      setRpm(0);
      setLoading(false);
    }
  }, [isConnected, fetchOBDData]);

  // Calculate needle rotation based on speed
  const needleRotation = (speed / 260) * 270 - 135; // 260 km/h max speed, 270 degrees total rotation

  const needleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: GAUGE_SIZE / 2 },
      { translateY: GAUGE_SIZE / 2 },
      { rotate: withSpring(`${needleRotation}deg`, { damping: 15 }) },
      { translateY: -NEEDLE_LENGTH },
    ],
  }));

  const renderSpeedMarkers = () => {
    const markers = [];
    for (let i = 0; i <= 260; i += 20) {
      const rotation = (i / 260) * 270 - 135;
      const isMain = i % 40 === 0;
      markers.push(
        <View
          key={i}
          style={[
            styles.speedMarker,
            {
              transform: [
                { translateX: GAUGE_SIZE / 2 },
                { translateY: GAUGE_SIZE / 2 },
                { rotate: `${rotation}deg` },
                { translateY: -GAUGE_SIZE / 2 + 20 },
              ],
              height: isMain ? 15 : 8,
              backgroundColor: isDarkMode ? 'white' : 'black',
            },
          ]}
        >
          {isMain && (
            <Text
              style={[
                styles.speedMarkerText,
                {
                  transform: [{ rotate: `${-rotation}deg` }],
                  color: isDarkMode ? 'white' : 'black',
                },
              ]}
            >
              {i}
            </Text>
          )}
        </View>
      );
    }
    return markers;
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={36} color={isDarkMode ? 'white' : 'black'} />
      </TouchableOpacity>

      {!isConnected ? (
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, { color: isDarkMode ? 'white' : 'black' }]}>
            No OBD device connected
          </Text>
          <Text style={[styles.messageSubtext, { color: isDarkMode ? '#888' : '#666' }]}>
            Please connect an OBD device in Settings
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.messageContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#888' : '#666' }]}>
            Connecting to {connectedDeviceInfo?.name || 'OBD Device'}...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.messageContainer}>
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
        <View style={styles.content}>
          <View style={styles.speedometer}>
            <View style={styles.gaugeContainer}>
              {renderSpeedMarkers()}
              <Animated.View
                style={[
                  styles.needle,
                  { backgroundColor: isDarkMode ? '#ff4444' : '#f44336' },
                  needleStyle,
                ]}
              />
              <View
                style={[
                  styles.needleBase,
                  { backgroundColor: isDarkMode ? '#444' : '#ccc' },
                ]}
              />
            </View>
            <View style={styles.speedDisplay}>
              <Text style={[styles.speedValue, { color: isDarkMode ? 'white' : 'black' }]}>
                {Math.round(speed)}
              </Text>
              <Text style={[styles.speedUnit, { color: isDarkMode ? '#888' : '#666' }]}>
                km/h
              </Text>
            </View>
          </View>

          <View style={[styles.rpmContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]}>
            <Text style={[styles.rpmLabel, { color: isDarkMode ? '#888' : '#666' }]}>
              RPM
            </Text>
            <Text style={[styles.rpmValue, { color: isDarkMode ? 'white' : 'black' }]}>
              {Math.round(rpm)}
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedometer: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeContainer: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    position: 'relative',
  },
  speedMarker: {
    position: 'absolute',
    width: 2,
    left: -1,
    transformOrigin: 'bottom',
  },
  speedMarkerText: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    left: -19,
    top: -25,
  },
  needle: {
    position: 'absolute',
    width: 4,
    height: NEEDLE_LENGTH,
    left: -2,
    transformOrigin: 'bottom',
  },
  needleBase: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    left: GAUGE_SIZE / 2 - 10,
    top: GAUGE_SIZE / 2 - 10,
  },
  speedDisplay: {
    position: 'absolute',
    alignItems: 'center',
  },
  speedValue: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  speedUnit: {
    fontSize: 24,
    marginTop: -10,
  },
  rpmContainer: {
    marginTop: 40,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  rpmLabel: {
    fontSize: 18,
    marginBottom: 5,
  },
  rpmValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  messageSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
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
});