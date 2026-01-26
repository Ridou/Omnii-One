import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { setupNotificationChannels } from './channels';

let cachedToken: string | null = null;

export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn('[Push] Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission not granted');
    return null;
  }

  // Set up Android notification channels
  if (Platform.OS === 'android') {
    await setupNotificationChannels();
  }

  // Get Expo Push Token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    cachedToken = tokenResponse.data;
    console.log('[Push] Token obtained:', cachedToken.substring(0, 20) + '...');
    return cachedToken;
  } catch (error) {
    console.error('[Push] Failed to get token:', error);
    return null;
  }
}

export function getPushToken(): string | null {
  return cachedToken;
}

// Listen for token changes (tokens can rotate)
export function setupTokenRefreshListener(
  onTokenChange: (token: string) => void
): () => void {
  const subscription = Notifications.addPushTokenListener((tokenData) => {
    cachedToken = tokenData.data;
    onTokenChange(tokenData.data);
  });

  return () => subscription.remove();
}
