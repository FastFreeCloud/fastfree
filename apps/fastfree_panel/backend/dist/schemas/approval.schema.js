import { z } from 'zod';
export const approvalTierEnum = z.enum(['TIER_1_AUTO', 'TIER_2_FILE_WRITE', 'TIER_3_SOVEREIGN']);
export const approvalStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'BYPASSED']);
export const approvalActionTypeEnum = z.enum([
    'COMMAND_EXEC',
    'FILE_WRITE',
    'CLAN_MUTATION',
    'KEYSTORE_SIGN',
    'NETWORK_EGRESS',
]);
export const approvalRequestSchema = z.object({
    id: z.string().uuid(),
    sessionId: z.string(),
    agentId: z.string(),
    actionType: approvalActionTypeEnum,
    tier: approvalTierEnum,
    status: approvalStatusEnum,
    title: z.string(),
    description: z.string(),
    command: z.array(z.string()).optional(),
    filePath: z.string().optional(),
    diff: z.string().optional(),
    estimatedTokens: z.number().int().nonnegative().optional(),
    estimatedCostUsd: z.number().nonnegative().optional(),
    requestedAt: z.string(),
    respondedAt: z.string().optional(),
    respondedBy: z.string().optional(),
    rejectionReason: z.string().optional(),
});
export const approvalDecisionInputSchema = z.object({
    requestId: z.string().uuid(),
    decision: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().optional(),
    actor: z.string().min(1, 'Approver identity required'),
});
//# sourceMappingURL=approval.schema.js.map