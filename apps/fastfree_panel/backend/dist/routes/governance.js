import { Hono } from 'hono';
import { AuditAndGovernanceService } from '../core/audit.service.js';
import { approvalDecisionInputSchema } from '../schemas/approval.schema.js';
import { auditQuerySchema } from '../schemas/audit.schema.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';
export const governanceRoutes = new Hono();
/**
 * GET /governance/approvals/pending
 * Lists all pending Human-in-the-Loop approval requests.
 */
governanceRoutes.get('/approvals/pending', (c) => {
    const pending = AuditAndGovernanceService.listPendingApprovals();
    return c.json(ok({ approvals: pending }));
});
/**
 * POST /governance/approvals/decision
 * Approves or rejects a pending human gate request.
 */
governanceRoutes.post('/approvals/decision', async (c) => {
    const raw = await c.req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
        throw ApiError.validation('Request body must be a JSON object.');
    }
    const parsed = approvalDecisionInputSchema.safeParse(raw);
    if (!parsed.success) {
        throw ApiError.validation(parsed.error.errors.map((e) => e.message).join(', '));
    }
    try {
        const updated = AuditAndGovernanceService.decideApproval(parsed.data);
        return c.json(ok(updated));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to register decision';
        throw new ApiError('NOT_FOUND', message);
    }
});
/**
 * GET /governance/audit
 * Queries the append-only audit trail logs.
 */
governanceRoutes.get('/audit', (c) => {
    const rawQuery = c.req.query();
    const parsed = auditQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
        throw ApiError.validation(parsed.error.errors.map((e) => e.message).join(', '));
    }
    const data = AuditAndGovernanceService.queryAudit(parsed.data);
    return c.json(ok(data));
});
/**
 * GET /governance/audit/cost-summary
 * Returns real-time token counts, USD spend, and per-model breakdowns.
 */
governanceRoutes.get('/audit/cost-summary', (c) => {
    const summary = AuditAndGovernanceService.getCostSummary();
    return c.json(ok(summary));
});
//# sourceMappingURL=governance.js.map