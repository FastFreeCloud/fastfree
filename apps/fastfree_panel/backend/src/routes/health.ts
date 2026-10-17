/**
 * Liveness / readiness endpoint.
 *
 * Contract: process health only. It must never leak filesystem paths, hostnames,
 * environment values, tokens or Clan output. See docs/spa-architecture.md.
 */

import { Hono } from 'hono';

import { config } from '../config.js';
import { ok } from '../http/respond.js';

export interface HealthData {
  status: 'ok';
  /** Whether a Clan repository root is configured server-side. Boolean only. */
  clanConfigured: boolean;
  /** Whether an explicit bootstrap token check is active. Boolean only. */
  bootstrapAuthEnabled: boolean;
  uptimeSeconds: number;
}

const startedAt = Date.now();

export const healthRoutes = new Hono();

healthRoutes.get('/health', (c) => {
  const body: HealthData = {
    status: 'ok',
    clanConfigured: config.clanDir !== null,
    bootstrapAuthEnabled: config.bootstrapToken !== null,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  };
  return c.json(ok(body));
});

healthRoutes.get('/system/diagnostics', async (c) => {
  const { nixosService } = await import('../core/nixos.service.js');
  const diagnostics = await nixosService.getSystemDiagnostics();
  return c.json(ok(diagnostics));
});