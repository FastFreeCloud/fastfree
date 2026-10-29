---
name: paseo-fanout
description: Fan a task out across several coding agents with Paseo, each in its own worktree-isolated workspace, then collect and reconcile the results. Use when the user wants parallel exploration, several independent attempts, or N alternatives compared side by side.
---

# Fan-out in Paseo

One task, N agents, N worktrees, one decision at the end. Use it for parallel
exploration and alternatives — not for work that has a single obvious answer.

Read [`paseo-conductor`](../paseo-conductor/SKILL.md) first if you have not.
Its permission rules apply, and they push the design of this skill: **one
`create_workspace` + `create_agent` pair per branch, issued deliberately and
up front.**

## Doing it

1. **Decide the axes and the count.** Fan out along an axis that produces
   genuinely different results — different approaches, frameworks, algorithms —
   not N copies of the same attempt. 3–5 is a useful range; more is rarely
   worth the cost. State the axis to the user before spending.

2. **Create each branch's workspace and agent.** Each gets worktree isolation
   and a distinct, self-contained brief naming its axis:

```
create_workspace({ worktreeIsolation: true })            // branch A
create_agent({ workspaceId, provider: "<p1/model>",
  initialPrompt: "<task>. Take approach A: <description>. Implement it, test it,
  and report the files changed and the trade-offs you see." })
// repeat for approach-b, approach-c …
create_workspace({ background: true })                   // optional: hide from the sidebar
```

   Tell the user up front — *"fanning out 3 approaches"* — so they know what
   is being spent and can watch the permission requests.

3. **Let them settle.** Results arrive as finish/error notifications. If
   polling is required, `get_agent_status` each branch (read-only), then
   `get_agent_activity` to read the report.

4. **Collect and compare.** Build a short comparison table: approach, files
   changed, tests, trade-offs, verdict. Do not silently pick one — the point
   of fan-out is that the human chooses.

5. **Promote one, discard the rest — with the user.** Offer to keep the
   winner's workspace and `archive_workspace` the others (destructive — only
   with explicit agreement). Report every path that survived.

## Rules

- **Only parallelise independent work.** If branches would touch the same
  files and conflict, fan-out is the wrong tool.
- **One worktree-isolated workspace per branch**, so nothing collides and a
  clean merge stays possible.
- **Name every workspace** (`rename_workspace`) so the board and the identity
  of each outcome stay readable.
- **Prefer profiles.** If the host has profiles with notes, use `list_profiles`
  and give each branch a differing provider family for genuine diversity.
- **Cleanup is destructive.** Confirm before archiving any workspace.
- Cross-machine scale-up is possible via remote daemons (`paseo run --host <…>`
  on another daemon); use only when the local host is saturated.

## Finishing

Report: the axis, each branch's outcome, the comparison, and your
recommendation.
