/**
 * FastFree Paseo Agent Telemetry & Dispatch Routes.
 *
 * Exposes:
 *   GET  /paseo/status  - Live snapshot of all agents and status breakdown
 *   GET  /paseo/agents  - Condensed agent list for fast polling
 *   POST /paseo/prompt  - Dispatches an instruction or prompt to a designated agent
 */
import { Hono } from 'hono';
import { paseoService } from '../core/paseo.service.js';
import { paseoAgentPromptSchema } from '../schemas/paseo.schema.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';
export const paseoRoutes = new Hono();
/**
 * GET /paseo/status
 * Returns comprehensive Paseo ecosystem telemetry.
 */
paseoRoutes.get('/paseo/status', async (c) => {
    try {
        const status = await paseoService.getStatus();
        return c.json(ok(status));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to collect Paseo status';
        throw new ApiError('UPSTREAM_ERROR', message);
    }
});
/**
 * GET /paseo/agents
 * Returns list of live agents.
 */
paseoRoutes.get('/paseo/agents', async (c) => {
    try {
        const status = await paseoService.getStatus();
        return c.json(ok({ agents: status.agents }));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to list Paseo agents';
        throw new ApiError('UPSTREAM_ERROR', message);
    }
});
/**
 * POST /paseo/prompt
 * Submits an action or prompt to a target agent.
 */
paseoRoutes.post('/paseo/prompt', async (c) => {
    const raw = await c.req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
        throw ApiError.validation('Request body must be a JSON object with "target" and "text" fields.');
    }
    const parsed = paseoAgentPromptSchema.safeParse(raw);
    if (!parsed.success) {
        throw ApiError.validation(parsed.error.errors.map((e) => e.message).join(', '));
    }
    try {
        const result = await paseoService.dispatchPrompt(parsed.data);
        return c.json(ok(result));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Prompt dispatch error';
        throw new ApiError('INTERNAL', message);
    }
});
//# sourceMappingURL=paseo.js.map