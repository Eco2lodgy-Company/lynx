import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';

import "../global.css"; // NativeWind CSS import
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  try {
    const { StyleSheet } = require("react-native-css-interop");
    if (StyleSheet && typeof StyleSheet.setFlag === 'function') {
      StyleSheet.setFlag("darkMode", "class");
    } else {
      console.warn("StyleSheet.setFlag not found, attempting to set dark mode class manually");
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('class');
      }
    }
  } catch (e) {
    console.warn("Failed to set NativeWind flags:", e);
  }
}

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }), []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#0F172A' },
                }}
              />
            </View>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
