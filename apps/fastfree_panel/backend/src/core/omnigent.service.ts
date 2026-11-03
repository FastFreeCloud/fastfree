import { randomUUID } from 'node:crypto';
import type {
  OmnigentSession,
  OmnigentDispatchInput,
  HindsightQueryInput,
} from '../schemas/omnigent.schema.js';
import { MemorySanitizer } from './memory-sanitizer.js';
import { AuditAndGovernanceService } from './audit.service.js';

export interface OmnigentEvent {
  type: 'thought' | 'tool_call' | 'approval_required' | 'telemetry' | 'done';
  sessionId: string;
  subagentId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export class OmnigentService {
  private static instance: OmnigentService;
  private sessions: Map<string, OmnigentSession> = new Map();
  private eventListeners: Map<string, Set<(event: OmnigentEvent) => void>> = new Map();

  private constructor() {
    this.seedDefaultSession();
  }

  public static getInstance(): OmnigentService {
    if (!OmnigentService.instance) {
      OmnigentService.instance = new OmnigentService();
    }
    return OmnigentService.instance;
  }

  private seedDefaultSession() {
    const id = 'sess-demo-01';
    this.sessions.set(id, {
      id,
      name: 'ERP Monorepo Quality Gate & Hindsight Retention',
      supervisor: 'Supervisor (Claude 3.7 Sonnet)',
      status: 'COMPLETED',
      prompt: 'Verify 0 TS errors across packages/* and retain lowcode architectural invariants.',
      worktreePath: '.worktrees/omnigent-run-demo',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      updatedAt: new Date().toISOString(),
      totalTokens: 142500,
      totalCostUsd: 0.428,
      budgetCapUsd: 10.0,
      subagents: [
        {
          id: 'sub-01',
          name: 'Research Subagent',
          role: 'Codebase Researcher',
          harness: 'claude-sdk',
          model: 'claude-3-5-haiku',
          status: 'COMPLETED',
          currentTask: 'Indexed 8 domain packages and composable exports',
          tokensUsed: 32000,
          costUsd: 0.052,
        },
        {
          id: 'sub-02',
          name: 'Implementation Subagent',
          role: 'TypeScript Architect',
          harness: 'claude-sdk',
          model: 'claude-3-7-sonnet',
          status: 'COMPLETED',
          currentTask: 'Applied LowCode RTL inset-inline fixes',
          tokensUsed: 84000,
          costUsd: 0.312,
        },
        {
          id: 'sub-03',
          name: 'OpenCode Reviewer',
          role: 'Adversarial Auditor',
          harness: 'opencode',
          model: 'deepseek-r1',
          status: 'COMPLETED',
          currentTask: 'Audited diffs, verified 0 TS errors, issued VERDICT: APPROVE',
          tokensUsed: 26500,
          costUsd: 0.064,
        },
      ],
    });
  }

  public getStatus() {
    const sessionsList = Array.from(this.sessions.values());
    const totalCost = sessionsList.reduce((acc, s) => acc + s.totalCostUsd, 0);
    const totalTokens = sessionsList.reduce((acc, s) => acc + s.totalTokens, 0);

    return {
      serverUrl: 'http://127.0.0.1:8090',
      connected: true,
      activeRunners: 1,
      totalSessions: sessionsList.length,
      activeSessions: sessionsList.filter((s) => s.status === 'RUNNING').length,
      totalCostUsd: Number(totalCost.toFixed(4)),
      totalTokens,
      hindsightBank: 'fastfree-core-memory',
    };
  }

  public listSessions(): OmnigentSession[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  public getSession(id: string): OmnigentSession | null {
    return this.sessions.get(id) || null;
  }

  public dispatchSession(input: OmnigentDispatchInput): OmnigentSession {
    const id = `sess-${randomUUID().slice(0, 8)}`;
    const session: OmnigentSession = {
      id,
      name: input.prompt.slice(0, 60),
      supervisor: 'Supervisor (Claude 3.7 Sonnet)',
      status: 'RUNNING',
      prompt: input.prompt,
      worktreePath: input.isolatedWorktree ? `.worktrees/omnigent-${id}` : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTokens: 0,
      totalCostUsd: 0,
      budgetCapUsd: input.budgetCapUsd,
      subagents: [
        {
          id: `sub-${randomUUID().slice(0, 4)}`,
          name: 'Research Subagent',
          role: 'Codebase Researcher',
          harness: 'claude-sdk',
          model: 'claude-3-5-haiku',
          status: 'RUNNING',
          currentTask: 'Exploring task boundaries and prior memory',
          tokensUsed: 0,
          costUsd: 0,
        },
        {
          id: `sub-${randomUUID().slice(0, 4)}`,
          name: 'Implementer Subagent',
          role: 'TypeScript Developer',
          harness: 'claude-sdk',
          model: 'claude-3-7-sonnet',
          status: 'IDLE',
          tokensUsed: 0,
          costUsd: 0,
        },
        {
          id: `sub-${randomUUID().slice(0, 4)}`,
          name: 'OpenCode Reviewer',
          role: 'Adversarial Auditor',
          harness: 'opencode',
          model: 'deepseek-r1',
          status: 'IDLE',
          tokensUsed: 0,
          costUsd: 0,
        },
      ],
    };

    this.sessions.set(id, session);

    AuditAndGovernanceService.logAction({
      sessionId: id,
      agentId: 'fastfree-supervisor',
      actor: 'user',
      action: 'COMMAND_EXEC',
      target: 'omnigent_dispatch',
      details: { config: input.agentConfig, prompt: input.prompt },
      result: 'SUCCESS',
      durationMs: 15,
      securityFlags: [],
    });

    return session;
  }

  public subscribeSession(sessionId: string, listener: (event: OmnigentEvent) => void): () => void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, new Set());
    }
    const set = this.eventListeners.get(sessionId)!;
    set.add(listener);

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.eventListeners.delete(sessionId);
      }
    };
  }

  public emitSessionEvent(event: OmnigentEvent) {
    const set = this.eventListeners.get(event.sessionId);
    if (set) {
      for (const listener of set) {
        listener(event);
      }
    }
  }

  public async queryHindsight(input: HindsightQueryInput) {
    // 1. Sanitize user search query to prevent leaking canary secrets
    const sanitized = MemorySanitizer.sanitize(input.query);

    AuditAndGovernanceService.logAction({
      sessionId: 'hindsight-query',
      agentId: 'memory-engine',
      actor: 'user',
      action: 'MEMORY_RECALL',
      target: input.bankId,
      details: {
        query: sanitized.cleanText,
        redactedBreaches: sanitized.redactedCount,
      },
      result: 'SUCCESS',
      durationMs: 42,
      securityFlags: sanitized.breachDetected ? ['SECRET_LEAK_PREVENTED'] : [],
    });

    return {
      bankId: input.bankId,
      query: sanitized.cleanText,
      redacted: sanitized.breachDetected,
      results: [
        {
          id: 'mem-001',
          stratum: 'World Facts',
          content: 'NixOS Clan 26.05 topology: client1 VPS (Controller), client2..client11 Hyper-V appliances.',
          confidence: 0.99,
          timestamp: '2026-10-25T12:00:00Z',
        },
        {
          id: 'mem-002',
          stratum: 'Agent Experiences',
          content: 'Purged 59 emoji instances from apps/fastfree_installer with zero build warnings.',
          confidence: 0.96,
          timestamp: '2026-10-28T14:30:00Z',
        },
        {
          id: 'mem-003',
          stratum: 'Entity Summaries',
          content: 'LowCode engine contains 38 components, 27 composables; useFormatNumber & useStatusHelpers mandatory.',
          confidence: 0.98,
          timestamp: '2026-10-29T09:15:00Z',
        },
        {
          id: 'mem-004',
          stratum: 'Evolving Beliefs',
          content: 'Dual-Agent review discipline (Writer: Antigravity / Reviewer: OpenCode) prevents regression slips.',
          confidence: 0.95,
          timestamp: '2026-11-01T22:00:00Z',
        },
      ],
    };
  }
}

export const omnigentService = OmnigentService.getInstance();
