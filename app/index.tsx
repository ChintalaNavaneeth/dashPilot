import { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useThemeContext';  // Fixed import

export default function DashboardScreen() {
  const { isDarkMode } = useTheme();

  const openGoogleMaps = () => {
    const url = Platform.select({
      ios: 'comgooglemaps://',
      android: 'google.navigation:q=',
      default: 'https://maps.google.com'
    });
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      <View style={styles.row}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]} 
          onPress={openGoogleMaps}
        >
          <Ionicons name="map" size={48} color={isDarkMode ? 'white' : 'black'} />
          <Text style={[styles.buttonText, { color: isDarkMode ? 'white' : 'black' }]}>
            Google Maps
          </Text>
        </TouchableOpacity>


        <TouchableOpacity 
          style={[styles.button, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]} 
          onPress={() => router.navigate('/settings')}
        >
          <Ionicons name="settings" size={48} color={isDarkMode ? 'white' : 'black'} />
          <Text style={[styles.buttonText, { color: isDarkMode ? 'white' : 'black' }]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  button: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonText: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});