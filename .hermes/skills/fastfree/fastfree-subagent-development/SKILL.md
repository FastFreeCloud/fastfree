---
name: fastfree-subagent-development
description: "Subagent-driven dev for FastFree ERP tasks."
version: 1.0.0
author: FastFree (fastfree), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [fastfree, subagent, delegation, parallel, development]
    related_skills: [fastfree-development, fastfree-hr-development, project-cleanup]
---

# FastFree Subagent-Driven Development Skill

Execute FastFree ERP development tasks using parallel subagents with two-stage review (spec compliance then code quality).

## When to Use

- User asks to implement a feature across multiple files
- User wants parallel development of frontend + backend + tests
- User needs to refactor multiple modules simultaneously
- User wants automated code review between tasks

## Prerequisites

- FastFree project at `C:\Users\FastFree\Desktop\fastfree`
- Hermes delegate_task tool available
- Clear implementation plan or requirements

## How to Run

### Step 1: Plan the work

Break the task into 2-5 minute subtasks. Each subtask should be:
- Independent (no file conflicts)
- Focused (one concern)
- Testable (clear completion criteria)

### Step 2: Delegate to subagents

Use `delegate_task` with parallel tasks:

```python
# Example: Implement HR Training Management
delegate_task(tasks=[
  {
    "goal": "Create Training types and service in packages/fastfree_hr/src/",
    "context": "Project at C:/Users/FastFree/Desktop/fastfree. Create Training interface in types/index.ts. Create training.service.ts in services/. Follow existing employee.service.ts pattern."
  },
  {
    "goal": "Create Training screens in packages/fastfree_hr/src/screens/",
    "context": "Project at C:/Users/FastFree/Desktop/fastfree. Create TrainingList.vue and TrainingForm.vue. Follow existing EmployeeList.vue pattern. Use Quasar components. Add i18n keys."
  },
  {
    "goal": "Write tests for Training module",
    "context": "Project at C:/Users/FastFree/Desktop/fastfree. Write unit tests for training.service.ts. Write E2E tests for Training screens. Use Vitest and Cypress."
  }
])
```

### Step 3: Review (two-stage)

1. **Spec compliance review** — Does implementation match requirements?
2. **Code quality review** — Is code well-written, tested, documented?

### Step 4: Fix issues

If reviewers find issues, dispatch fix subagent with specific instructions.

## Quick Reference

| Pattern | When to Use |
|---------|-------------|
| Parallel Research | Research multiple topics simultaneously |
| Code Review | Review code for security/quality issues |
| Multi-File Refactoring | Refactor across multiple files |
| Gather Then Analyze | Collect data then synthesize report |

## Procedure

### FastFree Development Workflow:

1. **Understand requirements** — Read user request, identify affected apps/packages
2. **Plan subtasks** — Break into independent 2-5 minute tasks
3. **Delegate** — Use `delegate_task` with parallel tasks
4. **Spec review** — Check each subagent's output against requirements
5. **Quality review** — Check code quality, tests, documentation
6. **Fix issues** — Dispatch fix subagents for any problems
7. **Verify** — Run tests, typecheck, build
8. **Commit** — Git commit with descriptive message

### Subagent Context Template:

```python
delegate_task(tasks=[
  {
    "goal": "Specific, actionable goal",
    "context": """Project: C:/Users/FastFree/Desktop/fastfree
App/Package: <name>
Files: <list of files>
Pattern: <existing pattern to follow>
Tests: <test command>
Constraints: <any constraints>"""
  }
])
```

## Free-First Policy

- Use only free/open-source tools
- All profiles use the same free model (no paid models)
- Prefer local models and free APIs

## Pitfalls
- Subagents know NOTHING about conversation — pass all context explicitly
- Subagents cannot use `clarify` — provide all needed info upfront
- Don't dispatch multiple subagents for same files (conflicts) — task 1 and task 4 both touched EmployeeList.vue; assign file ownership clearly
- Always verify subagent results — don't trust summaries blindly: run tests, compile Python, check JSON validity
- Use `execute_code` for mechanical multi-step work, not subagents
- Subagents are process-local — use cronjob for durable work
- pnpm may not be in PATH on Windows — use `node_modules/.bin/vitest` directly
- Frappe backend: create DocType JSON + controller .py + API endpoints in separate files
- Vitest tests: use `vi.mock()` for Frappe API layer, target 100% coverage on services
- RTL: use CSS variables (--foreground, --muted-foreground, --accent, --border, --card) and logical properties (margin-inline-start, not margin-left)
- Accessibility: add ARIA labels, roles, aria-modal, aria-required on all interactive elements
- i18n: verify en.ts and ar.ts have identical key sets (use diff or script)

## Verification

- All subagent tasks completed successfully
- Tests pass: `pnpm test`
- Typecheck passes: `pnpm typecheck`
- Build succeeds: `pnpm build`
- Git diff shows only intended changes
