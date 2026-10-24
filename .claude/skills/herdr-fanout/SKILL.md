---
description: Fan a task out across several coding agents in Herdr, each in its own git worktree, then collect and reconcile the results. Use when the user wants parallel exploration, several independent attempts, or N alternatives compared side by side.
name: herdr-fanout
# Content-Hash: blake3:e64d275f30f757f8279115a6261c0ca30b930106a39f1483ed3678a5899e7407
---

# Fan-out in Herdr

One task, N agents, N worktrees, one decision at the end. Use it for parallel
exploration and alternatives — not for work that has a single obvious answer.

Read [`herdr-conductor`](../herdr-conductor/SKILL.md) first if you have not. Its
approval rules apply, and they push the design of this skill: **one approval per
branch, started up front, all at once.**

## Doing it

1. **Decide the axes and the count.** Fan out along an axis that produces
   genuinely different results — different approaches, frameworks, algorithms —
   not N copies of the same attempt. 3–5 is a useful range; more is rarely worth
   the cost. State the axis to the user before spending.

2. **Start every branch in one pass** (one approval each, but batched in intent
   so the human approves once with full context). Each gets its own worktree and
   a distinct, self-contained brief naming its axis:

```
herdr_job_start(name="approach-a", worktree=true, branch="fanout/a",
  prompt="<task>. Take approach A: <description>. Implement it, test it, and report
          the files changed and the trade-offs you see.")
# repeat for approach-b, approach-c …
```

   Tell the user up front — *"fanning out 3 approaches, 3 approvals coming"* — so
   they are watching when the approval requests arrive and none times out.

3. **Wait on all of them** (read-only). Waiting is free:

```
herdr_agent_wait(target="approach-a", until=["idle", "done", "blocked"], timeout_ms=…)
herdr_agent_read(target="approach-a", lines=200)
# … for each branch
```

4. **Collect and compare.** Read each branch's report. Build a short comparison
   table: approach, files changed, tests, trade-offs, verdict. Do not silently
   pick one — the point of fan-out is that the human chooses.

5. **Promote one, discard the rest — with the user.** Offer to keep the winner
   and to `herdr_worktree_remove` the others (`confirm=true`, destructive). Only
   remove what the user agrees to.

## Rules

- **Only parallelise independent work.** If branches would touch the same files
  and conflict, fan-out is the wrong tool.
- **One worktree per branch** (`worktree=true`, distinct `branch`) so nothing
  collides and a clean merge stays possible.
- **Name every branch** (`name`, `branch`) so the board and the approval
  requests are readable.
- **Do not poll.** `herdr_agent_wait` on each; read after it settles.
- **Cleanup is destructive.** Confirm before removing worktrees, and report the
  paths that survived.

## Finishing

Report: the axis, each branch's outcome, the comparison, and your recommendation.
For a remote human, one `herdr_notify(title, body, sound="done")` when all
branches have settled.
