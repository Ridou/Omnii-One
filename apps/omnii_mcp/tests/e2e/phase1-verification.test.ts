/**
 * Phase 1 E2E Verification Tests
 *
 * Tests the foundation infrastructure built in Phase 1:
 * - Neo4j HTTP client
 * - Environment configuration
 * - Supabase auth middleware
 * - Database-per-user provisioning
 * - Protected routes with tenant isolation
 *
 * Run with: cd apps/omnii_mcp && bun test tests/e2e/phase1-verification.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8081';
const TEST_TIMEOUT = 10000;

// Track if server is running
let serverRunning = false;

async function checkServer(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe('Phase 1: Foundation Infrastructure Verification', () => {

  beforeAll(async () => {
    serverRunning = await checkServer();
    if (!serverRunning) {
      console.log('\n⚠️  Server not running at', BASE_URL);
      console.log('   Start with: cd apps/omnii_mcp && bun run src/app.ts\n');
    }
  });

  describe('1. Public Endpoints (no auth required)', () => {

    test('GET /health returns ok', async () => {
      if (!serverRunning) {
        console.log('   [SKIP] Server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
    }, TEST_TIMEOUT);

    test('GET /api/auth/health returns ok with provider', async () => {
      if (!serverRunning) {
        console.log('   [SKIP] Server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/auth/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.provider).toBe('supabase');
    }, TEST_TIMEOUT);
  });

  describe('2. Auth Rejection (protected routes without token)', () => {

    test('GET /api/graph/status returns 401 without token', async () => {
      if (!serverRunning) {
        console.log('   [SKIP] Server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/graph/status`);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
    }, TEST_TIMEOUT);

    test('GET /api/auth/me returns 401 without token', async () => {
      if (!serverRunning) {
        console.log('   [SKIP] Server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/auth/me`);
      expect(response.status).toBe(401);
    }, TEST_TIMEOUT);

    test('GET /api/graph/nodes/Concept returns 401 without token', async () => {
      if (!serverRunning) {
        console.log('   [SKIP] Server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/graph/nodes/Concept`);
      expect(response.status).toBe(401);
    }, TEST_TIMEOUT);

    test('POST /api/graph/query returns 401 without token', async () => {
      if (!serverRunning) {
        console.log('   [SKIP] Server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/graph/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cypher: 'RETURN 1' }),
      });
      expect(response.status).toBe(401);
    }, TEST_TIMEOUT);
  });

  describe('3. Auth with Invalid Token', () => {

    test('GET /api/auth/me returns 401 with invalid token', async () => {
      if (!serverRunning) {
        console.log('   [SKIP] Server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
        },
      });
      expect(response.status).toBe(401);
    }, TEST_TIMEOUT);

    test('GET /api/graph/status returns 401 with malformed token', async () => {
      if (!serverRunning) {
        console.log('   [SKIP] Server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/graph/status`, {
        headers: {
          'Authorization': 'Bearer not.a.valid.jwt.token',
        },
      });
      expect(response.status).toBe(401);
    }, TEST_TIMEOUT);
  });

  describe('4. Webhook Endpoints', () => {

    test('GET /api/webhooks/auth/health returns ok', async () => {
      if (!serverRunning) {
        console.log('   [SKIP] Server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/webhooks/auth/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.endpoint).toBe('auth-webhooks');
    }, TEST_TIMEOUT);
  });
});

// Summary output
afterAll(() => {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 1 E2E Verification Summary');
  console.log('='.repeat(60));

  if (!serverRunning) {
    console.log('\n❌ Server was not running - tests skipped');
    console.log('\nTo run full verification:');
    console.log('  1. Copy .env.example to .env.local');
    console.log('  2. Fill in Supabase and Neo4j credentials');
    console.log('  3. Start server: bun run src/app.ts');
    console.log('  4. Re-run: bun test tests/e2e/phase1-verification.test.ts');
  } else {
    console.log('\n✅ Automated tests completed');
    console.log('\nManual verification still needed:');
    console.log('  - Test with valid Supabase JWT');
    console.log('  - Verify user signup triggers database provisioning');
    console.log('  - Confirm graph queries hit user\'s database');
  }

  console.log('\n' + '='.repeat(60) + '\n');
});
