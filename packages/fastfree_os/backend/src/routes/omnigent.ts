import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { omnigentService } from '../core/omnigent.service.js';
import { omnigentSyncService } from '../core/omnigent-sync.service.js';
import { databaseService } from '../core/database.service.js';
import {
  omnigentDispatchInputSchema,
  hindsightQueryInputSchema,
} from '../schemas/omnigent.schema.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';

export const omnigentRoutes = new Hono();

/**
 * GET /omnigent/database/status
 * Health, engine, and metrics probe for the active Omnigent database.
 */
omnigentRoutes.get('/omnigent/database/status', (c) => {
  const health = databaseService.getHealth();
  return c.json(ok(health));
});

/**
 * GET /omnigent/docs
 * Returns the indexed official Omnigent documentation catalog and verified features.
 */
omnigentRoutes.get('/omnigent/docs', (c) => {
  const topics = omnigentSyncService.getDocsIndex();
  return c.json(ok({ topics, total: topics.length }));
});

/**
 * POST /omnigent/docs/sync
 * Manually triggers a synchronization of official documentation into Hindsight memory.
 */
omnigentRoutes.post('/omnigent/docs/sync', async (c) => {
  const result = await omnigentSyncService.triggerSync();
  return c.json(ok(result));
});

/**
 * GET /omnigent/status
 * Live snapshot of Omnigent server, runners, and active sessions.
 */
omnigentRoutes.get('/omnigent/status', (c) => {
  const status = omnigentService.getStatus();
  return c.json(ok(status));
});

/**
 * GET /omnigent/sessions
 * List all active and completed sessions.
 */
omnigentRoutes.get('/omnigent/sessions', (c) => {
  const sessions = omnigentService.listSessions();
  return c.json(ok({ sessions }));
});

/**
 * GET /omnigent/sessions/:id
 * Get full session detail with subagent hierarchy.
 */
omnigentRoutes.get('/omnigent/sessions/:id', (c) => {
  const id = c.req.param('id');
  const session = omnigentService.getSession(id);
  if (!session) {
    throw new ApiError('NOT_FOUND', `Omnigent session "${id}" not found.`);
  }
  return c.json(ok(session));
});

/**
 * GET /omnigent/sessions/:id/events
 * Live Server-Sent Events (SSE) stream for realtime subagent execution tracking.
 */
omnigentRoutes.get('/omnigent/sessions/:id/events', async (c) => {
  const id = c.req.param('id');
  const session = omnigentService.getSession(id);
  if (!session) {
    throw new ApiError('NOT_FOUND', `Omnigent session "${id}" not found.`);
  }

  return streamSSE(c, async (stream) => {
    // 1. Send initial session snapshot
    await stream.writeSSE({
      data: JSON.stringify({ type: 'SNAPSHOT', session }),
      event: 'session-snapshot',
      id: String(Date.now()),
    });

    let active = true;

    // 2. Subscribe to live bus events
    const unsubscribe = omnigentService.subscribeSession(id, async (event) => {
      if (!active) return;
      try {
        await stream.writeSSE({
          data: JSON.stringify(event),
          event: 'session-event',
          id: String(Date.now()),
        });
      } catch {
        active = false;
      }
    });

    stream.onAbort(() => {
      active = false;
      unsubscribe();
    });

    // 3. Keepalive ping loop every 15s to keep proxy connections alive
    while (active) {
      await stream.sleep(15000);
      if (!active) break;
      try {
        await stream.writeSSE({
          data: JSON.stringify({ ping: true, timestamp: new Date().toISOString() }),
          event: 'ping',
        });
      } catch {
        active = false;
        break;
      }
    }
  });
});

/**
 * POST /omnigent/dispatch
 * Dispatches an automated multi-agent session.
 */
omnigentRoutes.post('/omnigent/dispatch', async (c) => {
  const raw = await c.req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    throw ApiError.validation('Request body must be a JSON object.');
  }

  const parsed = omnigentDispatchInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw ApiError.validation(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const created = omnigentService.dispatchSession(parsed.data);
  return c.json(ok(created));
});

/**
 * POST /omnigent/memory/query
 * Queries the Hindsight long-term memory engine with auto-sanitization.
 */
omnigentRoutes.post('/omnigent/memory/query', async (c) => {
  const raw = await c.req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    throw ApiError.validation('Request body must be a JSON object with "query" field.');
  }

  const parsed = hindsightQueryInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw ApiError.validation(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const result = await omnigentService.queryHindsight(parsed.data);
  return c.json(ok(result));
});
