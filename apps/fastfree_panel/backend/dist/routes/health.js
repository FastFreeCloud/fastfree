/**
 * Liveness / readiness endpoint.
 *
 * Contract: process health only. It must never leak filesystem paths, hostnames,
 * environment values, tokens or Clan output. See docs/spa-architecture.md.
 */
import { Hono } from 'hono';
import { config } from '../config.js';
import { ok } from '../http/respond.js';
const startedAt = Date.now();
export const healthRoutes = new Hono();
healthRoutes.get('/health', (c) => {
    const body = {
        status: 'ok',
        clanConfigured: config.clanDir !== null,
        bootstrapAuthEnabled: config.bootstrapToken !== null,
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    };
    return c.json(ok(body));
});
//# sourceMappingURL=health.js.map