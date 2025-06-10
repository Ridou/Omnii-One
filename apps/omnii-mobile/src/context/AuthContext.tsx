import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
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

// Type definition for Session (avoiding import issues)
type Session = any;

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAppleSignInAvailableState, setIsAppleSignInAvailableState] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
          setIsLoggingOut(false); // Clear any logout state on init
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsInitialized(true);
          setIsLoggingOut(false);
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
          
          // Only set loading to false for non-logout events
          // Logout handles its own loading state
          if (!isLoggingOut) {
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      linkingSubscription.remove();
      authSubscription.unsubscribe();
    };
  }, [router, user?.id, isLoggingOut]);

  const handleSignInWithGoogle = async (): Promise<void> => {
    setIsLoading(true);
    setIsLoggingOut(false);
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
    setIsLoggingOut(false);
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
    setIsLoggingOut(false);
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
    setIsLoggingOut(false);
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
      
      // Clear any pending auth state before signout
      setUser(null);
      setSession(null);
      
      await authSignOut();
      console.log('✅ Logout successful - handling platform-specific redirect');
      
      // Platform-specific handling for web vs mobile
      if (Platform.OS === 'web') {
        console.log('🌐 Web platform detected - forcing navigation and reload');
        // On web, we need to be more aggressive with the redirect
        router.replace('/');
        
        // Force a page reload on web to ensure clean state
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 500);
        }
      } else {
        console.log('📱 Mobile platform detected - using standard navigation');
        // On mobile, use the standard router redirect
        setTimeout(() => {
          router.replace('/');
        }, 100);
      }
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
      
      // Force logout even if there's an error
      setUser(null);
      setSession(null);
      setIsLoading(false);
      
      // Emergency logout - go to landing page regardless
      console.log('🚨 Emergency logout - forcing redirect to landing page');
      router.replace('/');
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // On web, force reload as emergency measure
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 1000);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
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