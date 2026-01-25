import { Elysia, t } from 'elysia';
import { createSupabaseClient } from '@omnii/auth';
import { createClientForUser } from '../services/neo4j/http-client';
import { getProvisioningStatus } from '../services/neo4j/provisioning';
import type { User } from '@supabase/supabase-js';

// Define auth context inline since plugin chain isn't working correctly
interface AuthContext {
  user: User;
  tenantId: string;
}

export const graphRoutes = new Elysia({ prefix: '/graph' })
  // Inline auth check - Elysia plugin chain doesn't propagate derive() correctly in Bun
  .derive(async ({ headers, set }): Promise<AuthContext> => {
    const authHeader = headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401;
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const supabase = createSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      set.status = 401;
      throw new Error('Invalid or expired token');
    }

    return {
      user,
      tenantId: user.id,
    };
  })

  // Check database status for current user
  .get('/status', async ({ tenantId }) => {
    const status = await getProvisioningStatus(tenantId);
    return {
      tenantId,
      database: status,
    };
  })

  // List nodes of a specific type
  .get('/nodes/:type', async ({ params, tenantId, set }) => {
    try {
      const client = await createClientForUser(tenantId);
      const result = await client.query(
        `MATCH (n:${params.type}) RETURN n LIMIT 50`
      );

      return {
        tenantId,
        nodeType: params.type,
        count: result.data.values.length,
        nodes: result.data.values.map(row => row[0]),
      };

    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready')) {
        set.status = 503;
        return {
          error: 'Database still provisioning',
          message: 'Your personal database is being set up. Please try again in a few minutes.',
        };
      }
      throw error;
    }
  }, {
    params: t.Object({
      type: t.String(),
    }),
  })

  // Search concepts
  .get('/search', async ({ query, tenantId, set }) => {
    try {
      const client = await createClientForUser(tenantId);
      const result = await client.query(
        `MATCH (c:Concept)
         WHERE c.name CONTAINS $text OR c.content CONTAINS $text
         RETURN c LIMIT 10`,
        { text: query.q || '' }
      );

      return {
        tenantId,
        query: query.q,
        results: result.data.values.map(row => row[0]),
      };

    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready')) {
        set.status = 503;
        return {
          error: 'Database still provisioning',
          message: 'Your personal database is being set up. Please try again in a few minutes.',
        };
      }
      throw error;
    }
  }, {
    query: t.Object({
      q: t.Optional(t.String()),
    }),
  })

  // Execute arbitrary Cypher (for debugging/testing)
  .post('/query', async ({ body, tenantId, set }) => {
    try {
      const client = await createClientForUser(tenantId);
      const result = await client.query(body.cypher, body.params || {});

      return {
        tenantId,
        result: result.data,
        counters: result.counters,
      };

    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready')) {
        set.status = 503;
        return {
          error: 'Database still provisioning',
          message: 'Your personal database is being set up. Please try again in a few minutes.',
        };
      }
      throw error;
    }
  }, {
    body: t.Object({
      cypher: t.String(),
      params: t.Optional(t.Record(t.String(), t.Any())),
    }),
  });
