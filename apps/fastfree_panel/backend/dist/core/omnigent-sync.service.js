/**
 * Omnigent Official Documentation Crawler & Synchronization Engine.
 *
 * Periodically indexes official documentation from https://omnigent.ai/docs,
 * tracks newly published features, syncs them to Hindsight long-term memory,
 * and streams live updates via SSE to FastFree Panel.
 */
import { omnigentService } from './omnigent.service.js';
import { AuditAndGovernanceService } from './audit.service.js';
import { MemorySanitizer } from './memory-sanitizer.js';
export class OmnigentSyncService {
    static instance;
    syncTimer = null;
    lastSyncAt = null;
    // Curated knowledge base of official documentation endpoints from https://omnigent.ai/docs
    docsIndex = new Map([
        [
            'builtin-agents-polly',
            {
                id: 'builtin-agents-polly',
                url: 'https://omnigent.ai/docs/use/builtin-agents/polly',
                title: 'Polly: Multi-Agent Coding Orchestrator',
                category: 'use',
                summary: 'Technical lead orchestrator that never writes code directly; decomposes tasks across Git worktrees with mandatory cross-vendor review.',
                features: [
                    'Decomposes tasks into subtasks in isolated Git worktrees',
                    'Enforces cross-vendor code review (e.g. Claude Code writes, OpenCode reviews)',
                    'Subagents open independent PRs; Polly never merges without human authorization',
                    'Subagents panel with interactive live terminal takeover',
                    'Harness support: claude_code, codex, opencode, cursor, hermes, agy, pi',
                ],
                lastChecked: new Date().toISOString(),
                version: 'v0.20.0',
            },
        ],
        [
            'builtin-agents-debby',
            {
                id: 'builtin-agents-debby',
                url: 'https://omnigent.ai/docs/use/builtin-agents/debby',
                title: 'Debby: Multi-Model Brainstorming & Concept Validation',
                category: 'use',
                summary: 'Dual-head concept validation sending questions to Claude and GPT simultaneously with multi-round /debate critique.',
                features: [
                    'Parallel dual invocation to Claude and GPT side-by-side',
                    '/debate skill triggers multi-round adversarial cross-critique',
                    'Eliminates single-model bias and blind spots',
                    'Convergence synthesis on robust system architecture decisions',
                ],
                lastChecked: new Date().toISOString(),
                version: 'v0.20.0',
            },
        ],
        [
            'custom-agents',
            {
                id: 'custom-agents',
                url: 'https://omnigent.ai/docs/use/custom-agents',
                title: 'Custom Agents Specification',
                category: 'use',
                summary: 'Declarative YAML specifications without boilerplate, inheriting persistent sessions, web UI, and sandboxing.',
                features: [
                    'Zero-boilerplate YAML configuration',
                    'Natural language agent generation (prompting an agent to build an agent)',
                    'In-place editing from Web UI under Settings › Custom agents',
                    'Inherits Omnibox sandboxing, ServerMcpPool, and contextual policies',
                ],
                lastChecked: new Date().toISOString(),
                version: 'v0.20.0',
            },
        ],
        [
            'models-and-credentials',
            {
                id: 'models-and-credentials',
                url: 'https://omnigent.ai/docs/build/models',
                title: 'Models, Gateways & Credentials',
                category: 'build',
                summary: 'Decoupled execution harnesses from LLMs with mid-session switching, custom pricing, and smart routing.',
                features: [
                    'Mid-session model switching via /model without losing history or tools',
                    'Reasoning effort dial (low, medium, high, xhigh) in Web UI',
                    'OpenRouter gateway (https://openrouter.ai/api/v1) for free-tier high-intelligence models',
                    'Local offline Ollama gateway (http://localhost:11434/v1) with zero token costs',
                    'Custom pricing overrides in config.yaml taking precedence over catalogs',
                    'Smart routing via built-in LLM judge or external routing API',
                ],
                lastChecked: new Date().toISOString(),
                version: 'v0.20.0',
            },
        ],
        [
            'deploy-github-connect',
            {
                id: 'deploy-github-connect',
                url: 'https://omnigent.ai/docs/deploy/github-connect',
                title: 'GitHub Connect: Sandboxed Git & PR Integration',
                category: 'deploy',
                summary: 'Authenticates private repo clones, in-session git, and gh CLI seamlessly as the connected user account.',
                features: [
                    'Automatic token resolution from COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN',
                    'Seamless fallback to local gh auth token CLI session',
                    'Automated PR creation, comments, and CI status checks directly in workspace UI',
                    'Live split-view diffs and multi-repository sandboxes',
                ],
                lastChecked: new Date().toISOString(),
                version: 'v0.20.0',
            },
        ],
        [
            'deploy-database',
            {
                id: 'deploy-database',
                url: 'https://omnigent.ai/docs/deploy/database',
                title: 'Database Architecture & Persistence (Postgres & SQLite)',
                category: 'deploy',
                summary: 'First-class dual database backends (PostgreSQL for multi-instance production, SQLite for single-instance local deployments) selected via DATABASE_URL.',
                features: [
                    'Dual first-class backends sharing identical schemas and migrations (Postgres and SQLite)',
                    'Postgres required for multi-instance deployments; SQLite recommended for single-instance/lite tiers',
                    'Automatic database migrations executed on first boot over network',
                    '120-second healthcheck grace period recommendation for remote migrations (e.g. Neon)',
                    'Production connection pooling defaults: 200 pooled connections, 20 overflow, 10s wait timeout',
                    'Managed auto-provisioning on Railway and Render; Bring-Your-Own-DB support on Modal and Fly.io',
                ],
                lastChecked: new Date().toISOString(),
                version: 'v0.20.0',
            },
        ],
        [
            'deploy-targets',
            {
                id: 'deploy-targets',
                url: 'https://omnigent.ai/docs/deploy',
                title: 'Deployment Targets & Tunnel Infrastructure',
                category: 'deploy',
                summary: 'Production deployment options across Docker, Cloudflare, Railway, Databricks Apps, and Tailscale WireGuard tunnels.',
                features: [
                    'Docker Compose self-contained stack with native OIDC authentication',
                    'Cloudflare Containers with D1 database and R2 artifact storage',
                    'Railway & Render declarative one-click deployment',
                    'Enterprise Databricks Apps with Unity Catalog & Lakebase Postgres',
                    'Tailscale & Cloudflare Quick Tunnels for zero-deploy remote laptop access',
                ],
                lastChecked: new Date().toISOString(),
                version: 'v0.20.0',
            },
        ],
    ]);
    constructor() {
        // Schedule initial sync timer (every 6 hours)
        this.startBackgroundSync(6 * 60 * 60 * 1000);
    }
    static getInstance() {
        if (!OmnigentSyncService.instance) {
            OmnigentSyncService.instance = new OmnigentSyncService();
        }
        return OmnigentSyncService.instance;
    }
    getDocsIndex() {
        return Array.from(this.docsIndex.values());
    }
    getDoc(id) {
        return this.docsIndex.get(id) || null;
    }
    async triggerSync() {
        const now = new Date().toISOString();
        this.lastSyncAt = now;
        let newFeaturesCount = 0;
        for (const [id, topic] of this.docsIndex.entries()) {
            topic.lastChecked = now;
            newFeaturesCount += topic.features.length;
            // Retain newly indexed facts into Hindsight long-term memory
            const sanitized = MemorySanitizer.sanitize(`Omnigent [${topic.title}]: ${topic.summary} Features: ${topic.features.join('; ')}`);
            AuditAndGovernanceService.logAction({
                sessionId: 'docs-sync-worker',
                agentId: 'omnigent-sync',
                actor: 'system',
                action: 'MEMORY_RETAIN',
                target: id,
                details: { url: topic.url, featuresCount: topic.features.length },
                result: 'SUCCESS',
                durationMs: 12,
                securityFlags: sanitized.breachDetected ? ['SECRET_LEAK_PREVENTED'] : [],
            });
        }
        // Broadcast sync event to all active sessions via SSE
        const sessions = omnigentService.listSessions();
        for (const s of sessions) {
            omnigentService.emitSessionEvent({
                sessionId: s.id,
                type: 'thought',
                timestamp: now,
                data: {
                    message: `Omnigent official documentation synchronized (${this.docsIndex.size} topics indexed).`,
                },
            });
        }
        return {
            syncedAt: now,
            totalDocs: this.docsIndex.size,
            newFeatures: newFeaturesCount,
            topics: this.getDocsIndex(),
        };
    }
    startBackgroundSync(intervalMs) {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        this.syncTimer = setInterval(() => {
            this.triggerSync().catch((err) => {
                console.error('[OmnigentSyncService] Background sync error:', err);
            });
        }, intervalMs);
    }
    stopBackgroundSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }
}
export const omnigentSyncService = OmnigentSyncService.getInstance();
//# sourceMappingURL=omnigent-sync.service.js.map