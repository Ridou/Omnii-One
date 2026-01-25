import { Elysia, t } from 'elysia';
import { provisionUserDatabase, getProvisioningStatus } from '../../services/neo4j/provisioning';
import { setupUserSchema } from '../../../scripts/setup-user-schema';

// Supabase webhook payload type
const SignupWebhookBody = t.Object({
  type: t.Literal('INSERT'),
  table: t.Literal('users'),
  record: t.Object({
    id: t.String(),
    email: t.Optional(t.String()),
    created_at: t.String(),
  }),
  schema: t.Literal('auth'),
});

export const authWebhooks = new Elysia({ prefix: '/webhooks/auth' })
  // Health check for webhook endpoint
  .get('/health', () => ({ status: 'ok', webhook: 'auth' }))

  // Supabase auth.users INSERT webhook
  // Configure in Supabase: Database -> Webhooks -> auth.users -> INSERT
  .post('/signup', async ({ body, set }) => {
    const { record } = body;
    const userId = record.id;

    console.log(`[Auth Webhook] New user signup: ${userId}`);

    try {
      const result = await provisionUserDatabase(userId);

      console.log(`[Auth Webhook] Database provisioning started: ${result.instanceId}`);

      return {
        success: true,
        userId,
        instanceId: result.instanceId,
        status: result.status,
        message: 'Database provisioning started. Use /webhooks/auth/status/:userId to check progress.',
      };

    } catch (error) {
      console.error(`[Auth Webhook] Provisioning failed:`, error);
      set.status = 500;
      return {
        success: false,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: SignupWebhookBody,
  })

  // Status check endpoint
  .get('/status/:userId', async ({ params }) => {
    const status = await getProvisioningStatus(params.userId);
    return status;
  }, {
    params: t.Object({
      userId: t.String(),
    }),
  })

  // Manual schema setup endpoint (admin only)
  .post('/setup-schema/:userId', async ({ params, headers, set }) => {
    const adminKey = headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const result = await setupUserSchema(params.userId);
      return result;
    } catch (error) {
      set.status = 500;
      return {
        error: 'Schema setup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      userId: t.String(),
    }),
  });
