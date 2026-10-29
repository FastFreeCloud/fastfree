# Agent Skills for FastFree

Optional Agent Skills (`SKILL.md`) that pair with the Paseo daemon's MCP
catalog. The daemon gives an agent the *ability* to drive agents, workspaces,
and schedules; a skill gives it the *judgment* to do so reliably and safely,
even when running unattended.

| Skill | What it teaches an agent |
|---|---|
| [`paseo-conductor`](paseo-conductor/SKILL.md) | The base skill: recon-first, correct tool choice, worktree-isolated workspaces, and the permission protocol for remotely-driven sessions. |
| [`paseo-review-loop`](paseo-review-loop/SKILL.md) | A writer/reviewer loop: one agent works, a second critiques it independently until `VERDICT: APPROVE`. |
| [`paseo-fanout`](paseo-fanout/SKILL.md) | Fan a task across several agents, each in its own worktree-isolated workspace, then reconcile. |

`paseo-review-loop` and `paseo-fanout` assume `paseo-conductor`. Read it first.

## How the tools arrive

Agents launched by Paseo receive the MCP catalog automatically
(`daemon.mcp.injectIntoAgents: true` in `~/.paseo/config.json` — run
`paseo reload` after changing it). Paseo sends MCP `instructions` with the
catalog, and its destructive tools are labelled as such — see
[paseo-conductor/references/approvals.md](paseo-conductor/references/approvals.md).

## Behaviors to avoid

- **Spawns without isolation.** `create_agent` with no `workspaceId` creates a
  subagent where the caller decides; placed in the wrong workspace it
  tramples files. Use `create_workspace` (worktree isolation) when the change
  needs review or rollback.
- **Reads that trigger approvals.** If you are about to `create_terminal` +
  `send_terminal_keys` just to *look* at output, `get_agent_activity` or
  `capture_terminal` is free.

## Installing for other clients

```
cp -r skills/paseo-conductor ~/.claude/skills/paseo-conductor
cp -r skills/paseo-conductor ~/.config/opencode/skill/paseo-conductor
```

Or set the host's orchestration skills card: **Paseo Settings → your host →
Agents → Orchestration skills**, and run `npx skills add getpaseo/paseo` for
the official Paseo reference/handoff/committee/advisor skills.

Then ask the agent to show your agents. It should start with `list_agents`
and stay read-only until it has a plan.
