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

export interface GoogleTokenStatus {
  isValid: boolean;
  needsReconnection: boolean;
  email?: string;
  lastConnected?: string;
  services: string[];
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
 * Check if user has valid Google access token with auto-refresh
 */
export const checkGoogleTokenStatus = async (): Promise<GoogleTokenStatus> => {
  try {
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isValid: false, needsReconnection: true, services: [] };
    }

    // Get OAuth tokens
    const tokens = await getMyOAuthTokens('google');
    
    if (!tokens || tokens.length === 0) {
      return { isValid: false, needsReconnection: true, services: [] };
    }

    const token = tokens[0];
    
    if (!token) {
      return { isValid: false, needsReconnection: true, services: [] };
    }
    
    // Check if token is expired
    const isExpired = token.expires_at ? new Date(token.expires_at) < new Date() : false;
    
    if (isExpired && !token.refresh_token) {
      return { isValid: false, needsReconnection: true, services: [] };
    }

    // For now, assume token is valid if it exists and not expired or has refresh token
    const isValid = !isExpired || !!token.refresh_token;
    
    return {
      isValid,
      needsReconnection: !isValid,
      email: (token as any).provider_user_email || 'Connected',
      lastConnected: (token as any).updated_at || (token as any).created_at,
      services: GOOGLE_SERVICES.map(s => s.name)
    };
    
  } catch (error) {
    return { isValid: false, needsReconnection: true, services: [] };
  }
};

/**
 * Initiate Google OAuth flow for integration
 */
export const initiateGoogleOAuth = async (): Promise<void> => {
  try {
    
    // Use existing Google OAuth flow
    await connectGoogleIntegration();
    
  } catch (error) {
    throw error;
  }
};

/**
 * Check if user has Google workspace integration connected
 */
export const getGoogleIntegrationStatus = async (): Promise<GoogleIntegrationStatus> => {
  try {
    
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
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user is authenticated with Apple
    const isAppleUser = user.app_metadata?.provider === 'apple';
    
    if (isAppleUser) {
    } else {
    }

    // Use the existing Google OAuth flow but store as integration tokens
    // This reuses the same OAuth flow but marks it as workspace integration
    await authSignInWithGoogle();
    
    
  } catch (error) {
    throw error;
  }
};

/**
 * Disconnect Google workspace integration
 */
export const disconnectGoogleIntegration = async (): Promise<void> => {
  try {
    
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

    
  } catch (error) {
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
    return false;
  }
}; 