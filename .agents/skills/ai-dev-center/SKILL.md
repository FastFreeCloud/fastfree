---
name: ai-dev-center
description: Supervised, self-improving multi-agent AI Development Center operating standard for FastFree monorepo across Omnigent, OpenCode, Antigravity, NixOS, Clan, and Quasar.
---

# FastFree AI Development Center Operating Standard

This skill governs the supervised, self-improving multi-agent development ecosystem across the FastFree sovereign monorepo.

---

## 1. Multi-Agent Ecosystem Architecture

FastFree operates an autonomous yet strictly supervised multi-agent meta-harness powered by **Omnigent** (`127.0.0.1:8090`), **OpenCode**, and **Google Antigravity**.

### Orchestration Topology
- **Chief Architect / Lead Supervisor**: Antigravity / Claude 3.7 Sonnet orchestrating tasks, querying Hindsight memory, delegating to specialized subagents, and synthesizing results.
- **Independent Adversarial Reviewer**: OpenCode running DeepSeek R1 / Qwen 2.5 Coder in an isolated profile for objective audits.
- **Git Worktree Isolation**: All feature development and parallel mutations run inside ephemeral worktrees (`.worktrees/omnigent-*`), preventing uncommitted workspace contamination.

---

## 2. The 7-Phase Engineering Lifecycle

Every non-trivial engineering task strictly executes through 7 sequential phases:

```
[1. Understand] ➔ [2. Plan] ➔ [3. Delegate] ➔ [4. Execute] ➔ [5. Test] ➔ [6. Review] ➔ [7. Reflect]
```

### Phase 1: Understand
- Read the entire relevant codebase context and historical decisions via `hindsight_recall`.
- Inspect existing schemas, composables, and interfaces without making assumptions.
- Identify core domain invariants and potential regressions.

### Phase 2: Plan
- Formulate a modular, minimal-delta implementation plan (lazy senior dev / ponytail principle).
- Decompose monolithic files into focused Single Responsibility Principle (SRP) units.
- Identify required subagents and target worktrees.

### Phase 3: Delegate
- Dispatch work to the 7 specialized subagents defined in `.omnigent/agents/`:
  1. `subagent_architecture`: Project Architecture & Analysis.
  2. `subagent_nixos`: NixOS & Flakes Infrastructure.
  3. `subagent_clan`: Clan 26.05 & Sovereign Mesh.
  4. `subagent_backend`: Frappe v15 & Python / MariaDB / Hono Services.
  5. `subagent_frontend`: Vue 3, Quasar 2, TypeScript, RTL & Fluent 2 UI.
  6. `subagent_qa`: Playwright, Cypress, Vue-tsc, and Cargo Check.
  7. `subagent_research`: Upstream Docs, Context7, and AI-Rulez.

### Phase 4: Execute
- Implement code mutations cleanly within isolated worktrees.
- Reuse shared composables (`useFormatNumber`, `useStatusHelpers`, singleton screen composables).
- Strictly adhere to the Anti-Slop standard: zero raw emojis, 100% SVG iconography, Segoe UI Variable typography.

### Phase 5: Test
- Run compiler and type verification:
  - `vue-tsc --noEmit` (0 errors required).
  - `vite build` (bundle successfully without warnings).
  - `cargo check --manifest-path apps/fastfree_installer/src-tauri/Cargo.toml` (0 warnings/errors).
- Execute domain test suites and end-to-end verifiers.

### Phase 6: Review (Dual-Agent Invariant)
- Hand off git diff to the independent **OpenCode Reviewer** (`subagent_reviewer`).
- Reviewer audits code for:
  - Anti-slop compliance.
  - Memory leak prevention and event listener cleanup.
  - Reactive state scoping (Module-level Singleton vs local).
  - Security invariants (Zero plaintext secrets).
- Reviewer issues formal sign-off: `🟢 VERDICT: APPROVE` or `🔴 VERDICT: REJECT`.
- Never allow an agent to approve its own work.

### Phase 7: Reflect (Self-Improvement & Hindsight)
- Retain lessons learned, architectural choices, and resolved bugs in Hindsight memory (`hindsight_retain`).
- Update or create skill recipes in `.agents/skills/*/SKILL.md` to prevent recurring errors.
- Sync AI-Rulez governance policies: `npx -y ai-rulez verifiers run --strict`.

---

## 3. Hindsight Long-Term Memory Bank Protocol

Long-term memory is centralized in the `fastfree-core-memory` bank.

### The 4 Cognitive Strata
1. **World Facts**: Fixed environment constraints (Hyper-V appliance architecture, WireGuard mesh UDP 51820, Gen 2 VMMS).
2. **Agent Experiences**: Executed workflows, task timelines, and test outcomes.
3. **Entity Summaries**: High-level summaries of core components, screens, and services.
4. **Evolving Beliefs**: Best practices developed through experience (e.g., Module-scoped ref invariant in composables).

### Secret Sanitizer Invariant
Every payload ingested into Hindsight must pass through `MemorySanitizer`:
- WireGuard private keys (`[A-Za-z0-9+/]{43}=`) are masked to `[REDACTED_WIREGUARD_KEY]`.
- Android keystore passwords and tokens are redacted.
- Internal Hyper-V IPs (`10.0.0.0/8`, `192.168.0.0/16`) are redacted.
- Shannon entropy filter (>4.5) catches and redacts high-entropy credentials.

---

## 4. Supervised Autonomy & Human-In-The-Loop (HITL) Gate

The multi-agent center operates under **SUPERVISED AUTONOMY**:
- **Autonomous Scope**: Codebase exploration, file refactoring, typechecking, writing unit tests, and drafting PRs.
- **Mandatory Human Approval**:
  - Deploying NixOS hosts or provisioning Hyper-V hardware appliances.
  - Committing to `main` or pushing to remote repositories (`git push`).
  - Generating or modifying Clan Vars cryptographic secrets (`clan vars generate/set`).
  - Promoting agents or skills to production status.

---

## 5. Verification Commands Reference

```powershell
# 1. Desktop Installer Typecheck
cd apps/fastfree_installer; npx vue-tsc --noEmit

# 2. Desktop Installer Production Build
cd apps/fastfree_installer; npm run build

# 3. Rust Backend Verification
cargo check --manifest-path apps/fastfree_installer/src-tauri/Cargo.toml

# 4. Governance & Policy Verification
npx -y ai-rulez@5.9.2 verifiers run --strict
```
