---
type: Decision
title: Multi-Agent Orchestration with Herdr & OpenCode
x-ai-rulez:
  kind: rule
  id: multi-agent-orchestration
  metadata:
    priority: critical
---

# Multi-Agent Orchestration with Herdr & OpenCode

FastFree is designed to run in a collaborative multi-agent ecosystem:

1. **Herdr Workspace Requirement**:
   - The Herdr terminal workspace manager (`herdr server`) connects AI agents across parallel panes and worktrees.
   - Any AI assistant acting on major subsystem completions, core packages, or release testing MUST utilize Herdr MCP tools (`herdr_status`, `herdr_open_agent`, `herdr_agent_prompt`, `herdr_agent_read`, `herdr_agent_wait`).

2. **OpenCode Independent Reviewer Invariant**:
   - Critical milestones (such as finalizing the Desktop Installer, OS deployment profiles, or lowcode runtime invariants) must not rely solely on a single agent's self-assessment.
   - The primary agent (e.g. Antigravity) acts as **Writer / Implementer**, and MUST launch **OpenCode** via Herdr (`herdr-review-loop`) as an independent **Reviewer**.
   - The reviewer evaluates code on disk without confirmation bias and returns `VERDICT: APPROVE` or `CHANGES NEEDED`.
