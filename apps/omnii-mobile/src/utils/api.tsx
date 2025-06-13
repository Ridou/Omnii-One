import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@omnii/api";

import { authClient } from "./auth";
import { getBaseUrl } from "./base-url";
import { supabase } from "~/lib/supabase";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 30 seconds
      staleTime: 30 * 1000,
      
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Only refetch on window focus if data is stale
      refetchOnWindowFocus: 'always',
      
      // Retry failed requests once
      retry: 1,
      
      // Don't refetch on reconnect if data is fresh
      refetchOnReconnect: 'always'
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    }
  },
});

/**
 * A set of typesafe hooks for consuming your API.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient({
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
        colorMode: "ansi",
      }),
      httpBatchLink({
        transformer: superjson,
        url: `${getBaseUrl()}/api/trpc`,
        async headers() {
          const headers = new Map<string, string>();
          headers.set("x-trpc-source", "expo-react");
          console.log('[tRPC]headers', headers);

          const cookies = authClient.getCookie();
          if (cookies) {
            headers.set("Cookie", cookies);
          }

          // Add authentication headers for tRPC
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            console.log('[tRPC]session', session);
            if (session && !error) {
              if (session.access_token) {
                headers.set("Authorization", `Bearer ${session.access_token}`);
              }
              if (session.user?.id) {
                headers.set("x-user-id", session.user.id);
              }
            }
          } catch (error) {
            console.warn('[tRPC] Failed to get session for headers:', error);
          }

          return Object.fromEntries(headers);
        },
      }),
    ],
  }),
  queryClient,
});

console.log('hello',trpc)
export { type RouterInputs, type RouterOutputs } from "@omnii/api";
