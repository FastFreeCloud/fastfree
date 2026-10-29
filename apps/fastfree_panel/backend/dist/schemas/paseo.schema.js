import { z } from 'zod';
export const paseoAgentStatusEnum = z.enum(['idle', 'blocked', 'done', 'working', 'unknown']);
export const livePaseoAgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    provider: z.string(),
    status: paseoAgentStatusEnum,
    cwd: z.string().optional(),
});
export const paseoStatusCountsSchema = z.object({
    all: z.number(),
    blocked: z.number(),
    idle: z.number(),
    done: z.number(),
    working: z.number(),
});
export const paseoStatusResponseSchema = z.object({
    running: z.boolean(),
    connected: z.boolean(),
    source: z.enum(['live', 'fallback']),
    baseUrl: z.string(),
    counts: paseoStatusCountsSchema,
    agents: z.array(livePaseoAgentSchema),
    message: z.string().optional(),
});
export const paseoAgentPromptSchema = z.object({
    target: z.string().min(1, 'Target agent id or name is required'),
    text: z.string().min(1, 'Prompt text cannot be empty'),
    wait: z.boolean().optional(),
    timeout_ms: z.number().max(25000).optional(),
});
export const paseoAgentCreateSchema = z.object({
    provider: z.string().min(1, 'Provider/model is required'),
    cwd: z.string().min(1, 'Working directory is required'),
    prompt: z.string().min(1, 'Prompt text cannot be empty'),
});
export const paseoAgentStopSchema = z.object({
    target: z.string().min(1, 'Target agent id or name is required'),
});
//# sourceMappingURL=paseo.schema.js.map