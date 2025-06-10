// Apple Sign In authentication module
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from '~/lib/supabase';

/**
 * Sign in with Apple using the native iOS Apple Sign In
 * Only available on iOS devices
 */
export const signInWithApple = async () => {
  // Platform check for additional safety
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In only available on iOS');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token received from Apple');
    }

    // Send to Supabase for validation
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      throw error;
    }

    return data;
    
  } catch (error) {
    console.error('🍎 Apple Sign In error:', error);
    throw error;
  }
};

/**
 * Check if Apple Sign In is available on this device
 * Only available on iOS devices
 */
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    return isAvailable;
  } catch (error) {
    console.warn('🍎 Apple Sign In availability check failed:', error);
    return false;
  }
}; 