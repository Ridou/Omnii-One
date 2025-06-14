import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
import '../styles/global.css';

// Add process polyfill globally
import process from 'process';


import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '~/context/AuthContext';
import { XPProvider } from '~/context/XPContext';
import { ProfileProvider } from '~/context/ProfileContext';
import { GlobalErrorHandler } from '~/components/common/GlobalErrorHandler';

import { ThemeProvider, useTheme } from '~/context/ThemeContext';
import { useFrameworkReady } from '~/hooks/useFrameworkReady';
import { queryClient } from '~/utils/api';

// Make Buffer available globally
global.Buffer = Buffer;
if (typeof global.process === 'undefined') {
  global.process = process;
}

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

  // Use the same provider structure for all platforms
  // AuthProvider handles SSR/hydration internally
  return (
    <QueryClientProvider client={queryClient}>
      <SafeGestureProvider>
        <GlobalErrorHandler>
          <AuthProvider>
            <XPProvider>
              <ProfileProvider>
                <ThemeProvider>
                  <ThemedStack />
                </ThemeProvider>
              </ProfileProvider>
            </XPProvider>
          </AuthProvider>
        </GlobalErrorHandler>
      </SafeGestureProvider>
    </QueryClientProvider>
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