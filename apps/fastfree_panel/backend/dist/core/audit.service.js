import { randomUUID } from 'node:crypto';
export class AuditAndGovernanceService {
    static auditLogs = [];
    static pendingApprovals = new Map();
    // Pricing model ($ / 1M tokens)
    static MODEL_RATES = {
        'claude-3-7-sonnet': { prompt: 3.0, completion: 15.0 },
        'claude-3-5-sonnet': { prompt: 3.0, completion: 15.0 },
        'claude-3-5-haiku': { prompt: 0.8, completion: 4.0 },
        'deepseek-r1': { prompt: 0.55, completion: 2.19 },
        'gemini-1.5-pro': { prompt: 1.25, completion: 5.0 },
        'gemini-1.5-flash': { prompt: 0.075, completion: 0.3 },
    };
    static calculateCost(model, promptTokens, completionTokens) {
        const rate = this.MODEL_RATES[model] || { prompt: 3.0, completion: 15.0 };
        const promptCost = (promptTokens / 1_000_000) * rate.prompt;
        const completionCost = (completionTokens / 1_000_000) * rate.completion;
        return Number((promptCost + completionCost).toFixed(6));
    }
    static logAction(entry) {
        const record = {
            ...entry,
            id: randomUUID(),
            timestamp: new Date().toISOString(),
        };
        this.auditLogs.unshift(record);
        if (this.auditLogs.length > 5000) {
            this.auditLogs.pop();
        }
        return record;
    }
    static requestApproval(req) {
        const id = randomUUID();
        const approval = {
            ...req,
            id,
            status: 'PENDING',
            requestedAt: new Date().toISOString(),
        };
        this.pendingApprovals.set(id, approval);
        return approval;
    }
    static decideApproval(input) {
        const request = this.pendingApprovals.get(input.requestId);
        if (!request) {
            throw new Error(`Approval request ${input.requestId} not found.`);
        }
        request.status = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        request.respondedAt = new Date().toISOString();
        request.respondedBy = input.actor;
        request.rejectionReason = input.reason;
        this.logAction({
            sessionId: request.sessionId,
            agentId: request.agentId,
            actor: input.actor,
            action: 'APPROVAL_DECISION',
            target: request.title,
            details: { decision: request.status, reason: input.reason },
            result: input.decision === 'APPROVE' ? 'SUCCESS' : 'DENIED',
            durationMs: 0,
            securityFlags: [],
        });
        return request;
    }
    static getCostSummary() {
        let totalPrompt = 0;
        let totalCompletion = 0;
        let totalCost = 0;
        const modelBreakdown = {};
        const sessions = new Set();
        for (const log of this.auditLogs) {
            sessions.add(log.sessionId);
            if (log.usage) {
                totalPrompt += log.usage.promptTokens;
                totalCompletion += log.usage.completionTokens;
                totalCost += log.usage.costUsd;
                const m = log.usage.model;
                if (!modelBreakdown[m]) {
                    modelBreakdown[m] = { tokens: 0, costUsd: 0 };
                }
                modelBreakdown[m].tokens += log.usage.totalTokens;
                modelBreakdown[m].costUsd += log.usage.costUsd;
            }
        }
        return {
            totalPromptTokens: totalPrompt,
            totalCompletionTokens: totalCompletion,
            totalTokens: totalPrompt + totalCompletion,
            totalCostUsd: Number(totalCost.toFixed(4)),
            sessionCount: sessions.size,
            modelBreakdown,
        };
    }
    static queryAudit(query) {
        let filtered = this.auditLogs;
        if (query.sessionId)
            filtered = filtered.filter((l) => l.sessionId === query.sessionId);
        if (query.agentId)
            filtered = filtered.filter((l) => l.agentId === query.agentId);
        if (query.action)
            filtered = filtered.filter((l) => l.action === query.action);
        if (query.result)
            filtered = filtered.filter((l) => l.result === query.result);
        const total = filtered.length;
        const items = filtered.slice(query.offset, query.offset + query.limit);
        return { items, total };
    }
    static listPendingApprovals() {
        return Array.from(this.pendingApprovals.values()).filter((a) => a.status === 'PENDING');
    }
}
//# sourceMappingURL=audit.service.js.map