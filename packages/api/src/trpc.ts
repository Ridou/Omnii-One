/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { initTRPC, TRPCError } from "@trpc/server";
import { z, ZodError } from "zod/v4";
import superjson from "superjson";

import type { Auth } from "@omnii/auth";
import { db } from "@omnii/db/client";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

interface CreateContextOptions {
  session: Awaited<ReturnType<Auth['api']['getSession']>> | null;
  headers: Headers;
  authApi: Auth['api'];
}

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-serverapitrpcts
 */
export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    headers: opts.headers,
    db,
    authApi: opts.authApi,
  };
};

/**
 * 🔐 Authentication Bridge for Supabase ↔ better-auth
 * 
 * This function handles authentication from multiple sources:
 * 1. better-auth session (standard tRPC)
 * 2. Supabase Bearer token (mobile app)
 * 3. x-user-id header (fallback for testing)
 */
const createAuthenticationBridge = async (
  authApi: Auth['api'], 
  headers: Record<string, string | string[] | undefined>
) => {
  try {
    // First, try better-auth session
    const betterAuthSession = await authApi.getSession({ headers });

    if (betterAuthSession?.user?.id) {
      console.log(`[AuthBridge] ✅ better-auth session: ${betterAuthSession.user.id}`);
      return betterAuthSession;
    }

    // Second, try Supabase Bearer token
    const authHeader = (Array.isArray(headers.authorization) ? headers.authorization[0] : headers.authorization) || '';
    const userIdHeader = (Array.isArray(headers['x-user-id']) ? headers['x-user-id'][0] : headers['x-user-id']) || '';

    if (authHeader.startsWith('Bearer ') && userIdHeader) {
      console.log(`[AuthBridge] 🔄 Supabase token detected for user: ${userIdHeader}`);
      
      // Create a mock session for Supabase users
      return {
        user: {
          id: userIdHeader,
          email: 'supabase-user@omnii.app', // Placeholder
          name: 'Supabase User',
        },
        session: {
          id: 'supabase-session',
          userId: userIdHeader,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        }
      };
    }

    // Third, fallback to test user for development
    const testUserId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
    console.log(`[AuthBridge] 🧪 Using test user fallback: ${testUserId}`);
    
    return {
      user: {
        id: testUserId,
        email: 'test-user@omnii.app',
        name: 'Test User',
      },
      session: {
        id: 'test-session',
        userId: testUserId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }
    };

  } catch (error) {
    console.error('[AuthBridge] ❌ Authentication error:', error);
    return null;
  }
};

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
  auth: Auth;
}) => {
  const authApi = opts.auth.api;
  const session = await authApi.getSession({
    headers: opts.headers,
  });
  return createInnerTRPCContext({
    session,
    headers: opts.headers,
    authApi,
  });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
});

/**
 * Create a server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure with enhanced authentication bridge
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
 * 🔐 Enhanced Protected Procedure for Google Services
 * 
 * This procedure includes additional logging and flexible authentication
 * for Google OAuth services that need special handling
 */
export const googleServiceProcedure = t.procedure.use(({ ctx, next }) => {
  // Enhanced user ID extraction with multiple fallbacks
  const userId = ctx.session?.user?.id || 
                 ctx.headers.get?.('x-user-id') ||
                 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'; // Test user fallback

  console.log(`[GoogleServiceProcedure] User ID: ${userId} (source: ${
    ctx.session?.user?.id ? 'session' : 
    ctx.headers.get?.('x-user-id') ? 'header' : 'fallback'
  })`);

  if (!userId) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED", 
      message: "No user ID found - authentication required" 
    });
  }

  return next({
    ctx: {
      ...ctx,
      // Create a guaranteed session object
      session: ctx.session || {
        user: {
          id: userId,
          email: 'unknown@omnii.app',
          name: 'Unknown User'
        }
      },
      userId, // Direct access to user ID
      },
    });
  });
