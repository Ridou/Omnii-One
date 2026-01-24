import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Get the environment variables from Expo's config
const getEnvVars = () => {
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
  };
};

// Create a mock client for server-side rendering
const createMockClient = () => ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: null }),
    signInWithOAuth: async () => ({ data: { url: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: null }),
    refreshSession: async () => ({ data: { session: null }, error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
      }),
    }),
    insert: async () => ({ data: null, error: null }),
    update: () => ({
      eq: () => ({
        select: async () => ({ data: null, error: null }),
      }),
    }),
    delete: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
  }),
});

// Initialize Supabase client conditionally
let supabaseClient: any;

if (Platform.OS === 'web' && !isBrowser) {
  // Server-side rendering: use mock client
  supabaseClient = createMockClient();
} else {
  // Browser/mobile: use real client
  const env = getEnvVars();
  supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Disable for mobile
      flowType: 'pkce', // Use PKCE for OAuth
    },
    global: {
      headers: {
        'X-Client-Info': `omnii-mobile@${Platform.OS}`,
      },
    },
  });
}

export const supabase = supabaseClient;

// Helper function to get the current session
export const getCurrentSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    return null;
  }
  return session;
};

// Helper function to get the current user
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return user;
};

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};
