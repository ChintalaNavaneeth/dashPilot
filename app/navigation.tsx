import { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, Text, TextInput, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import { useTheme } from '@/hooks/useThemeContext';

export default function NavigationScreen() {
  const { isDarkMode } = useTheme();
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
      }
    })();
  }, []);

  const openNavigation = async () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Unable to get your current location');
      return;
    }

    if (!searchText) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }

    try {
      // Format for different navigation apps
      const googleMapsUrl = `google.navigation:q=${encodeURIComponent(searchText)}`;
      const appleMapsUrl = `maps://?daddr=${encodeURIComponent(searchText)}`;
      const wazeUrl = `waze://?q=${encodeURIComponent(searchText)}&navigate=yes`;
      
      if (Platform.OS === 'android') {
        // Try to open Google Maps first
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: googleMapsUrl,
            flags: 1, // FLAG_ACTIVITY_NEW_TASK
          });
        } catch {
          // If Google Maps fails, try Waze
          try {
            await Linking.openURL(wazeUrl);
          } catch {
            // If both fail, open in any available maps app
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchText)}`;
            await Linking.openURL(url);
          }
        }
      } else if (Platform.OS === 'ios') {
        // Try Apple Maps first
        try {
          await Linking.openURL(appleMapsUrl);
        } catch {
          // If Apple Maps fails, try Google Maps
          try {
            await Linking.openURL(`comgooglemaps://?q=${encodeURIComponent(searchText)}`);
          } catch {
            // If both fail, try Waze
            try {
              await Linking.openURL(wazeUrl);
            } catch {
              // If all fail, open in web browser
              const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchText)}`;
              await Linking.openURL(url);
            }
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open navigation app');
    }
  };

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              { 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: isDarkMode ? 'white' : 'black'
              }
            ]}
            placeholder="Enter destination..."
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={openNavigation}
          />
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={openNavigation}
          >
            <Ionicons name="navigate" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={() => setSearchText('Home')}
          >
            <Ionicons name="home" size={32} color={isDarkMode ? 'white' : 'black'} />
            <Text style={[styles.actionText, { color: isDarkMode ? 'white' : 'black' }]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={() => setSearchText('Work')}
          >
            <Ionicons name="business" size={32} color={isDarkMode ? 'white' : 'black'} />
            <Text style={[styles.actionText, { color: isDarkMode ? 'white' : 'black' }]}>Work</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={() => setSearchText('Gas Station')}
          >
            <Ionicons name="car" size={32} color={isDarkMode ? 'white' : 'black'} />
            <Text style={[styles.actionText, { color: isDarkMode ? 'white' : 'black' }]}>Gas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={() => setSearchText('Restaurant')}
          >
            <Ionicons name="restaurant" size={32} color={isDarkMode ? 'white' : 'black'} />
            <Text style={[styles.actionText, { color: isDarkMode ? 'white' : 'black' }]}>Food</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={36} color={isDarkMode ? 'white' : 'black'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  searchInput: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    paddingHorizontal: 20,
    fontSize: 20,
    marginRight: 10,
  },
  searchButton: {
    width: 60,
    height: 60,
    backgroundColor: '#0066ff',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  actionButton: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    marginTop: 8,
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    borderRadius: 25,
    zIndex: 1,
  },
});