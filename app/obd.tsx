import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useThemeContext';
import { useBluetooth } from '@/hooks/useBluetoothContext';

interface OBDData {
  rpm: number;
  speed: number;
  coolantTemp: number;
  fuelLevel: number;
  engineLoad: number;
  throttlePos: number;
  batteryVoltage: number;
}

export default function OBDScreen() {
  const { isDarkMode } = useTheme();
  const { isConnected, connectedDeviceInfo } = useBluetooth();
  const [data, setData] = useState<OBDData>({
    rpm: 0,
    speed: 0,
    coolantTemp: 0,
    fuelLevel: 0,
    engineLoad: 0,
    throttlePos: 0,
    batteryVoltage: 0
  });

  useEffect(() => {
    // Only start data polling when connected
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        // TODO: Replace with actual OBD data reading
        setData({
          rpm: Math.floor(Math.random() * 4000) + 800,
          speed: Math.floor(Math.random() * 120),
          coolantTemp: Math.floor(Math.random() * 40) + 60,
          fuelLevel: Math.floor(Math.random() * 100),
          engineLoad: Math.floor(Math.random() * 100),
          throttlePos: Math.floor(Math.random() * 100),
          batteryVoltage: (Math.random() * 2 + 11).toFixed(1) as unknown as number
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected]);

  const renderDataItem = (label: string, value: number, unit: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={[styles.dataItem, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]}>
      <View style={[styles.dataIcon, { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }]}>
        <Ionicons name={icon} size={24} color={isDarkMode ? 'white' : 'black'} />
      </View>
      <View style={styles.dataInfo}>
        <Text style={[styles.dataLabel, { color: isDarkMode ? '#888' : '#666' }]}>{label}</Text>
        <Text style={[styles.dataValue, { color: isDarkMode ? 'white' : 'black' }]}>
          {value} {unit}
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
  connectedDevice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    paddingHorizontal: 20,
  }
});