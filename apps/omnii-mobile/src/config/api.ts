/**
 * API Configuration
 *
 * Central configuration for backend API connections.
 */

import Constants from 'expo-constants';

// Get the backend URL from environment or use defaults
const getApiBaseUrl = (): string => {
  // Check for environment variable
  const envUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  if (envUrl) {
    return envUrl;
  }

  // Development defaults
  if (__DEV__) {
    // Use localhost for iOS simulator, 10.0.2.2 for Android emulator
    const Platform = require('react-native').Platform;
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  // Production URL - should be configured via environment
  return 'https://api.omnii.app';
};

export const API_BASE_URL = getApiBaseUrl();

// API timeout in milliseconds
export const API_TIMEOUT = 30000;

// Default headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};
