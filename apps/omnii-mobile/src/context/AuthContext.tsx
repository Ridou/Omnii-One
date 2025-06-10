import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { signInWithGoogle } from '~/lib/auth/googleAuth';
import { signInWithApple, isAppleSignInAvailable } from '~/lib/auth/appleAuth';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  signOut as authSignOut,
  refreshSession as authRefreshSession,
  handleAuthError 
} from '~/lib/auth/authHelpers';
import type { AuthUser, AuthContextType, AuthError } from '~/lib/auth/types';
import { mapSupabaseUser } from '~/lib/auth/types';
import { debugAuthConfig, debugOAuthFlow } from '~/lib/auth/debug';
import { clearOAuthTokens } from '~/lib/auth/tokenStorage';

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAppleSignInAvailableState, setIsAppleSignInAvailableState] = useState(false);
  const router = useRouter();

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true;

    // Get initial session and check Apple Sign In availability
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Check Apple Sign In availability
        const appleAvailable = await isAppleSignInAvailable();
        
        if (mounted) {
          if (error) {
            console.error('Error getting initial session:', error);
          } else {
            setSession(session);
            setUser(session?.user ? mapSupabaseUser(session.user) : null);
          }
          setIsAppleSignInAvailableState(appleAvailable);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    getInitialSession();

    // Handle deep links for OAuth callback (following Supabase docs)
    const handleDeepLink = (url: string) => {
      console.log('🔗 Deep link received:', url);
      // The session creation is handled in googleAuth.ts createSessionFromUrl
      // This is just for logging and potential future use
    };

    // Listen for URL changes (for OAuth deep links)
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Check for initial URL (if app was opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Debug configuration in development (with delay to avoid blocking startup)
    if (__DEV__) {
      setTimeout(() => {
        debugAuthConfig();
        debugOAuthFlow();
      }, 1000);
    }

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (mounted) {
          console.log('Auth state changed:', event, session?.user?.email);
          
          // 🆕 Handle token cleanup on sign out (non-blocking)
          if (event === 'SIGNED_OUT' && user?.id) {
            clearOAuthTokens(user.id).catch(error => {
              console.error('⚠️ Token cleanup failed (non-critical):', error);
            });
          }
          
          setSession(session);
          setUser(session?.user ? mapSupabaseUser(session.user) : null);
          setIsLoading(false);
          
          // 🔒 LOGOUT REDIRECT: Safely redirect to landing page after logout
          if (event === 'SIGNED_OUT') {
            console.log('🚪 User signed out, scheduling redirect to landing page');
            // Use setTimeout to ensure component tree is stable before navigation
            setTimeout(() => {
              if (mounted) {
                console.log('🏠 Executing redirect to landing page');
                router.replace('/');
              }
            }, 100);
          }
        }
      }
    );

    return () => {
      mounted = false;
      linkingSubscription.remove();
      authSubscription.unsubscribe();
    };
  }, [router, user?.id]);

  const handleSignInWithGoogle = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // Auth state change will be handled by the listener
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const handleSignInWithApple = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await signInWithApple();
      // Auth state change will be handled by the listener
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const handleSignInWithEmail = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      // Auth state change will be handled by the listener
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string, name?: string): Promise<void> => {
    setIsLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      // Auth state change will be handled by the listener
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const handleSignOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('🚪 Starting logout process...');
      await authSignOut();
      console.log('✅ Logout successful - auth state listener will handle redirect');
      // The auth state listener will handle the redirect to landing page
      // Auth state change will be handled by the listener
    } catch (error) {
      setIsLoading(false);
      console.error('❌ Logout failed:', error);
      throw error;
    }
  };

  const handleRefreshSession = async (): Promise<void> => {
    try {
      await authRefreshSession();
    } catch (error) {
      console.error('Session refresh failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isInitialized,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithApple: handleSignInWithApple,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    signOut: handleSignOut,
    refreshSession: handleRefreshSession,
    isAppleSignInAvailable: isAppleSignInAvailableState,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Create a hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}