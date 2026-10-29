# The permission protocol

Paseo notifies the daemon's client about pending permission requests and can
deliver finish/error notifications to the orchestrating agent. Unlike pane
wrappers, destructive intent is expressed by which tool you call and what you
put in its fields — the approver often sees only a request and a clock.

The friction: the human is often **away from the host**. However they reach the
agent — the Paseo app, mobile/web over the E2E relay, a bot — they see only the
request and the fields you wrote. An unanswered request becomes a time-out.

## Rules

1. **Spend no approval on reconnaissance.** The read tools — `list_agents`,
   `get_agent_status`, `get_agent_activity`, `list_workspaces`,
   `list_profiles`, `list_providers`, `list_models`, `capture_terminal`,
   `list_terminals`, `list_pending_permissions`, `list_schedules`,
   `schedule_logs` — never prompt. Answer every factual question with them.
2. **Do not dress a read as a run.** If you are about to open a terminal or
   send keys just to *look* at something, stop — `get_agent_activity` or
   `capture_terminal` is free.
3. **Plan, then commit once.** Gather everything read-only first, then issue
   as few destructive calls as possible. One `create_agent` with a complete
   `initialPrompt` beats three partial `send_agent_prompt` nudges.
4. **Make each request self-explanatory.** The approver cannot see your
   reasoning. `initialPrompt` / `prompt` should state the task and its
   verification steps; `create_workspace` names should describe the change.
5. **A time-out is a full stop.** Do not retry the same call or rephrase it to
   sneak through. Report what was blocked and wait for the human.
6. **`respond_to_permission` is not your approval to give.** Approve or deny a
   pending request only when it matches what the human already authorized for
   this task; otherwise present it and wait.
7. **Defer destructive work when you can.** If a task can be proven read-only
   now and executed later with the human present, stage it.

## What good looks like

Bad — a destructive call just to look:

```
create_terminal(cwd=…); send_terminal_keys("cat out.log")
```

Good — reads free, one destructive commit:

```
list_agents()                        # read-only
get_agent_activity(id)               # read-only
create_workspace({ worktreeIsolation: true })
create_agent({ workspaceId, provider: "<…>/<model>",
  initialPrompt: "Fix <issue> in <file>; add a regression test; run tests." })
```

## Configuring the catalog

A skill cannot change the client's prompts, but the human can — in
`~/.paseo/config.json`:

- `daemon.mcp.enabled: true` + `daemon.mcp.injectIntoAgents: true` delivers the
  catalog to agents launched by Paseo (run `paseo reload` after editing).
- Per provider, `paseoTools.disabledTools` removes selected tools (worker
  profiles should disable `create_agent`, `send_agent_prompt`, `kill_agent` to
  prevent spawning); `paseoTools.enabled: false` removes the whole catalog.

Start strict; loosen as trust is earned.
