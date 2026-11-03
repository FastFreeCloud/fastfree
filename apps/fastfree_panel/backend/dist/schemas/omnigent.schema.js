import { z } from 'zod';
export const omnigentSessionStatusEnum = z.enum([
    'PENDING',
    'RUNNING',
    'PAUSED_FOR_APPROVAL',
    'COMPLETED',
    'FAILED',
]);
export const omnigentSubagentNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    harness: z.string(),
    model: z.string(),
    status: z.enum(['IDLE', 'RUNNING', 'COMPLETED', 'FAILED']),
    currentTask: z.string().optional(),
    tokensUsed: z.number().int().nonnegative().default(0),
    costUsd: z.number().nonnegative().default(0),
});
export const omnigentSessionSchema = z.object({
    id: z.string(),
    name: z.string(),
    supervisor: z.string(),
    status: omnigentSessionStatusEnum,
    prompt: z.string(),
    worktreePath: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    totalTokens: z.number().int().nonnegative().default(0),
    totalCostUsd: z.number().nonnegative().default(0),
    budgetCapUsd: z.number().nonnegative().default(10.0),
    subagents: z.array(omnigentSubagentNodeSchema).default([]),
});
export const omnigentDispatchInputSchema = z.object({
    agentConfig: z.string().default('fastfree_supervisor'),
    prompt: z.string().min(1, 'Prompt is required'),
    budgetCapUsd: z.number().positive().default(10.0),
    isolatedWorktree: z.boolean().default(true),
});
export const hindsightQueryInputSchema = z.object({
    bankId: z.string().default('fastfree-core-memory'),
    query: z.string().min(1, 'Query is required'),
    limit: z.number().int().positive().max(50).default(5),
});
//# sourceMappingURL=omnigent.schema.js.map