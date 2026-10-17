/**
 * GET /api/v1/machines
 *
 * Machine identifiers and safe metadata only, from `clan machines list`.
 * The browser never supplies a machine name for this endpoint; it can only read
 * the inventory. See docs/spa-architecture.md.
 */

import { Hono } from 'hono';

import { argvFor } from '../clan/allowlist.js';
import { mapClanFailure, runClan } from '../clan/exec.js';
import { type MachineSummary, parseMachines } from '../clan/parse.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';

export interface MachinesData {
  machines: MachineSummary[];
}

export const machinesRoutes = new Hono();

machinesRoutes.get('/machines', async (c) => {
  try {
    const result = await runClan(argvFor('machines.list'));
    const body: MachinesData = { machines: parseMachines(result.stdout) };
    return c.json(ok(body));
  } catch (error) {
    // NOT_CONFIGURED / TIMEOUT / UPSTREAM_ERROR keep their code; anything else
    // degrades to an opaque UPSTREAM_ERROR. stderr never reaches the client.
    throw error instanceof ApiError ? error : mapClanFailure(error);
  }
});

machinesRoutes.post('/machines/:name/build', async (c) => {
  const name = c.req.param('name');
  try {
    const json = (await c.req.json().catch(() => ({}))) as {
      format?: string;
      noSecrets?: boolean;
      buildHost?: string;
      dryRun?: boolean;
    };

    const { clanService } = await import('../core/clan.service.js');
    const { clanMachineBuildSchema } = await import('../schemas/clan.schema.js');

    const parsed = clanMachineBuildSchema.parse({
      machine: name,
      format: json.format ?? 'iso',
      noSecrets: json.noSecrets ?? false,
      buildHost: json.buildHost,
      dryRun: json.dryRun ?? false,
    });

    const result = await clanService.buildMachine(parsed.machine, parsed.format, {
      noSecrets: parsed.noSecrets,
      buildHost: parsed.buildHost,
      dryRun: parsed.dryRun,
    });

    return c.json(ok(result));
  } catch (error) {
    throw error instanceof ApiError ? error : mapClanFailure(error);
  }
});