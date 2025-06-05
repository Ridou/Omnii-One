import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

// Make Buffer available globally
global.Buffer = Buffer;

// Add process polyfill globally
import process from 'process';
if (typeof global.process === 'undefined') {
  global.process = process;
}

// // Critical Hermes polyfills
// import 'react-native-get-random-values';

// // TextEncoder/TextDecoder polyfills for Hermes
// if (typeof global.TextEncoder === 'undefined') {
//   const { TextEncoder, TextDecoder } = require('text-encoding-polyfill');
//   global.TextEncoder = TextEncoder;
//   global.TextDecoder = TextDecoder;
// }

// // Crypto polyfill for Hermes  
// if (typeof global.crypto === 'undefined') {
//   const { polyfillWebCrypto } = require('expo-crypto');
//   polyfillWebCrypto();
// }

import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { AuthProvider } from '~/context/AuthContext';
import { ProfileProvider } from '~/context/ProfileContext';
import { OnboardingProvider } from '~/context/OnboardingContext';
import { ThemeProvider, useTheme } from '~/context/ThemeContext';
import { useFrameworkReady } from '~/hooks/useFrameworkReady';

// Safe gesture provider that loads GestureProvider after hydration
function SafeGestureProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // During SSR or before hydration on web, render without gesture handler
  if (!isClient && Platform.OS === 'web') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }
  
  // On native platforms or after hydration, use GestureProvider
  try {
    const { GestureProvider } = require('~/components/common/GestureProvider');
    return <GestureProvider>{children}</GestureProvider>;
  } catch {
    return <View style={{ flex: 1 }}>{children}</View>;
  }
}

export default function RootLayout() {
  useFrameworkReady();

  // For static export (server-side rendering), render with minimal context
  if (Platform.OS === 'web') {
    return (
      <SafeGestureProvider>
        <ThemeProvider>
          <ThemedStack />
        </ThemeProvider>
      </SafeGestureProvider>
    );
  }

  // For native platforms (iOS/Android), render with full context providers
  return (
    <SafeGestureProvider>
      <AuthProvider>
        <ProfileProvider>
          <ThemeProvider>
            <OnboardingProvider>
              <ThemedStack />
            </OnboardingProvider>
          </ThemeProvider>
        </ProfileProvider>
      </AuthProvider>
    </SafeGestureProvider>
  );
}

function ThemedStack() {
  const [isClient, setIsClient] = useState(false);
  const themeContext = useTheme();
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
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
      {/* Only render StatusBar after client hydration */}
      {isClient && <StatusBar style={isDark ? 'light' : 'dark'} />}
    </>
  );
}