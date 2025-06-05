import type { Session, User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export interface AuthError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: AuthError | null;
}

// Helper function to convert Supabase User to AuthUser
export const mapSupabaseUser = (user: User): AuthUser => {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name,
    avatar_url: user.user_metadata?.avatar_url,
    provider: user.app_metadata?.provider,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}; 