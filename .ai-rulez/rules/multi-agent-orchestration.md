---
type: Decision
title: Multi-Agent Orchestration with Paseo
x-ai-rulez:
  kind: rule
  id: multi-agent-orchestration
  metadata:
    priority: critical
---

# Multi-Agent Orchestration with Paseo

FastFree is designed to run in a collaborative multi-agent ecosystem:

1. **Paseo Daemon Requirement**:
   - The Paseo daemon (`~/.paseo`, local MCP server on `127.0.0.1:6767`) is the canonical orchestrator for AI agents (OpenCode, Claude Code, Codex) across workspaces and worktrees.
   - Any AI assistant acting on major subsystem completions, core packages, or release testing MUST use the Paseo MCP tools (`list_agents`, `create_workspace`, `create_agent`, `send_agent_prompt`, `get_agent_status`, `get_agent_activity`) or the CLI equivalents (`paseo ls/run/send/wait/logs`).

2. **Independent Reviewer Invariant**:
   - Critical milestones (such as finalizing the Desktop Installer, OS deployment profiles, or lowcode runtime invariants) must not rely solely on a single agent's self-assessment.
   - The primary agent acts as **Writer / Implementer**, and MUST launch an **OpenCode** agent with a Review-oriented profile (different provider family, no file edits) via the `paseo-review-loop` skill as an independent **Reviewer**, relaying findings until `VERDICT: APPROVE`.
3. **Skill Contracts**: Use the sanctioned skills — `paseo-conductor` (observe & drive agents), `paseo-fanout` (N worktree-isolated attempts), `paseo-review-loop` (writer/reviewer discipline). Keep destructive calls low: reads are free; creates/prompts are deliberate.
