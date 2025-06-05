import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

// Make Buffer available globally
global.Buffer = Buffer;

// Add process polyfill globally
import process from 'process';
if (typeof global.process === 'undefined') {
  global.process = process;
}

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { AuthProvider } from '~/context/AuthContext';
import { ProfileProvider } from '~/context/ProfileContext';
import { OnboardingProvider } from '~/context/OnboardingContext';
import { ThemeProvider, useTheme } from '~/context/ThemeContext';
import { GestureProvider } from '~/components/common/GestureProvider';
import { useFrameworkReady } from '~/hooks/useFrameworkReady';

export default function RootLayout() {
  useFrameworkReady();

  // For static export (server-side rendering), render without auth context
  if (Platform.OS === 'web') {
    return (
      <GestureProvider>
        <ThemeProvider>
          <ThemedStack />
        </ThemeProvider>
      </GestureProvider>
    );
  }

  // For native platforms (iOS/Android), render with full context providers
  return (
    <GestureProvider>
      <AuthProvider>
        <ProfileProvider>
          <ThemeProvider>
            <OnboardingProvider>
              <ThemedStack />
            </OnboardingProvider>
          </ThemeProvider>
        </ProfileProvider>
      </AuthProvider>
    </GestureProvider>
  );
}

function ThemedStack() {
  const themeContext = useTheme();
  
  // SAFETY: Provide fallback if theme context fails
  const isDark = themeContext?.isDark || false;
  
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="emergency-logout" options={{ headerShown: false }} />
        <Stack.Screen name="request/[id]" options={{ title: 'Request Details' }} />
        <Stack.Screen name="sms-consent" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}