import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "./base-url";

// Platform-aware storage adapter
const createPlatformStorage = () => {
  if (Platform.OS === 'web') {
    // Web fallback using localStorage
    return {
      getItem: async (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore errors
        }
      },
      removeItem: async (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore errors
        }
      },
      // Required sync methods for web compatibility
      getValueWithKeySync: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setValueWithKeySync: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore errors
        }
      },
      deleteValueWithKeySync: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore errors
        }
      },
    };
  }
  
  // Native mobile - use SecureStore directly
  return SecureStore;
};

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "expo",
      storagePrefix: "expo",
      storage: createPlatformStorage(),
    }),
  ],
});

// Debug helper to check auth status
export const debugAuthStatus = async () => {
  try {
    const session = await authClient.getSession();
    console.log('[Auth Debug] Session status:', !!session);
    console.log('[Auth Debug] User ID:', session?.user?.id);
    return session;
  } catch (error) {
    console.error('[Auth Debug] Failed to get session:', error);
    return null;
  }
};
