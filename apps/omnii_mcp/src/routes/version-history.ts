import { Elysia, t } from 'elysia';
import { createVersionedOperations, createHttpNeo4jClient, type ChangeAuthor } from '../graph/versioning';

export const versionHistoryRoutes = new Elysia({ prefix: '/api/versions' })
  // Get version history for an entity
  .get(
    '/:entityId',
    async ({ params, query }) => {
      const client = createHttpNeo4jClient();
      const ops = createVersionedOperations(client);

      const history = await ops.getVersionHistory(
        params.entityId,
        query.limit || 20
      );

      return {
        entityId: params.entityId,
        versions: history,
        count: history.length,
      };
    },
    {
      params: t.Object({
        entityId: t.String(),
      }),
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )

  // Get specific version
  .get(
    '/:entityId/:version',
    async ({ params }) => {
      const client = createHttpNeo4jClient();
      const ops = createVersionedOperations(client);

      const version = await ops.getVersion(params.entityId, params.version);

      if (!version) {
        return {
          error: 'Version not found',
          entityId: params.entityId,
          version: params.version,
        };
      }

      return version;
    },
    {
      params: t.Object({
        entityId: t.String(),
        version: t.Number(),
      }),
    }
  )

  // Create new version
  .post(
    '/:entityId',
    async ({ params, body }) => {
      const client = createHttpNeo4jClient();
      const ops = createVersionedOperations(client);

      const newVersion = await ops.createVersion(
        params.entityId,
        body.entityType,
        body.data,
        body.createdBy as ChangeAuthor,
        body.changeDescription
      );

      return {
        success: true,
        version: newVersion,
      };
    },
    {
      params: t.Object({
        entityId: t.String(),
      }),
      body: t.Object({
        entityType: t.String(),
        data: t.Record(t.String(), t.Unknown()),
        createdBy: t.Union([
          t.Literal('user'),
          t.Literal('ai_assistant'),
          t.Literal('system'),
          t.Literal('ingestion'),
        ]),
        changeDescription: t.Optional(t.String()),
      }),
    }
  )

  // Rollback to specific version
  .post(
    '/:entityId/rollback/:version',
    async ({ params, body }) => {
      const client = createHttpNeo4jClient();
      const ops = createVersionedOperations(client);

      try {
        const newVersion = await ops.rollbackToVersion(
          params.entityId,
          body.entityType,
          params.version
        );

        return {
          success: true,
          message: `Rolled back to version ${params.version}`,
          newVersion,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Rollback failed',
        };
      }
    },
    {
      params: t.Object({
        entityId: t.String(),
        version: t.Number(),
      }),
      body: t.Object({
        entityType: t.String(),
      }),
    }
  );
