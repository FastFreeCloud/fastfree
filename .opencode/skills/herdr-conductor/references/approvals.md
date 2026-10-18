# The approval protocol

herdr-mcp annotates every tool: read-only tools carry `readOnlyHint`,
consequential ones carry `destructiveHint`. A well-behaved client asks the human
before running a destructive tool. That is the point — you are acting on a live
machine, and access is effectively a shell.

The friction is that the human is often **not at the terminal**. However they
reach the agent — a chat bridge, a mobile client, a bot, a web console — they
see only a bare approval request:

> Approval required: `herdr_pane_run`
> `{ "command": "cat /home/…/file", "pane_id": "WP:p1" }`
> No answer within N minutes counts as no. [Approve] [Deny]

Note what the approver sees: a tool name and raw JSON. No context, and a clock.
An unanswered prompt usually becomes a denial.

## Rules

1. **Spend no approval on reconnaissance.** The read-only tools —
   `herdr_status`, `herdr_workspaces`, `herdr_tabs`, `herdr_panes`,
   `herdr_agents`, `herdr_agent_get`, `herdr_agent_read`, `herdr_agent_explain`,
   `herdr_agent_wait`, `herdr_pane_read`, `herdr_pane_wait_output`,
   `herdr_worktree_list` — never prompt. Answer every factual question with them.

2. **Do not dress a read as a run.** The single most common waste is
   `herdr_pane_run` with `cat` / `tail` / `head` / `ls` / `grep` to look at
   output. Use `herdr_pane_read` / `herdr_agent_read`. If you are about to run a
   command only to *look* at something, stop — there is a read tool for it.

3. **Plan, then commit once.** Gather everything you need read-only, decide the
   whole plan, and then make as few destructive calls as possible. Three small
   destructive calls is three requests, three chances to time out. One
   `herdr_job_start` with a good `prompt` is one request.

4. **Make each request self-explanatory.** The approver cannot see your reasoning
   or the conversation. Put intent into the fields they do see:
   - `herdr_job_start` / `herdr_open_agent`: a `name` and a `prompt` that states
     the task.
   - `herdr_agent_prompt`: the full instruction in `text`.
   - `herdr_pane_run`: a `command` that is obviously what it says it is.
   - `label` on tabs/workspaces so the board reads clearly afterwards.

5. **A denial or a timeout is a full stop.** Do not retry the same call, and do
   not rephrase it to sneak through. Report what was blocked and why, and wait
   for the human. A timed-out request is a "no", not a "maybe".

6. **`confirm=true` is not approval.** It is a local slip-guard. Supplying it
   satisfies the tool, not the human. Do not treat it as a substitute for a request.

7. **Defer destructive work when you can.** If a task can be proven read-only
   right now and executed later when the human is present, say so and stage it.

## What good looks like

Bad — three requests, first one pointless:

```
herdr_pane_run(pane_id="WP:p1", command="cat out.log")   # read as a run
herdr_pane_split()
herdr_agent_start(name="runner", kind="claude", pane_id=…)  # empty pane in between
```

Good — one request, no waste:

```
herdr_status()                                   # read-only
herdr_agent_read(target="researcher")            # read-only
herdr_job_start(name="fix-parser", worktree=true,
                prompt="Fix the off-by-one in parse() in src/parse.py; "
                       "add a regression test; run pytest.")   # one request
```

## Configuring the client

A skill cannot change the client's permission prompts, but the human can. If
read-only tools still prompt, loosen them on the client side (allow the
`herdr_status`, `herdr_*_read`, `herdr_*_wait`, `herdr_*list` tools) and keep
approval on the destructive ones. The server side has a matching, coarser lever:

- `HERDR_MCP_READ_ONLY=1` exposes **only** the read/wait tools — nothing to
  approve, ever. Good for a monitoring-only agent.
- `HERDR_MCP_DISABLE_TOOLS=herdr_pane_run` hides a specific footgun entirely.

Start strict; loosen as trust is earned. See
[`../../../SECURITY.md`](../../../SECURITY.md).
