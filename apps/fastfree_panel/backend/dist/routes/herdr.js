/**
 * FastFree Herdr Agent Telemetry & Dispatch Routes.
 *
 * Exposes:
 *   GET  /herdr/status  - Live snapshot of all agents, panes, tabs, and status breakdown
 *   GET  /herdr/agents  - Condensed agent list for fast polling
 *   POST /herdr/prompt  - Dispatches an instruction or prompt to a designated agent
 */
import { Hono } from 'hono';
import { herdrService } from '../core/herdr.service.js';
import { herdrAgentPromptSchema } from '../schemas/herdr.schema.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';
export const herdrRoutes = new Hono();
/**
 * GET /herdr/status
 * Returns comprehensive Herdr ecosystem telemetry.
 */
herdrRoutes.get('/herdr/status', async (c) => {
    try {
        const status = await herdrService.getHerdrStatus();
        return c.json(ok(status));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to collect Herdr status';
        throw new ApiError('UPSTREAM_ERROR', message);
    }
});
/**
 * GET /herdr/agents
 * Returns list of live agents.
 */
herdrRoutes.get('/herdr/agents', async (c) => {
    try {
        const status = await herdrService.getHerdrStatus();
        return c.json(ok({ agents: status.agents }));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to list Herdr agents';
        throw new ApiError('UPSTREAM_ERROR', message);
    }
});
/**
 * POST /herdr/prompt
 * Submits an action or prompt to a target agent.
 */
herdrRoutes.post('/herdr/prompt', async (c) => {
    const raw = await c.req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
        throw ApiError.validation('Request body must be a JSON object with "target" and "text" fields.');
    }
    const parsed = herdrAgentPromptSchema.safeParse(raw);
    if (!parsed.success) {
        throw ApiError.validation(parsed.error.errors.map((e) => e.message).join(', '));
    }
    try {
        const result = await herdrService.dispatchPrompt(parsed.data);
        return c.json(ok(result));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Prompt dispatch error';
        throw new ApiError('INTERNAL', message);
    }
});
//# sourceMappingURL=herdr.js.map