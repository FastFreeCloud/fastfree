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
export type AuditActionType = z.infer<typeof auditActionTypeEnum>;

export const auditResultEnum = z.enum(['SUCCESS', 'FAILED', 'DENIED', 'BLOCKED_BY_DLP']);
export type AuditResult = z.infer<typeof auditResultEnum>;

export const tokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative().default(0),
  totalTokens: z.number().int().nonnegative(),
  model: z.string(),
  costUsd: z.number().nonnegative(),
});
export type TokenUsage = z.infer<typeof tokenUsageSchema>;

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
export type AuditEntry = z.infer<typeof auditEntrySchema>;

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
export type AuditQuery = z.infer<typeof auditQuerySchema>;

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
export type AuditCostSummary = z.infer<typeof auditCostSummarySchema>;
