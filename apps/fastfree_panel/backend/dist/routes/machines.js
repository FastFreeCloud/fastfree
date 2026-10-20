/**
 * GET /api/v1/machines
 * POST /api/v1/machines/:name/build
 *
 * Certified machine fleet inventory and declarative GitHub Actions build trigger.
 * See docs/spa-architecture.md.
 */
import { Hono } from 'hono';
import { clanService } from '../core/clan.service.js';
import { clanMachineBuildSchema } from '../schemas/clan.schema.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';
export const machinesRoutes = new Hono();
machinesRoutes.get('/machines', async (c) => {
    try {
        const machines = await clanService.listMachines();
        const body = { machines };
        return c.json(ok(body));
    }
    catch (error) {
        throw error instanceof ApiError ? error : ApiError.upstream(String(error));
    }
});
machinesRoutes.post('/machines/:name/build', async (c) => {
    const name = c.req.param('name');
    try {
        const json = (await c.req.json().catch(() => ({})));
        const defaultFormat = name.toLowerCase() === 'client1' ? 'vhdx' : 'iso';
        const parsed = clanMachineBuildSchema.parse({
            machine: name,
            format: json.format ?? defaultFormat,
            architecture: json.architecture ?? 'x86_64-linux',
            noSecrets: json.noSecrets ?? false,
            buildHost: json.buildHost,
            dryRun: json.dryRun ?? false,
        });
        const result = await clanService.buildMachine(parsed.machine, parsed.format, {
            architecture: parsed.architecture,
            noSecrets: parsed.noSecrets,
            buildHost: parsed.buildHost,
            dryRun: parsed.dryRun,
        });
        return c.json(ok(result));
    }
    catch (error) {
        throw error instanceof ApiError ? error : ApiError.upstream(String(error));
    }
});
//# sourceMappingURL=machines.js.map