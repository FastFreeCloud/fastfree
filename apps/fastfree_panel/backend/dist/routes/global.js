/**
 * GET /api/v1/global/show
 *
 * Filtered output of the verified top-level `clan show` command. clan-core
 * 26.05 has no `global` subcommand; the meta information lives at `clan show`.
 * Only name, description and domain are returned.
 */
import { Hono } from 'hono';
import { argvFor } from '../clan/allowlist.js';
import { mapClanFailure, runClan } from '../clan/exec.js';
import { parseGlobalShow } from '../clan/parse.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';
export const globalRoutes = new Hono();
globalRoutes.get('/global/show', async (c) => {
    try {
        const result = await runClan(argvFor('global.show'));
        const summary = parseGlobalShow(result.stdout);
        return c.json(ok(summary));
    }
    catch (error) {
        if (error instanceof ApiError && error.code === 'NOT_CONFIGURED') {
            return c.json(ok({
                name: 'fastfree',
                description: 'FastFree OS Clan',
                domain: 'fastfree.local',
            }));
        }
        throw error instanceof ApiError ? error : mapClanFailure(error);
    }
});
//# sourceMappingURL=global.js.map