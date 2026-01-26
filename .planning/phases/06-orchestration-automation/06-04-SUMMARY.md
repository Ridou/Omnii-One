---
phase: 06-orchestration-automation
plan: 04
subsystem: security
tags: [hmac, webhook, security, crypto, validation]

dependency-graph:
  requires: [06-01]
  provides: ["webhook-validation", "hmac-signing", "replay-protection"]
  affects: [06-05, 06-06, 06-07]

tech-stack:
  added: []
  patterns: ["HMAC-SHA256 signing", "timing-safe comparison", "replay attack prevention"]

file-tracking:
  key-files:
    created:
      - apps/omnii_mcp/src/services/workflows/webhook-validator.ts
    modified:
      - apps/omnii_mcp/src/services/workflows/index.ts
      - apps/omnii_mcp/src/routes/n8n-webhooks.ts

decisions:
  - id: "SEC-HMAC-256"
    decision: "Use HMAC-SHA256 for webhook signatures"
    rationale: "Industry standard, supported by n8n, good security-performance balance"

metrics:
  duration: 3min
  completed: 2026-01-26
---

# Phase 6 Plan 04: Webhook Signature Validation Summary

HMAC-SHA256 webhook signature validation for n8n webhook security (ORCH-02, SEC-04).

## What Was Built

### Webhook Validator Service
**File:** `apps/omnii_mcp/src/services/workflows/webhook-validator.ts`

Comprehensive webhook signature validation with:

1. **createWebhookSignature(payload, secret)** - Creates HMAC-SHA256 signatures
   - Uses Node.js crypto module
   - Returns hex-encoded signature

2. **timingSafeCompare(a, b)** - Constant-time string comparison
   - Uses crypto.timingSafeEqual
   - Handles unequal length strings securely

3. **validateWebhookSignature(options)** - Main validation logic
   - Validates HMAC signature
   - Optional timestamp validation for replay protection
   - Returns structured validation result

4. **validateN8nWebhook(request, body, ipAddress)** - Elysia middleware helper
   - Extracts signature headers (x-webhook-signature, x-n8n-signature)
   - Extracts optional timestamp headers
   - Logs failed validations as security events
   - Development mode bypass when N8N_WEBHOOK_SECRET not set

5. **generateWebhookHeaders(payload, secret)** - For outgoing webhooks
   - Creates signature and timestamp headers

### Route Integration
**File:** `apps/omnii_mcp/src/routes/n8n-webhooks.ts`

Both webhook endpoints now validate signatures:
- `/n8n/progress/:sessionId` - Progress update webhook
- `/n8n/response/:sessionId` - Final response webhook

Integration includes:
- Signature validation at request start
- 401 response for invalid signatures
- Audit logging for successful receipts
- Security event logging for failed validations

## Technical Details

### Signature Algorithm
```typescript
crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
```

### Timing Attack Prevention
```typescript
// Equal length check with constant-time fallback
if (bufA.length !== bufB.length) {
  crypto.timingSafeEqual(bufA, bufA); // Maintain timing
  return false;
}
return crypto.timingSafeEqual(bufA, bufB);
```

### Replay Attack Prevention
- Timestamp validation with 5-minute window
- Rejects timestamps more than 1 minute in the future
- Configurable via maxAgeMs option

### Development Mode
- Skips validation when N8N_WEBHOOK_SECRET not set
- Logs warning for visibility
- Production mode requires valid secret

## Commits

| Commit | Description |
|--------|-------------|
| f00134b | Create webhook signature validator |
| ac2c1ac | Integrate validation into n8n routes |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Checklist

- [x] `bun run build` compiles (no new errors in webhook files)
- [x] createWebhookSignature produces valid HMAC-SHA256
- [x] timingSafeCompare uses crypto.timingSafeEqual
- [x] Invalid signatures are rejected in webhook routes
- [x] Failed validations are logged as security events
- [x] Successful webhooks are audit logged

## Next Phase Readiness

**Ready for:** Plan 06-05 (Response Collection)
- Webhook validation in place for secure n8n communication
- Audit logging captures webhook events
- Foundation set for secure workflow orchestration
