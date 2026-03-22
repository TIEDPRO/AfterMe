import React, { useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Buffer } from 'buffer';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  LibreBaskerville_400Regular,
  LibreBaskerville_700Bold,
  LibreBaskerville_400Regular_Italic,
} from '@expo-google-fonts/libre-baskerville';

import { initSentry } from './src/services/SentryService';
import { AppProvider } from './src/context/AppContext';
import { PurchaseProvider } from './src/context/PurchaseContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import { setFontsLoaded } from './src/theme/fonts';

global.Buffer = global.Buffer || Buffer;

initSentry();
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [loaded] = useFonts(
    Platform.OS === 'android'
      ? { LibreBaskerville_400Regular, LibreBaskerville_700Bold, LibreBaskerville_400Regular_Italic }
      : {},
  );

  const onLayoutRootView = useCallback(() => {
    if (loaded) {
      setFontsLoaded(true);
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <PurchaseProvider>
          <View style={styles.container} onLayout={onLayoutRootView}>
            <AppNavigator />
          </View>
          <StatusBar style="light" />
        </PurchaseProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
});
