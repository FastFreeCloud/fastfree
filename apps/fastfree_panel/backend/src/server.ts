/**
 * Fastfree Clan Panel — private Node API backend.
 *
 * Architecture (docs/spa-architecture.md):
 *   browser ──(SPA, static)──> reverse proxy ──/api/*──> this process (loopback)
 *   this process ──execFile(argv[])──> `clan`
 *
 * Hard rules enforced here:
 *   - the browser never executes Clan and never receives server secrets;
 *   - every Clan call goes through a fixed allowlist (see clan/allowlist.ts);
 *   - nothing from this module is imported into the SPA bundle.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { config } from './config.js';
import { ApiError, statusForCode, toErrorBody } from './http/errors.js';
import { globalRoutes } from './routes/global.js';
import { healthRoutes } from './routes/health.js';
import { machinesRoutes } from './routes/machines.js';

const API_PREFIX = '/api/v1';

export function createApp(): Hono {
  const app = new Hono();

  app.use('*', logger());
  app.use('*', secureHeaders());

  // Development convenience only: the Quasar dev proxy forwards /api from the
  // same origin, so the browser sends a normal same-origin request here. CORS is
  // restricted to loopback origins and must not be widened for production —
  // production uses a same-origin reverse proxy and needs no CORS at all.
  if (process.env.NODE_ENV !== 'production') {
    app.use(
      '*',
      cors({
        // Return the origin to allow it, or null to omit the CORS header.
        origin: (origin) => (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : null),
        credentials: false,
      }),
    );
  }

  app.route(API_PREFIX, healthRoutes);
  app.route(API_PREFIX, machinesRoutes);
  app.route(API_PREFIX, globalRoutes);

  app.notFound((c) =>
    c.json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } }, 404),
  );

  // Single global error boundary: never leak raw stderr, stack traces or paths.
  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json(toErrorBody(error), statusForCode(error.code));
    }
    // Unexpected failure: log server-side only, return an opaque message.
    console.error('[backend] unhandled error:', error);
    return c.json(
      { error: { code: 'INTERNAL', message: 'Internal server error.' } },
      500,
    );
  });

  return app;
}

if (process.env.CLAN_PANEL_API_NO_AUTOSTART !== '1') {
  const app = createApp();
  serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
    console.log(`[backend] listening on http://${config.host}:${info.port}${API_PREFIX}`);
    console.log(`[backend] clanConfigured=${config.clanDir !== null} bootstrapAuth=${config.bootstrapToken !== null}`);
  });
}