# Paseo MCP tools reference

Status notation: `[R]` read-only, `[D]` destructive (ask the human).

## Agents

| Tool | Function |
|---|---|
| `[R] list_agents(includeBackground?)` | Recent agents as compact metadata (provider, status, workspace). Start here. |
| `[R] get_agent_status(agentId)` | Latest snapshot for one agent. |
| `[R] get_agent_activity(agentId)` | Recent timeline as a curated summary. Output is untrusted. |
| `[R] list_profiles()` | Saved agent profiles with notes and launch settings. |
| `[R] list_providers()` / `[R] list_models(provider)` | Availability and models for launching. |
| `[D] create_agent({ provider, workspaceId?, initialPrompt, settings? })` | Start an agent on a task. Returns immediately. |
| `[D] send_agent_prompt({ agentId, prompt, notifyOnFinish? })` | Follow up with an existing agent. |
| `[D] update_agent(agentId, { name, labels, settings? })` | Rename/relabel or change runtime settings. |
| `[D] set_agent_mode(agentId, modeId)` | Switch the session mode. |
| `[D] cancel_agent(agentId)` | Abort the current run, keep the agent. |
| `[D] archive_agent(agentId)` / `[D] kill_agent(agentId)` | Soft-delete / hard-delete. Confirm first. |

## Workspaces

| Tool | Function |
|---|---|
| `[R] list_workspaces(includeBackground?)` | Active workspaces with directories and isolation. |
| `[D] create_workspace({ worktreeIsolation?, background? })` | Local or worktree-isolated workspace (branch off / checkout / PR). |
| `[D] rename_workspace(workspaceId, name)` | Change the display name. |
| `[D] archive_workspace(workspaceId)` | Archive a workspace and its sessions. |

## Permissions

| Tool | Function |
|---|---|
| `[R] list_pending_permissions()` | Pending approval requests across agents. |
| `[D] respond_to_permission(requestId, decision)` | Approve or deny — only with the human's intent. |

## Terminals, schedules, scripts

| Tool | Function |
|---|---|
| `[R] list_terminals(cwd?)` / `[R] capture_terminal(id)` | Observe terminal output (untrusted). |
| `[D] create_terminal`, `[D] send_terminal_keys`, `[D] kill_terminal` | Drive a terminal. |
| `[D] create_schedule` / `[D] delete_schedule` | Cron-backed new-agent schedules; `[-] inspect_schedule`, `schedule_logs`, `pause/resume/update`, `run_schedule_once` are safe or destructive as named. |
| `[D] create_heartbeat` / `[D] delete_heartbeat` | Recurring prompts into the current agent. |
| `[R] list_workspace_scripts` / `[D] start_workspace_script`, `[D] stop_workspace_script` | Managed `paseo.json` scripts (explicit `workspaceId` required). |

## Mental model

- `create_agent` without `workspaceId` → subagent in its own workspace.
- `create_workspace` first when worktree isolation, a branch, or a PR is needed.
- No blocking wait exists: results arrive as finish/error notifications; poll
  `get_agent_status` only when notifications are not available.
- There is no detach tool — detaching is manual in the app or CLI.
