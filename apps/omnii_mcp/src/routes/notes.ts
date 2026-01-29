/**
 * Note Routes
 *
 * REST endpoints for note CRUD, template creation, and backlinks.
 *
 * Endpoints:
 * - POST   /api/notes           Create note
 * - POST   /api/notes/from-template  Create from template
 * - GET    /api/notes           List recent notes
 * - GET    /api/notes/:id       Get note by ID
 * - GET    /api/notes/:id/backlinks  Get backlinks
 * - PATCH  /api/notes/:id       Update note
 * - DELETE /api/notes/:id       Delete note
 * - GET    /api/notes/search    Search notes
 * - GET    /api/notes/templates List templates
 */

import { Elysia, t } from 'elysia';
import { createClientForUser } from '../services/neo4j/http-client';
import {
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
  listRecentNotes,
  searchNotesByTitle,
} from '../notes/graph/note-operations';
import { resolveWikilinks, updateNoteLinks } from '../notes/graph/link-resolver';
import { getBacklinks } from '../notes/graph/backlinks-query';
import { fillTemplate, listTemplates, generateTitle } from '../notes/templates';
import { extractWikilinks, countWikilinks } from '../notes/parsers';
import type { NoteInput, TemplateContext, TemplateType } from '../notes/types';

/**
 * Note routes
 */
export const noteRoutes = new Elysia({ prefix: '/notes' })
  /**
   * Create a new note
   *
   * POST /api/notes
   * Body: { userId, title, content, createdVia }
   */
  .post(
    '/',
    async ({ body, set }) => {
      const { userId, title, content, createdVia } = body;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        // Create note
        const input: NoteInput = {
          title,
          content,
          createdVia: createdVia as 'manual' | 'voice' | 'template',
        };

        const { noteId, normalizedTitle } = await createNote(client, input);

        // Resolve wikilinks in content
        const linkResult = await resolveWikilinks(client, noteId, content);

        return {
          success: true,
          noteId,
          normalizedTitle,
          linksCreated: linkResult.linksCreated,
          stubsCreated: linkResult.stubsCreated,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to create note',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        title: t.String({ minLength: 1, maxLength: 500 }),
        content: t.String(),
        createdVia: t.Optional(
          t.Union([t.Literal('manual'), t.Literal('voice'), t.Literal('template')])
        ),
      }),
    }
  )

  /**
   * Create note from template
   *
   * POST /api/notes/from-template
   * Body: { userId, templateType, context }
   */
  .post(
    '/from-template',
    async ({ body, set }) => {
      const { userId, templateType, context } = body;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        // Build template context
        const templateContext: TemplateContext = {
          currentUser: context.currentUser || userId,
          currentDate: context.date ? new Date(context.date) : new Date(),
          meeting: context.meeting,
          contact: context.contact,
          journal: context.journal,
        };

        // Fill template
        const filledContent = fillTemplate(
          templateType as TemplateType,
          templateContext
        );
        const title = generateTitle(templateType as TemplateType, templateContext);

        // Create note
        const input: NoteInput = {
          title,
          content: filledContent,
          createdVia: 'template',
          templateType: templateType as TemplateType,
        };

        const { noteId, normalizedTitle } = await createNote(client, input);

        // Resolve wikilinks
        const linkResult = await resolveWikilinks(client, noteId, filledContent);

        return {
          success: true,
          noteId,
          normalizedTitle,
          title,
          linksCreated: linkResult.linksCreated,
          stubsCreated: linkResult.stubsCreated,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to create note from template',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        templateType: t.Union([
          t.Literal('meeting-notes'),
          t.Literal('daily-journal'),
          t.Literal('contact-notes'),
        ]),
        context: t.Object({
          currentUser: t.Optional(t.String()),
          date: t.Optional(t.String()), // ISO date string
          meeting: t.Optional(
            t.Object({
              title: t.String(),
              attendees: t.Array(t.String()),
              project: t.Optional(t.String()),
            })
          ),
          contact: t.Optional(
            t.Object({
              name: t.String(),
              company: t.Optional(t.String()),
              email: t.Optional(t.String()),
            })
          ),
          journal: t.Optional(
            t.Object({
              previousDate: t.Optional(t.String()),
              nextDate: t.Optional(t.String()),
            })
          ),
        }),
      }),
    }
  )

  /**
   * List available templates
   *
   * GET /api/notes/templates
   */
  .get('/templates', () => {
    return {
      templates: listTemplates(),
    };
  })

  /**
   * Search notes
   *
   * GET /api/notes/search?userId=xxx&q=query&limit=20
   */
  .get(
    '/search',
    async ({ query, set }) => {
      const { userId, q, limit } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const notes = await searchNotesByTitle(client, q, limit || 20);

        return {
          query: q,
          count: notes.length,
          notes,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to search notes',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 1 }),
        q: t.String({ minLength: 1 }),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )

  /**
   * List recent notes
   *
   * GET /api/notes?userId=xxx&limit=50&includeStubs=false
   */
  .get(
    '/',
    async ({ query, set }) => {
      const { userId, limit, includeStubs } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const notes = await listRecentNotes(
          client,
          limit || 50,
          includeStubs === 'true'
        );

        return {
          count: notes.length,
          notes,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to list notes',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 1 }),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        includeStubs: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Analyze note content (preview wikilinks without creating)
   *
   * POST /api/notes/analyze
   * Body: { content }
   */
  .post(
    '/analyze',
    async ({ body }) => {
      const { content } = body;

      const wikilinks = extractWikilinks(content);
      const count = countWikilinks(content);

      return {
        wikilinkCount: count,
        wikilinks: wikilinks.map((w) => ({
          target: w.target,
          display: w.display,
          normalizedTarget: w.normalizedTarget,
          position: w.position,
        })),
      };
    },
    {
      body: t.Object({
        content: t.String(),
      }),
    }
  )

  /**
   * Get note by ID
   *
   * GET /api/notes/:id?userId=xxx
   */
  .get(
    '/:id',
    async ({ params, query, set }) => {
      const { id } = params;
      const { userId } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const note = await getNoteById(client, id);

        if (!note) {
          set.status = 404;
          return { error: 'Note not found' };
        }

        // Parse wikilinks for client display
        const wikilinks = note.content ? extractWikilinks(note.content) : [];

        return {
          note,
          wikilinks: wikilinks.map((w) => ({
            target: w.target,
            display: w.display,
            normalizedTarget: w.normalizedTarget,
          })),
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to get note',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        userId: t.String({ minLength: 1 }),
      }),
    }
  )

  /**
   * Get backlinks for a note
   *
   * GET /api/notes/:id/backlinks?userId=xxx&limit=50&offset=0
   */
  .get(
    '/:id/backlinks',
    async ({ params, query, set }) => {
      const { id } = params;
      const { userId, limit, offset } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const backlinksData = await getBacklinks(
          client,
          id,
          limit || 50,
          offset || 0
        );

        return backlinksData;
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to get backlinks',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        userId: t.String({ minLength: 1 }),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
    }
  )

  /**
   * Update note
   *
   * PATCH /api/notes/:id
   * Body: { userId, title?, content? }
   */
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      const { id } = params;
      const { userId, title, content } = body;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        // Update note
        await updateNote(client, id, { title, content });

        // If content updated, re-resolve wikilinks
        let linkResult = null;
        if (content !== undefined) {
          linkResult = await updateNoteLinks(client, id, content);
        }

        return {
          success: true,
          noteId: id,
          linksUpdated: linkResult
            ? {
                linksCreated: linkResult.linksCreated,
                stubsCreated: linkResult.stubsCreated,
              }
            : null,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to update note',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        title: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
        content: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Delete note
   *
   * DELETE /api/notes/:id?userId=xxx
   */
  .delete(
    '/:id',
    async ({ params, query, set }) => {
      const { id } = params;
      const { userId } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        await deleteNote(client, id);

        return {
          success: true,
          message: 'Note deleted',
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to delete note',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        userId: t.String({ minLength: 1 }),
      }),
    }
  );
