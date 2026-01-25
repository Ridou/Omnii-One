/**
 * MCP Rate Limiting Middleware
 *
 * Token bucket rate limiter for MCP endpoints.
 * Limits requests per user (by JWT sub claim) or by IP for unauthenticated requests.
 */

import { rateLimit } from 'elysia-rate-limit';

/**
 * Rate limit configuration for MCP endpoints.
 */
export const MCP_RATE_LIMIT = {
  duration: 60000, // 60 second window
  max: 100, // 100 requests per minute
  errorResponse: {
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Rate limit exceeded. Maximum 100 requests per minute.',
    },
    id: null,
  },
} as const;

/**
 * Extract rate limit key from request.
 * Uses user ID from JWT if available, falls back to IP address.
 *
 * @param request - Incoming HTTP request
 * @returns Rate limit key (user:id or ip:address)
 */
function extractRateLimitKey(request: Request): string {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      // Decode JWT payload (base64url) to extract sub claim
      const payloadPart = token.split('.')[1];
      if (payloadPart) {
        const payload = JSON.parse(atob(payloadPart));
        if (payload.sub) {
          return `user:${payload.sub}`;
        }
      }
    } catch {
      // Fall through to IP-based limiting
    }
  }
  // Fallback to IP-based limiting
  return `ip:${request.headers.get('x-forwarded-for') || 'unknown'}`;
}

/**
 * Create rate limiter plugin instance.
 *
 * @returns Elysia rate limit plugin
 */
export function createRateLimiter() {
  return rateLimit({
    duration: MCP_RATE_LIMIT.duration,
    max: MCP_RATE_LIMIT.max,
    errorResponse: JSON.stringify(MCP_RATE_LIMIT.errorResponse),
    generator: (req) => extractRateLimitKey(req),
    countFailedRequest: false,
  });
}

/**
 * Pre-configured rate limiter instance for MCP endpoints.
 */
export const mcpRateLimiter = createRateLimiter();
