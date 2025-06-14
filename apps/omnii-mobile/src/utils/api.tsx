import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";
import { Platform } from 'react-native';

import type { AppRouter } from "@omnii/api";

import { authClient } from "./auth";
import { getBaseUrl } from "./base-url";
import { supabase } from "~/lib/supabase";

// Custom transformer that falls back to JSON when superjson fails
const customTransformer = {
  serialize: (data: any) => {
    try {
      return superjson.serialize(data);
    } catch (error) {
      // Fallback to regular JSON serialization
      try {
        // Test if data is serializable
        JSON.stringify(data);
        return { json: data, meta: undefined };
      } catch (jsonError) {
        // If even JSON fails, return a safe fallback
        return { 
          json: { 
            error: 'Serialization failed', 
            type: typeof data,
            isArray: Array.isArray(data)
          }, 
          meta: undefined 
        };
      }
    }
  },
  deserialize: (data: any) => {
    try {
      return superjson.deserialize(data);
    } catch (error) {
      // Fallback to regular JSON deserialization
      if (data && typeof data === 'object') {
        // If it has the superjson structure but failed to deserialize
        if (data.json !== undefined) {
          return data.json;
        }
        // If it's a regular object, return as-is
        return data;
      }
      // For primitive values, return as-is
      return data;
    }
  }
};

// Error handling utility for redirecting on specific errors
function shouldRedirectOnAPIError(error: any): boolean {
  const statusCode = error?.data?.httpStatus || error?.shape?.data?.httpStatus || 0;
  const code = error?.data?.code || error?.shape?.data?.code || '';
  const message = error?.message || '';

  // Check for 503 Service Unavailable
  if (statusCode === 503 || message.includes('503')) {
    return true;
  }
  
  // Check for unauthorized errors
  if (
    statusCode === 401 || 
    statusCode === 403 ||
    code === 'UNAUTHORIZED' ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('forbidden')
  ) {
    return true;
  }

  return false;
}

// Check if error is a transformation error that shouldn't be retried
function isTransformationError(error: any): boolean {
  const message = error?.message || '';
  return (
    message.includes('Unable to transform response') ||
    message.includes('Invalid JSON response') ||
    message.includes('Already read') ||
    message.includes('superjson') ||
    message.includes('serialize') ||
    message.includes('deserialize')
  );
}

function redirectToRoot() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = '/';
  } else {
    // For mobile, we'll let the GlobalErrorHandler handle the redirect
    // by triggering a custom error that will be caught by the global handler
    const redirectError = new Error('API_REDIRECT_NEEDED');
    // Trigger this after a short delay to ensure it's caught by global handlers
    setTimeout(() => {
      throw redirectError;
    }, 0);
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 30 seconds
      staleTime: 30 * 1000,
      
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Only refetch on window focus if data is stale
      refetchOnWindowFocus: 'always',
      
      // Retry failed requests with specific logic
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors (they won't resolve with retry)
        if (shouldRedirectOnAPIError(error)) return false;
        
        // Don't retry tRPC transformation errors
        if (isTransformationError(error)) return false;
        
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
      
      // Don't refetch on reconnect if data is fresh
      refetchOnReconnect: 'always',

      // Global error handler for queries
      onError: (error: any) => {
        // Don't redirect on transformation or fetch errors
        if (isTransformationError(error)) return;
        
        if (shouldRedirectOnAPIError(error)) {
          redirectToRoot();
        }
      }
    },
    mutations: {
      // Retry failed mutations with specific logic
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (shouldRedirectOnAPIError(error)) return false;
        
        // Don't retry transformation errors  
        if (isTransformationError(error)) return false;
        
        // Retry other errors once
        return failureCount < 1;
      },

      // Global error handler for mutations
      onError: (error: any) => {
        // Don't redirect on transformation or fetch errors
        if (isTransformationError(error)) return;
        
        if (shouldRedirectOnAPIError(error)) {
          redirectToRoot();
        }
      }
    }
  },
});

/**
 * A set of typesafe hooks for consuming your API.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient({
    transformer: customTransformer,
    links: [
      loggerLink({
        enabled: (opts) => {
          // Only log critical errors in development
          if (opts.direction === "down" && opts.result instanceof Error) {
            const errorMessage = opts.result.message || '';
            
            // Don't log transformation errors - they're handled gracefully
            if (isTransformationError(opts.result)) {
              return false;
            }
            
            // Don't log "Already read" errors - they're handled gracefully
            if (errorMessage.includes('Already read')) {
              return false;
            }
            
            // Only log critical errors that need attention
            return process.env.NODE_ENV === "development" && shouldRedirectOnAPIError(opts.result);
          }
          
          // Don't log any successful queries or requests
          return false;
        },
        colorMode: "ansi",
      }),
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        headers: async () => {
          const headers = new Map<string, string>();
          headers.set("x-trpc-source", "expo-react");
          headers.set("Content-Type", "application/json");

          const cookies = authClient.getCookie();
          if (cookies) {
            headers.set("Cookie", cookies);
          }

          // Add authentication headers for tRPC
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session && !error) {
              if (session.access_token) {
                headers.set("Authorization", `Bearer ${session.access_token}`);
              }
              if (session.user?.id) {
                headers.set("x-user-id", session.user.id);
              }
            }
          } catch (error) {
            // Silently handle auth session errors
          }

          return Object.fromEntries(headers);
        },
        fetch: async (input, init) => {
          try {
            const response = await fetch(input, {
              ...init,
              credentials: 'include',
            });

            // For error responses, let tRPC handle the parsing
            // Don't read the response body here to avoid "Already read" errors
            if (!response.ok) {
              // Just throw a basic error and let tRPC handle the response parsing
              const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
              (error as any).data = {
                httpStatus: response.status,
                code: 'HTTP_ERROR'
              };
              throw error;
            }

            // For successful responses, return as-is and let tRPC handle parsing
            return response;
          } catch (error) {
            // Re-throw with context but don't modify the error if it's already structured
            if (error instanceof Error) {
              // Don't wrap already wrapped errors
              if (error.message.startsWith('tRPC fetch error:')) {
                throw error;
              }
              throw new Error(`tRPC fetch error: ${error.message}`);
            }
            throw error;
          }
        },
      }),
    ],
  }),
  queryClient,
});

export { type RouterInputs, type RouterOutputs } from "@omnii/api";
