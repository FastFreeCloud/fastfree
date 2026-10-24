# Agent skills

Optional Agent Skills (`SKILL.md`) that pair with herdr-mcp. The MCP
server gives an agent the *ability* to drive Herdr; a skill
gives it the *judgement* — which tool to reach for, when to stay read-only, and
how to behave when a human has to approve a call.

They are ordinary `SKILL.md` folders, so they work in any client that loads
Agent Skills (Claude Code, opencode, Cursor, and others). Nothing here is
required to use the server; install a skill when you want the agent to drive
Herdr well without a human steering every step.

| Skill | What it teaches |
|---|---|
| [`herdr-conductor`](herdr-conductor/SKILL.md) | The base skill: recon-first, correct tool choice, no empty panes, and the approval protocol for remotely-driven sessions. |
| [`herdr-review-loop`](herdr-review-loop/SKILL.md) | A writer/reviewer loop: one agent works, a second critiques it in its own pane. |
| [`herdr-fanout`](herdr-fanout/SKILL.md) | Fan a task across several agents, each in its own worktree, then reconcile. |

`herdr-review-loop` and `herdr-fanout` assume `herdr-conductor`. Read it first.
If you install only one, install that one.

## Why a skill at all

herdr-mcp already sends MCP `instructions`, and its tools carry
`readOnlyHint` / `destructiveHint` annotations. That covers *safety*. A skill
covers *skill*: the difference between an agent that splits a pane and leaves it
empty, and one that starts an actual agent in a worktree with a brief.

The failure modes a skill prevents, seen in practice:

- **Empty panes.** `herdr_pane_split` / `herdr_tab_create` create layout, not
  agents. Left alone they are dead weight. The right call is `herdr_open_agent`
  or `herdr_job_start`, which create the tab *and* start the agent *and* send the
  brief.
- **Reads that trigger approvals.** Running `herdr_pane_run` with `cat` to look
  at output is arbitrary command execution and raises an approval request for what
  should have been a free `herdr_pane_read`.
- **Approval fatigue.** Every destructive call can raise an approval. When the
  human is reached through a remote channel — a chat bridge, a mobile client, a
  bot — an unanswered prompt times out and counts as *no*. A flurry of small
  destructive calls fails quietly.

## Install

Copy (or symlink) the skill folder into your client's skills directory, e.g.:

```bash
# Claude Code — personal skills (folder name must equal the skill name)
cp -r skills/herdr-conductor ~/.claude/skills/herdr-conductor

# opencode
cp -r skills/herdr-conductor ~/.config/opencode/skill/herdr-conductor
```

Then connect herdr-mcp as usual — see [../docs/SETUP.md](../docs/SETUP.md) — and
ask the agent to show your agents. It should start with `herdr_status` and stay
read-only until you ask for a change.

## Editing

These are prose, not code. Keep each `description` concrete about *when* to use
the skill: that field is what makes the agent load it. Keep the body short and
point at [`../docs/TOOLS.md`](../docs/TOOLS.md) for parameter-level detail rather
than duplicating it.
