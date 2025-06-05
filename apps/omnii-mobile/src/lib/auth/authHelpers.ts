import { supabase } from '~/lib/supabase';
import type { AuthUser, AuthError } from './types';
import type { Session } from '@supabase/supabase-js';
import { mapSupabaseUser } from './types';

// Email/Password Authentication
export const signInWithEmail = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('No user data received');
    }

    return mapSupabaseUser(data.user);
  } catch (error) {
    console.error('Email sign-in error:', error);
    throw error;
  }
};

export const signUpWithEmail = async (
  email: string, 
  password: string, 
  name?: string
): Promise<AuthUser> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name: name,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('No user data received');
    }

    return mapSupabaseUser(data.user);
  } catch (error) {
    console.error('Email sign-up error:', error);
    throw error;
  }
};

// Session Management
export const refreshSession = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Session refresh error:', error);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    console.log('🚪 Starting sign out process...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Sign out error:', error);
      throw new Error(error.message);
    }
    console.log('✅ Sign out successful');
  } catch (error) {
    console.error('💥 Sign out error:', error);
    throw error;
  }
};

// Error Handling
export const handleAuthError = (error: unknown): AuthError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error,
    };
  }
  
  return {
    message: 'An unknown error occurred',
    details: error,
  };
};

// Validation Helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  return { isValid: true };
};

// Session Helpers
export const isSessionValid = (session: Session | null): boolean => {
  if (!session) return false;
  
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at ? session.expires_at > now : true;
}; 