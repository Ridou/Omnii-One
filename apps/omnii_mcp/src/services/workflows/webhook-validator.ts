/**
 * Webhook Signature Validator
 *
 * HMAC-SHA256 signature validation for n8n webhook security.
 * Prevents webhook spoofing and replay attacks.
 */

import crypto from 'crypto';
import { logWebhookEvent } from '../audit/audit-logger';
import { AuditEventType } from '../audit/audit-events';

/**
 * Configuration for webhook validation.
 */
export interface WebhookValidatorConfig {
  /** Shared secret for HMAC signing (from N8N_WEBHOOK_SECRET env var) */
  secret: string;
  /** Maximum age of webhook in milliseconds (default: 5 minutes) */
  maxAgeMs?: number;
  /** Header name for the signature (default: 'x-webhook-signature') */
  signatureHeader?: string;
  /** Header name for the timestamp (default: 'x-webhook-timestamp') */
  timestampHeader?: string;
}

/**
 * Result of webhook signature validation.
 */
export interface WebhookValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: 'MISSING_SIGNATURE' | 'INVALID_SIGNATURE' | 'EXPIRED_TIMESTAMP' | 'MISSING_TIMESTAMP';
}

/**
 * Options for validateWebhookSignature function.
 */
export interface ValidateSignatureOptions {
  /** Raw request body as string */
  payload: string;
  /** Signature from request header */
  signature: string;
  /** Shared secret for HMAC */
  secret: string;
  /** Optional timestamp for replay protection (Unix ms) */
  timestamp?: number;
  /** Maximum age in milliseconds (default: 5 minutes) */
  maxAgeMs?: number;
}

/**
 * Default maximum age for webhook timestamps (5 minutes).
 */
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Create HMAC-SHA256 signature for a payload.
 *
 * @param payload - The payload to sign
 * @param secret - The shared secret
 * @returns Hex-encoded HMAC signature
 */
export function createWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Uses crypto.timingSafeEqual for constant-time comparison.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function timingSafeCompare(a: string, b: string): boolean {
  // Convert strings to buffers for crypto.timingSafeEqual
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // timingSafeEqual requires equal length buffers
  // If lengths differ, we still do a comparison to maintain constant time
  if (bufA.length !== bufB.length) {
    // Compare against itself to maintain timing, then return false
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validate a webhook signature with optional timestamp checking.
 *
 * @param options - Validation options
 * @returns Validation result
 */
export function validateWebhookSignature(
  options: ValidateSignatureOptions
): WebhookValidationResult {
  const { payload, signature, secret, timestamp, maxAgeMs = DEFAULT_MAX_AGE_MS } = options;

  // Check timestamp if provided (replay protection)
  if (timestamp !== undefined) {
    const now = Date.now();
    const age = now - timestamp;

    if (age > maxAgeMs) {
      return {
        valid: false,
        error: `Webhook timestamp expired (age: ${Math.round(age / 1000)}s, max: ${Math.round(maxAgeMs / 1000)}s)`,
        errorCode: 'EXPIRED_TIMESTAMP',
      };
    }

    // Also reject timestamps from the future (with small tolerance)
    if (timestamp > now + 60000) {
      return {
        valid: false,
        error: 'Webhook timestamp is in the future',
        errorCode: 'EXPIRED_TIMESTAMP',
      };
    }
  }

  // Compute expected signature
  const expectedSignature = createWebhookSignature(payload, secret);

  // Timing-safe comparison
  if (!timingSafeCompare(signature, expectedSignature)) {
    return {
      valid: false,
      error: 'Invalid webhook signature',
      errorCode: 'INVALID_SIGNATURE',
    };
  }

  return { valid: true };
}

/**
 * Elysia middleware helper for validating n8n webhooks.
 * Extracts headers and validates the request.
 *
 * @param request - Elysia request object
 * @param body - Raw request body string
 * @param ipAddress - Client IP address for logging
 * @returns Validation result
 */
export async function validateN8nWebhook(
  request: Request,
  body: string,
  ipAddress?: string
): Promise<WebhookValidationResult> {
  const secret = process.env.N8N_WEBHOOK_SECRET;

  // In development, allow skipping validation if secret not set
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logWebhookEvent(AuditEventType.WEBHOOK_VALIDATION_FAILED, 'n8n', false, {
        reason: 'Missing N8N_WEBHOOK_SECRET in production',
        ipAddress,
      });
      return {
        valid: false,
        error: 'Webhook validation not configured',
        errorCode: 'MISSING_SIGNATURE',
      };
    }
    // Development mode: skip validation with warning
    console.warn('[Webhook Validator] Skipping validation - N8N_WEBHOOK_SECRET not set');
    return { valid: true };
  }

  // Extract signature from headers
  const signature =
    request.headers.get('x-webhook-signature') ||
    request.headers.get('x-n8n-signature');

  if (!signature) {
    logWebhookEvent(AuditEventType.WEBHOOK_VALIDATION_FAILED, 'n8n', false, {
      reason: 'Missing signature header',
      ipAddress,
    });
    return {
      valid: false,
      error: 'Missing webhook signature',
      errorCode: 'MISSING_SIGNATURE',
    };
  }

  // Extract optional timestamp for replay protection
  const timestampHeader =
    request.headers.get('x-webhook-timestamp') ||
    request.headers.get('x-n8n-timestamp');
  const timestamp = timestampHeader ? parseInt(timestampHeader, 10) : undefined;

  // Validate
  const result = validateWebhookSignature({
    payload: body,
    signature,
    secret,
    timestamp,
  });

  // Log failed validations as security events
  if (!result.valid) {
    logWebhookEvent(AuditEventType.WEBHOOK_VALIDATION_FAILED, 'n8n', false, {
      reason: result.error,
      errorCode: result.errorCode,
      ipAddress,
      hasTimestamp: timestamp !== undefined,
    });
  }

  return result;
}

/**
 * Generate headers for outgoing webhook requests.
 * Use this when sending webhooks that need to be validated.
 *
 * @param payload - Request body to sign
 * @param secret - Shared secret
 * @returns Headers object with signature and timestamp
 */
export function generateWebhookHeaders(
  payload: string,
  secret: string
): { 'x-webhook-signature': string; 'x-webhook-timestamp': string } {
  const timestamp = Date.now().toString();
  const signature = createWebhookSignature(payload, secret);

  return {
    'x-webhook-signature': signature,
    'x-webhook-timestamp': timestamp,
  };
}
