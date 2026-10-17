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
import { parseMachines } from '../clan/parse.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';
export const machinesRoutes = new Hono();
machinesRoutes.get('/machines', async (c) => {
    try {
        const result = await runClan(argvFor('machines.list'));
        const body = { machines: parseMachines(result.stdout) };
        return c.json(ok(body));
    }
    catch (error) {
        // NOT_CONFIGURED / TIMEOUT / UPSTREAM_ERROR keep their code; anything else
        // degrades to an opaque UPSTREAM_ERROR. stderr never reaches the client.
        throw error instanceof ApiError ? error : mapClanFailure(error);
    }
});
//# sourceMappingURL=machines.js.map