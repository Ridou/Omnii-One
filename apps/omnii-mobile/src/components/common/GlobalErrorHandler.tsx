import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

/**
 * Global error handler that catches 503 and unauthorized errors
 * and redirects users to root to avoid edge cases
 * 
 * This component handles:
 * - 503 Service Unavailable errors
 * - 401/403 Unauthorized/Forbidden errors
 * - tRPC UNAUTHORIZED errors
 * - API_REDIRECT_NEEDED signals from tRPC client
 * 
 * Works in conjunction with:
 * - Modified +not-found.tsx (handles 404 redirects)
 * - tRPC error link in utils/api.tsx (handles API errors)
 * - AuthGuard components (handles route protection)
 */
export function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  const router = useRouter();

  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      if (shouldRedirectOnError(error)) {
        redirectToRoot();
        event.preventDefault(); // Prevent the error from being logged to console
      }
    };

    // Global error handler for uncaught errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      
      if (shouldRedirectOnError(error)) {
        redirectToRoot();
        event.preventDefault(); // Prevent the error from being logged to console
      }
    };

    // Add event listeners for web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleError);
    }

    return () => {
      // Cleanup event listeners
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleError);
      }
    };
  }, [router]);

  const shouldRedirectOnError = (error: any): boolean => {
    if (!error) return false;

    const errorMessage = error.message || error.toString() || '';
    const errorCode = error.code || error.status || error.statusCode || 0;
    
    // Check for 503 Service Unavailable
    if (errorCode === 503 || errorMessage.includes('503')) {
      return true;
    }
    
    // Check for unauthorized errors
    if (
      errorCode === 401 || 
      errorCode === 403 ||
      errorMessage.toLowerCase().includes('unauthorized') ||
      errorMessage.toLowerCase().includes('forbidden') ||
      errorMessage.toLowerCase().includes('access denied')
    ) {
      return true;
    }

    // Check for specific tRPC error codes
    if (error.data?.code === 'UNAUTHORIZED') {
      return true;
    }

    // Check for API redirect signal from tRPC client
    if (errorMessage.includes('API_REDIRECT_NEEDED')) {
      return true;
    }

    return false;
  };

  const redirectToRoot = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // For web/desktop: Hard redirect to avoid error pages
      window.location.href = '/';
    } else {
      // For mobile: Use router navigation
      router.replace('/');
    }
  };

  return <>{children}</>;
}

/**
 * Hook to manually trigger error handling redirect
 * Can be used in components to redirect on specific errors
 */
export function useErrorRedirect() {
  const router = useRouter();

  const redirectOnError = (error: any) => {
    const shouldRedirect = 
      error?.status === 503 ||
      error?.code === 503 ||
      error?.message?.includes('503') ||
      error?.status === 401 ||
      error?.code === 401 ||
      error?.data?.code === 'UNAUTHORIZED' ||
      error?.message?.toLowerCase().includes('unauthorized');

    if (shouldRedirect) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.replace('/');
      }
      
      return true; // Indicate that redirect happened
    }
    
    return false; // No redirect needed
  };

  return { redirectOnError };
}