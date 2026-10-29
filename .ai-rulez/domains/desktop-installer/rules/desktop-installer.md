---
name: desktop-installer
priority: critical
paths:
  - "apps/fastfree_installer/**"
---

# FastFree Desktop Installer & Hyper-V Companion Invariants

When working within `apps/fastfree_installer`:

1. **Zero TypeScript & Cargo Errors**:
   - Always verify `vue-tsc --noEmit` and `vite build` pass with 0 errors.
   - Always verify `cargo check --manifest-path apps/fastfree_installer/src-tauri/Cargo.toml` passes with 0 warnings or errors.

2. **Native Windows 11 Fluent 2 Aesthetic**:
   - Maintain pure desktop design: Mica/Acrylic deep-dark theme, rounded corners (`16px`), Segoe UI Variable typography.
   - Native caption buttons (minimize, close with Windows `#C42B1C` hover).
   - Window shadows enabled via DWM (`"shadow": true`).

3. **Official Brand Assets Only**:
   - Never use raw emojis (`⚡`, etc.) in titlebar branding, action buttons, or update badges.
   - Always use the official FastFree Infinity Mark SVG (`/logo.svg`) and brand logo (`/logo-full.svg`).

4. **Splashscreen Reliability**:
   - `splashscreen.html` must always be listed in `vite.config.ts`'s `rollupOptions.input` so it is bundled directly into `dist/splashscreen.html`.
   - Splashscreen displays a minimum of 2.5s during hardware discovery to ensure seamless transition without flicker.
   - `close_splashscreen` command in Rust must show and focus the `main` window before closing the splash window.

5. **Updater & Provisioning Integrity**:
   - Application updates must use native Rust `tauri_plugin_updater::UpdaterExt` rather than JavaScript Web APIs.
   - Mandatory update gate locks wizard progress when a required version is pending.
   - Real VM status is queried live via Hyper-V PowerShell commands.

6. **Multi-Agent Verification Mandate (Paseo + OpenCode)**:
   - For all architectural, security, or release validations of `apps/fastfree_installer`, the active AI agent MUST orchestrate an independent verification loop via Paseo MCP and OpenCode (`paseo-review-loop`).
   - The primary agent creates a worktree-isolated workspace (`create_workspace`) and opens an OpenCode reviewer agent via `create_agent` with an initial review prompt.
   - OpenCode independently inspects code changes, runs build checks (`vue-tsc`, `vite build`, `cargo check`), audits Windows 11 Fluent 2 compliance, and provides an objective sign-off (`VERDICT: APPROVE`).
   - No release or installer finalization is accepted without this dual-agent Paseo + OpenCode audit.
