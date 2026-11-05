# Beads Workflow (bd)

Run `bd ready` to find available work. Issues are stored in the local Dolt DB
(`fastfree-<hash>`); sync uses your git remote under `refs/dolt/data`.

## Quick Reference

```bash
bd ready              # find available work
bd show <id>          # view issue details
bd update <id> --claim # claim work
bd close <id>         # complete work
```

## Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite or markdown TODO lists.
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files.
- Do not commit/push without explicit authority from orchestrator or current user request.
- Conservative default: report status and proposed commands at handoff; wait for approval.
