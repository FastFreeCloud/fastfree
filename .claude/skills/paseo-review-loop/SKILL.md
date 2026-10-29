---
description: Run a writer/reviewer loop with Paseo — one agent produces work, a second critiques it independently, and findings are relayed back until it is clean. Use when the user wants a second pair of eyes, a code review, an adversarial critique, or an independent check on work an agent produced.
name: paseo-review-loop
# Content-Hash: blake3:6cc5d98c9d1882793be5bd69dfee2d98e15797c8d5fc0c32da767ff4f5e1518b
---

# Writer / reviewer loop in Paseo

Two agents, one loop: a **writer** does the work and a **reviewer** critiques
it without seeing the writer's reasoning. You orchestrate.

Read [`paseo-conductor`](../paseo-conductor/SKILL.md) first if you have not.
The permission rules there govern every step here — this loop is deliberately
built to need very few destructive calls.

## Shape of the loop

1. **Writer works.** Start it with a self-contained brief.
2. **Reviewer critiques.** Start it with the diff/artefact and a rubric — not
   with the writer's chat history, so the review is independent. Prefer a
   reviewer from a different provider family than the writer.
3. **You relay.** Send the reviewer's findings to the writer as a new prompt.
4. **Repeat** until the reviewer is clean or you hit a stop condition.

## Doing it

**Create a workspace with worktree isolation** (one destructive call):

```
create_workspace({ worktreeIsolation: true })
```

**Start the writer** in it:

```
create_agent({ workspaceId, provider: "<provider/model>",
  initialPrompt: "Implement <task>. Run the tests. Summarise what changed and how you verified it." })
```

**Wait for it to settle.** Paseo is async: a finish notification arrives by
default. If notifications are unavailable, poll `get_agent_status` sparingly;
the CLI `paseo wait <id>` blocks from a terminal.

**Read the result** (read-only): `get_agent_activity(writerId)`.

**Start the reviewer** in the same workspace, pointed at the artefact on disk.
Give it a rubric and demand a verdict:

```
create_agent({ workspaceId, provider: "<other-family/model>",
  initialPrompt: "Review the changes in this workspace. For each finding give file:line, severity
  (critical|warning|nit), and a concrete fix. End with VERDICT: APPROVE or CHANGES NEEDED.
  Do not edit files." })
```

**Relay findings back** to the writer:

```
send_agent_prompt({ agentId: writerId, prompt: "Reviewer found: <findings>. Address each; re-run tests." })
```

**Then re-check** with the same reviewer (`send_agent_prompt` to it) and
compare its new verdict.

## Stop conditions

Stop and report when any holds:

- The reviewer returns `VERDICT: APPROVE`.
- The same finding survives two rounds (the loop is not converging — the human
  should decide).
- You hit a round cap (pick one up front; **3 is a good default**).
- A permission request is denied or times out — stop entirely, do not retry.

## Keeping destructive calls low

- Writer and reviewer are each started **once**. Reuse them with
  `send_agent_prompt`; do not spawn a fresh agent per round.
- Never `send_terminal_keys` to inspect output — `get_agent_activity` and
  `capture_terminal` are free.
- One shared worktree-isolated workspace for both agents: the reviewer sees the
  writer's actual files, and no merge is needed mid-loop.
- A worker profile should have `create_agent`/`send_agent_prompt` disabled via
  `paseoTools` so the reviewer cannot spawn grandchildren.

## Finishing

Report the final verdict, the round count, and the workspace directory.
`archive_workspace` only if the user agrees (destructive).
