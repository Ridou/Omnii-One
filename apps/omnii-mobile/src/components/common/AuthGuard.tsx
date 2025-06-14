import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import LandingPageContent from '~/components/landing/LandingPageContent';
import { useErrorRedirect } from './GlobalErrorHandler';


interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * AuthGuard component that protects routes from unauthenticated access
 * 
 * For web/desktop: Redirects unauthenticated users to root or specified route
 * For mobile: Shows landing page content as fallback
 * 
 * @param children - The protected content to render for authenticated users
 * @param fallback - Optional custom fallback content for unauthenticated users
 * @param redirectTo - Optional custom redirect path (defaults to '/')
 */
export function AuthGuard({ 
  children, 
  fallback,
  redirectTo = '/' 
}: AuthGuardProps) {
  const { user, session, isInitialized } = useAuth();
  const router = useRouter();
  
  const isAuthenticated = !!(user && session);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    // Only redirect after auth is initialized to avoid flickering
    if (isInitialized && !isAuthenticated) {
      if (isWeb && typeof window !== 'undefined') {
        // For web/desktop: Hard redirect to avoid blank screens
        window.location.href = redirectTo;
      } else {
        // For mobile: Use router navigation
        router.replace(redirectTo as any);
      }
    }
  }, [isAuthenticated, isInitialized, isWeb, redirectTo, router]);

  // Show loading state while auth is initializing
  if (!isInitialized) {
    return null; // Or a loading spinner if preferred
  }

  // Show protected content for authenticated users
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show fallback content for unauthenticated users
  // This handles the case where redirect hasn't happened yet or fails
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback: landing page content
  return <LandingPageContent />;
}

/**
 * Hook to check if current user is authenticated
 * Useful for conditional rendering without creating extra components
 */
export function useAuthGuard() {
  const { user, session, isInitialized } = useAuth();
  
  return {
    isAuthenticated: !!(user && session),
    isInitialized,
    user,
    session
  };
}

/**
 * Re-export error redirect hook for convenience
 * Allows components to manually trigger redirects on specific errors
 */
export { useErrorRedirect }; 