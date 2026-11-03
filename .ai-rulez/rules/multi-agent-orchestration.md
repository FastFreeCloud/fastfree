---
type: Decision
title: Multi-Agent Orchestration with Omnigent & Hindsight
x-ai-rulez:
  kind: rule
  id: multi-agent-orchestration
  metadata:
    priority: critical
---

# Multi-Agent Orchestration with Omnigent & Hindsight

FastFree is powered by an autonomous, multi-agent meta-harness ecosystem:

1. **Omnigent Meta-Harness & Subagents Architecture**:
   - Omnigent (`~/.omnigent`, local server on `127.0.0.1:8090`) is the canonical orchestrator for AI agents and subagents.
   - Omnigent coordinates specialized subagents defined via declarative YAML specifications in `.omnigent/agents/` (e.g., `fastfree_supervisor.yaml` coordinating `subagent_researcher`, `subagent_implementer`, and `subagent_reviewer`).
   - Worktree isolation: Each execution session runs in a dedicated ephemeral Git worktree (`.worktrees/omnigent-*`), isolating code mutations from the primary working directory.
   - Paseo and Herdr are retired from canonical fleet orchestration in favor of Omnigent.

2. **Hindsight Persistent Long-Term Memory**:
   - Long-term memory is managed via the Hindsight memory engine (`fastfree-core-memory` bank).
   - Agents maintain cognitive continuity across sessions via `hindsight_recall`, `hindsight_retain`, and `hindsight_reflect`.
   - **Secret Sanitizer Invariant**: Every memory payload passes through `MemorySanitizer` before indexing; WireGuard keys, Clan Vars, keystore passwords, and internal Hyper-V IPs are strictly forbidden from being ingested into memory banks.

3. **Independent Reviewer Invariant (Dual-Agent Review Loop)**:
   - The primary implementer acts as **Writer / Implementer** (Claude / Antigravity).
   - An independent **Reviewer** agent (OpenCode / DeepSeek R1 profile) must audit diffs, run `vue-tsc`, verify AI-Rulez policies, and issue an objective sign-off (`VERDICT: APPROVE`).
   - No release, installer finalization, or core monorepo mutation is accepted without independent verification.

4. **Human-In-The-Loop (HITL) Approvals & Cost Caps**:
   - Destructive operations (`git push`, `rm -rf`, `clan vars set`) require explicit operator authorization via the Approvals Gate.
   - Cost ceilings and token budgets are enforced in real-time.
