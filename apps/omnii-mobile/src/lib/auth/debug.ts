import { Platform } from 'react-native';
import { getRedirectUri, validateOAuthConfig, getCurrentEnvironment } from './googleAuth';

// Safely import SecureStore with error handling
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch (error) {
}

// Google OAuth Client IDs for different platforms
const GOOGLE_WEB_CLIENT_ID = '31768914670-v6qqf961ersh1m2ahtlekff552ovis66.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '904371950268-abund19lqsma5d4rhfkkv212e5j7hv5e.apps.googleusercontent.com';
const SUPABASE_URL = 'https://auth.omnii.net';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFheGlhd3VhdGZhampwdnd0anV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNDI5NTUsImV4cCI6MjA1NDkxODk1NX0.vZTqi6asrLDD21cIobrNvQvzwCIMxidiqp1ehXOMqTk';

export const debugAuthConfig = () => {
  
  // Environment variables
  
  // Show actual values (first/last 4 chars for security)
  const webClientId = GOOGLE_WEB_CLIENT_ID;
  const iosClientId = GOOGLE_IOS_CLIENT_ID;
  
  if (webClientId) {
  }
  if (iosClientId) {
  }
  
  // OAuth configuration
  
  
};

export const debugOAuthFlow = async () => {
  
  try {
    
    
  } catch (error) {
  }
};

export const debugOAuthIssues = async () => {
  
  const redirectUri = getRedirectUri();
  const isConfigValid = validateOAuthConfig();
  const environment = getCurrentEnvironment();
  
  
  // Enhanced environment detection
  
  if (Platform.OS === "ios") {
    
    if (!redirectUri.includes('omnii-mobile://')) {
    } else {
    }
  } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const currentHostname = window.location.hostname;
    const isTestEnvironment = currentHostname.includes('test.omnii.net');
    const isProductionEnvironment = currentHostname.includes('omnii.net') && !currentHostname.includes('test.');
    const isLocalhost = currentHostname.includes('localhost') || currentHostname.includes('127.0.0.1');
    const isNgrok = currentHostname.includes('ngrok');
    // Environment type logged for debugging
  } else {
  }
  
  // Check SecureStore availability
  try {
    if (SecureStore) {
      await SecureStore.setItemAsync('test_key', 'test_value');
      await SecureStore.deleteItemAsync('test_key');
    } else {
    }
  } catch (error) {
  }
  
  // Platform-specific checks
  if ((Platform.OS === "ios") && !redirectUri.includes('omnii-mobile://')) {
  }
  
  if (Platform.OS === 'web' && !redirectUri.includes('https://') && !redirectUri.includes('http://')) {
  }
  
  // Check for common configuration issues
  if (Platform.OS === "ios") {
  } else {
  }
  
  
  
};

export const logAuthEvent = (event: string, data?: unknown) => {
};

export const runOAuthDiagnostics = async () => {
  
  // Run all debug functions
  debugAuthConfig();
  await debugOAuthIssues();
  
};

export const testEnvironmentDetection = () => {
  
  try {
    const environment = getCurrentEnvironment();
    
    
    if (Platform.OS === "ios") {
      
      
      if (environment.redirectUri.includes('omnii-mobile://')) {
      } else {
      }
      
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      
      switch (environment.type) {
        case 'test':
          break;
        case 'production':
          break;
        case 'localhost':
          break;
        case 'ngrok':
          break;
        default:
      }
    } else {
    }
    
    
    if (Platform.OS === "ios") {
    }
    
    if (Platform.OS !== "ios") {
    }
    
    if (Platform.OS === "ios") {
    }
    
    
    return environment;
  } catch (error) {
    return null;
  }
}; 