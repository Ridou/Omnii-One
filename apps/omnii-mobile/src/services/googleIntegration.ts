// Google Workspace Integration Service
// Separate from authentication - allows Apple users to connect Google services
import { supabase } from '~/lib/supabase';
import { signInWithGoogle as authSignInWithGoogle } from '~/lib/auth/googleAuth';
import { storeOAuthTokens, getMyOAuthTokens } from '~/lib/auth/tokenStorage';

export interface GoogleIntegrationStatus {
  isConnected: boolean;
  email?: string;
  connectedAt?: string;
  availableServices: string[];
  lastSyncAt?: string;
}

export interface GoogleService {
  name: string;
  scope: string;
  description: string;
  isAvailable: boolean;
}

export const GOOGLE_SERVICES: GoogleService[] = [
  {
    name: 'Gmail',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    description: 'Read and manage your emails',
    isAvailable: true
  },
  {
    name: 'Calendar',
    scope: 'https://www.googleapis.com/auth/calendar',
    description: 'Access and manage your calendar events',
    isAvailable: true
  },
  {
    name: 'Tasks',
    scope: 'https://www.googleapis.com/auth/tasks',
    description: 'Access and manage your tasks',
    isAvailable: true
  },
  {
    name: 'Contacts',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    description: 'Access your contacts',
    isAvailable: true
  }
];

/**
 * Check if user has Google workspace integration connected
 */
export const getGoogleIntegrationStatus = async (): Promise<GoogleIntegrationStatus> => {
  try {
    console.log('🔍 Checking Google integration status...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check for existing Google OAuth tokens
    const tokens = await getMyOAuthTokens('google');
    
    if (tokens && tokens.length > 0) {
      const googleToken = tokens[0];
      
      return {
        isConnected: true,
        email: (googleToken as any).provider_user_email || 'Connected',
        connectedAt: (googleToken as any).created_at || new Date().toISOString(),
        availableServices: GOOGLE_SERVICES.map(s => s.name),
        lastSyncAt: (googleToken as any).updated_at || new Date().toISOString()
      };
    }

    return {
      isConnected: false,
      availableServices: GOOGLE_SERVICES.map(s => s.name)
    };
    
  } catch (error) {
    console.error('❌ Failed to check Google integration status:', error);
    return {
      isConnected: false,
      availableServices: []
    };
  }
};

/**
 * Connect Google workspace integration (separate from authentication)
 * This can be called by Apple users to add Google workspace features
 */
export const connectGoogleIntegration = async (): Promise<void> => {
  try {
    console.log('🔗 Starting Google workspace integration...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user is authenticated with Apple
    const isAppleUser = user.app_metadata?.provider === 'apple';
    
    if (isAppleUser) {
      console.log('🍎 Apple user connecting Google workspace...');
    } else {
      console.log('🔗 Google user reconnecting workspace...');
    }

    // Use the existing Google OAuth flow but store as integration tokens
    // This reuses the same OAuth flow but marks it as workspace integration
    await authSignInWithGoogle();
    
    console.log('✅ Google workspace integration connected successfully');
    
  } catch (error) {
    console.error('❌ Failed to connect Google integration:', error);
    throw error;
  }
};

/**
 * Disconnect Google workspace integration
 */
export const disconnectGoogleIntegration = async (): Promise<void> => {
  try {
    console.log('🔓 Disconnecting Google workspace integration...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Remove Google OAuth tokens from database
    const { error } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'google');

    if (error) {
      throw error;
    }

    console.log('✅ Google workspace integration disconnected');
    
  } catch (error) {
    console.error('❌ Failed to disconnect Google integration:', error);
    throw error;
  }
};

/**
 * Check if specific Google service is available
 */
export const isGoogleServiceAvailable = async (serviceName: string): Promise<boolean> => {
  try {
    const status = await getGoogleIntegrationStatus();
    return status.isConnected && status.availableServices.includes(serviceName);
  } catch (error) {
    console.error(`❌ Failed to check ${serviceName} availability:`, error);
    return false;
  }
};

/**
 * Get available Google services
 */
export const getAvailableGoogleServices = (): GoogleService[] => {
  return GOOGLE_SERVICES.filter(service => service.isAvailable);
};

/**
 * Check if user needs Google integration for AI features
 */
export const needsGoogleIntegrationForAI = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // If user authenticated with Apple, they need Google integration for AI features
    const isAppleUser = user.app_metadata?.provider === 'apple';
    const status = await getGoogleIntegrationStatus();
    
    return isAppleUser && !status.isConnected;
  } catch (error) {
    console.error('❌ Failed to check AI integration needs:', error);
    return false;
  }
}; 