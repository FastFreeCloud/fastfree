import { z } from 'zod';
export const auditActionTypeEnum = z.enum([
    'TOOL_CALL',
    'COMMAND_EXEC',
    'FILE_WRITE',
    'MEMORY_RETAIN',
    'MEMORY_RECALL',
    'APPROVAL_DECISION',
    'SECURITY_VIOLATION',
]);
export const auditResultEnum = z.enum(['SUCCESS', 'FAILED', 'DENIED', 'BLOCKED_BY_DLP']);
export const tokenUsageSchema = z.object({
    promptTokens: z.number().int().nonnegative(),
    completionTokens: z.number().int().nonnegative(),
    reasoningTokens: z.number().int().nonnegative().default(0),
    totalTokens: z.number().int().nonnegative(),
    model: z.string(),
    costUsd: z.number().nonnegative(),
});
export const auditEntrySchema = z.object({
    id: z.string().uuid(),
    timestamp: z.string(),
    sessionId: z.string(),
    agentId: z.string(),
    actor: z.string(),
    action: auditActionTypeEnum,
    target: z.string(),
    details: z.record(z.unknown()),
    diff: z.string().optional(),
    result: auditResultEnum,
    durationMs: z.number().int().nonnegative(),
    usage: tokenUsageSchema.optional(),
    securityFlags: z.array(z.string()).default([]),
});
export const auditQuerySchema = z.object({
    sessionId: z.string().optional(),
    agentId: z.string().optional(),
    action: auditActionTypeEnum.optional(),
    result: auditResultEnum.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.coerce.number().int().positive().max(500).default(50),
    offset: z.coerce.number().int().nonnegative().default(0),
});
export const auditCostSummarySchema = z.object({
    totalPromptTokens: z.number(),
    totalCompletionTokens: z.number(),
    totalTokens: z.number(),
    totalCostUsd: z.number(),
    sessionCount: z.number(),
    modelBreakdown: z.record(z.object({
        tokens: z.number(),
        costUsd: z.number(),
    })),
});
//# sourceMappingURL=audit.schema.js.map