// Test environment configuration
export const testConfig = {
  supabase: {
    url: process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
    anonKey: process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key'
  },
  apple: {
    teamId: '36MYR6FDUM',
    bundleId: 'com.omnii.mobile.test'
  },
  google: {
    clientId: process.env.TEST_GOOGLE_CLIENT_ID || 'test-google-client-id'
  }
};

// Test data cleanup utilities
export const cleanupTestData = async (userId: string) => {
  // Safely handle test cleanup
  try {
    const { supabase } = await import('~/lib/supabase');
    await supabase.from('oauth_tokens').delete().eq('user_id', userId);
    await supabase.auth.admin.deleteUser(userId);
  } catch (error) {
    console.warn('Test cleanup failed:', error);
  }
};

// Mock user data for tests
export const mockUsers = {
  appleUser: {
    id: 'apple-user-123',
    email: 'test@privaterelay.appleid.com',
    user_metadata: {
      provider: 'apple',
      full_name: 'John Doe',
      iss: 'https://appleid.apple.com',
      aud: 'com.omnii.mobile'
    }
  },
  googleUser: {
    id: 'google-user-456', 
    email: 'test@gmail.com',
    user_metadata: {
      provider: 'google',
      scope: 'email profile calendar'
    }
  }
};

// Mock OAuth tokens for tests
export const mockTokens = {
  apple: {
    identityToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-apple-token',
    user: 'apple-user-123',
    email: 'test@privaterelay.appleid.com',
    fullName: {
      givenName: 'John',
      familyName: 'Doe'
    }
  },
  google: {
    access_token: 'ya29.mock-google-access-token',
    refresh_token: 'mock-google-refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'email profile calendar'
  }
}; 