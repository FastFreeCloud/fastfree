---
type: Decision
title: Omnigent Meta-Harness Governance & Paseo Retirement
x-ai-rulez:
  kind: rule
  id: paseo-hub-governance
  metadata:
    priority: critical
---

# Omnigent Meta-Harness Governance (Paseo Retired)

Omnigent is the **canonical** agent orchestrator for FastFree; Paseo and Herdr are retired from canonical fleet orchestration and replaced by Omnigent on port `8090`.

1. **Role Boundaries & Multi-Harness Integration**:
   - Agent orchestration (workspaces, worktrees, subagents, reviews, fan-out) runs through Omnigent server/runner architecture and Hindsight memory banks.
   - Omnigent enforces OS-level sandboxing (bubblewrap/seccomp), L7 egress proxying for sensitive credentials, and centralized MCP connection pooling (`ServerMcpPool`).
   - Programmatic permission approvals (`apiPendingApprovals` / `apiDecideApproval`) operate via the FastFree Panel Hono backend (`/api/v1/governance/*`).

2. **Sovereignty & Isolated Runner**:
   - The Omnigent runner executes locally on host or sovereign VPS (`client1`).
   - Customer appliances (`client2..11`) are protected by network isolation; runners are strictly blocked from probing the `10.0.0.0/8` WireGuard subnet.

3. **Secrets Classification & DLP (secure-secrets applies)**:
   - Sensitive credentials (keystore passwords, Clan Vars, private keys) are brokered at the L7 proxy layer and never passed as raw environment variables to agent prompts.
   - The DLP inspection engine terminates any egress connection containing WireGuard or Clan Var secret patterns.

4. **Lint Gate**: `ai-rulez verifiers run --strict` MUST pass after any change to orchestration or governance configuration.
