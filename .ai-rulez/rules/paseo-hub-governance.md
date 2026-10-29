---
type: Decision
title: Paseo Hub Governance (Augmentation Layer)
x-ai-rulez:
  kind: rule
  id: paseo-hub-governance
  metadata:
    priority: critical
---

# Paseo Hub Governance (Augmentation Layer)

Paseo is adopted as an **augmentation layer** on top of, never a replacement for, Herdr:

1. **Role Boundaries**:
   - Herdr remains the canonical terminal-core orchestrator and the mandated independent reviewer channel (`herdr-review-loop`).
   - Paseo covers what Herdr does not: programmatic permission approvals (`list_pending_permissions` / `respond_to_permission`), cron schedules and heartbeats, mobile/web review via the E2E-encrypted relay, and Hub-level org automation.
   - Agents unsupported by Paseo providers (e.g. Antigravity) MUST stay Herdr-orchestrated.

2. **Sovereignty — Self-Hosted Hub Only**:
   - The Paseo Hub MUST be self-hosted on the sovereign controller (`client1`), NOT the hosted `hub.paseo.sh` origin, for any fleet automation touching customer appliances (`client2..11`).
   - Appliance daemons enroll over the WireGuard mesh using single-use, 10-minute enrollment tokens (`POST /api/v1/daemons/enrollment-tokens`, scope `daemons:enroll`).

3. **Secrets Classification (secure-secrets applies)**:
   - Every Paseo hub API key (`paseo_pk_...`) is a regulated secret: GitHub Secrets or out-of-repo secret storage ONLY. Zero plaintext keys in the repo, Nix expressions, or generated context files.
   - Issued keys use least-privilege scopes; the `fastfree_panel` Hono backend may hold only `runs:dispatch` + `projects:read`.

4. **Trigger Security**:
   - Every trigger MUST declare a non-empty `from_users` allowlist; dispatch actors outside it are rejected (403).
   - Unattended agent steps default to the least-capable mode; `full-access` mode and widened GitHub authority (`contents: write`) require explicit scope justification in the workflow file.
   - Hub has no queue/retry: any consumer (e.g. the panel backend) MUST implement its own retry with a stable `deliveryKey` for dedup.

5. **Lint Gate**: `ai-rulez verifiers run --strict` MUST pass after any change to this rule or to Paseo-related configuration.
