---
name: fastfree-change-policy
description: >-
  Mandatory code modification rules, scope boundary enforcement, secret prevention, and commit conventions
  for all human developers and AI agents operating within the FastFree Monorepo.
---

# FastFree Change Policy & Commit Conventions

This policy governs all code modifications, file edits, git commits, and agent behaviors across the FastFree Monorepo. Adherence is strictly enforced for all human developers and autonomous AI agents.

---

## 1. Strict Scope Boundaries

To prevent unintended regressions and maintain clear pull requests:
- **Task Isolation**: Only inspect and edit files directly required to fulfill the specific assigned request or bug fix.
- **No Unsolicited Refactoring**: Do not reformat, reorganize, or rewrite code outside the immediate target area. Never perform monorepo-wide reformatting sweeps.
- **Do Not Touch Unrelated Packages**: Modifications must stay strictly within the bounds of the package, application, or service under development.
- **Minimal Diffs**: Keep git diffs as concise and purposeful as possible. Every changed line must have a direct justification tied to the task goal.

---

## 2. Preservation of Documentation, Comments & Contracts

- **Preserve Existing Documentation**: All docstrings, JSDoc/TSDoc comments, license headers, and architectural inline notes must remain intact unless directly invalidated by the authorized change.
- **Contract Stability**: Never alter existing function signatures, exported interface definitions, API endpoints, or database DocType contracts without explicit instruction.
- **Backward Compatibility**: Ensure extensions and downstream consumers (such as `fastfree_panel` or `fastfree_ledger`) remain fully functional when editing shared libraries in `packages/`.

---

## 3. Absolute Prohibition of Secrets & Credentials

- **Zero Secret Ingestion**: Under no circumstance may private keys, API tokens, passwords, database credentials, or secret authentication headers be committed to Git.
- **Use Environment Variables**:
  - Code must read credentials exclusively from environment variables (e.g., `process.env.FLOW_API_KEY`, `process.env.FRAPPE_API_SECRET`).
  - Use `.env` or `.env.example` templates with sanitized placeholder values.
- **Infrastructure Secrets**:
  - In `apps/fastfree_os` (NixOS / Clan), all sensitive values must be managed using `sops-nix` / `age` encryption keys, never plain-text strings in nix files.
- **Accidental Leak Protocol**: If any token or secret is inadvertently placed into staging or a file, immediately sanitize it before staging and verify with `git diff`.

---

## 4. Git Commit Message Conventions (Conventional Commits)

All commits in FastFree must strictly follow the Conventional Commits standard:

```
<type>(<scope>): <short imperative description>

[optional body providing deeper rationale and context]

[optional footer(s) referencing issue IDs or BREAKING CHANGE]
```

### Approved Types:
- `feat`: A new feature or capability for the user/system.
- `fix`: A bug fix or error correction.
- `refactor`: Code improvements that neither fix a bug nor add a feature.
- `chore`: Build processes, tooling adjustments, dependencies, or configuration changes.
- `test`: Adding or modifying automated tests (Cypress, unit tests, mock data).
- `docs`: Documentation, README, or architectural guide updates only.
- `perf`: Code changes focused specifically on performance or rendering speed.

### Standard Scopes:
- **Packages**: `lowcode`, `auth`, `accounting`, `inventory`, `sales`, `purchase`, `hr`, `crm`, `update`, `vpn`.
- **Applications**: `panel`, `ledger`, `erp`, `pos`, `website`, `os`, `backend`.
- **Infrastructure & Tools**: `mcp`, `paseo`, `flox`, `clan`, `ci`, `skills`.

### Commit Message Rules:
1. Use the imperative, present tense ("add" not "added", "fix" not "fixes").
2. Lowercase description with no ending period.
3. Keep the first line under 72 characters.
4. Examples:
   - `feat(inventory): add batch warehouse transfer dialog`
   - `fix(auth): handle expired refresh token redirection`
   - `chore(mcp): align port configurations for fastfree-flow`
   - `refactor(accounting): extract useFormatNumber shared composable`

---

## 5. Pre-Commit Verification Gate

Before staging files with `git add` and committing:
1. Run verification commands defined in [`fastfree-test`](../fastfree-test/SKILL.md).
2. Verify `0` TypeScript errors and clean ESLint checks.
3. Review staged changes using `git diff --cached` to confirm zero unintended files, temporary outputs, or sensitive credentials.
