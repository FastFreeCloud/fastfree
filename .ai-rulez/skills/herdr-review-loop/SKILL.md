---
name: herdr-review-loop
description: Run a writer/reviewer loop in Herdr — one agent produces work, a second critiques it in its own pane, and findings are relayed back until it is clean. Use when the user wants a second pair of eyes, a code review, an adversarial critique, or an independent check on work an agent produced.
---

# Writer / reviewer loop in Herdr

Two agents, two panes, one loop: a **writer** does the work and a **reviewer**
critiques it without seeing the writer's reasoning. You orchestrate.

Read [`herdr-conductor`](../herdr-conductor/SKILL.md) first if you have not.
The approval rules there govern every step here — this loop is deliberately
built to need very few approvals.

## Shape of the loop

1. **Writer works.** Start it with a self-contained brief.
2. **Reviewer critiques.** Start it with the diff/artefact and a rubric — not with
   the writer's chat history, so the review is independent.
3. **You relay.** Send the reviewer's findings to the writer as a new prompt.
4. **Repeat** until the reviewer is clean or you hit a stop condition.

## Doing it

**Start the writer** (one approval):

```
herdr_job_start(
  name="writer",
  worktree=true,
  prompt="Implement <task>. Run the tests. Summarise what changed and how you verified it."
)
```

**Wait for it to settle** (read-only):

```
herdr_agent_wait(target="writer", until=["idle", "done", "blocked"])
herdr_agent_read(target="writer", lines=200)
```

**Start the reviewer** in its own pane, pointed at the artefact on disk (one
approval). Give it a rubric and demand a verdict:

```
herdr_open_agent(
  name="reviewer",
  cwd="<same worktree>",
  prompt="Review the changes on branch <branch>. For each finding give file:line, severity
          (critical|warning|nit), and a concrete fix. End with VERDICT: APPROVE or CHANGES NEEDED.
          Do not edit files."
)
```

**Relay findings back** to the writer (one approval per round):

```
herdr_agent_prompt(target="writer", text="Reviewer found: <findings>. Address each; re-run tests.")
herdr_agent_wait(target="writer", until=["idle", "done", "blocked"])
```

**Then re-check** with the same reviewer target and compare its new verdict.

## Stop conditions

Stop and report when any holds:

- The reviewer returns `VERDICT: APPROVE`.
- The same finding survives two rounds (the loop is not converging — the human
  should decide).
- You hit a round cap (pick one up front; **3 is a good default**).
- An approval is denied or times out — stop entirely, do not retry.

## Keeping approvals low

- Writer and reviewer are each started **once**. Reuse them with
  `herdr_agent_prompt`; do not spawn a fresh agent per round.
- Never use `herdr_pane_run` to inspect output — `herdr_agent_read` is free.
- Prefer one worktree shared by both agents so the reviewer sees the writer's
  actual files, and no merge is needed mid-loop.
- Report the final verdict, the round count, and the worktree location. For a
  remote human, `herdr_notify(sound="done")` when the loop ends.
