---
description: Zero-tolerance Anti-AI-Slop design engineering and review contract for FastFree. Enforces human-grade UI quality, eliminates generic LLM tropes, and aligns Vue/Quasar/Tauri interfaces with Windows 11 Fluent 2 and Cairo RTL.
name: anti-slop-design
# Content-Hash: blake3:4b7457024731f27a6e176b54677713be012696399166bfd1494ef5e88a6e0b23
---

# Anti-Slop Design & Craft Contract

Strict quality gate preventing generic, bloated, or cookie-cutter AI-generated user interfaces across FastFree applications (`fastfree_installer`, `fastfree_panel`, `fastfree_ledger`, `packages/*`).

## The Seven Cardinal Sins (P0 Auto-Rejection)

Any component violating one of these 7 patterns MUST be rejected immediately:

1. **Default Tailwind / AI Indigo Accent**:
   - Strictly forbidden: `#6366f1`, `#4f46e5`, `#4338ca`, `#3730a3`, `#8b5cf6`, `#7c3aed`.
   - Solution: Use FastFree tokens: Cyber Blue (`#1976D2` / `#2563EB`), Neon Cyan (`#38BDF8`), or Radiant Amber (`#F59E0B`).

2. **Two-Stop "Trust" Hero Gradients**:
   - Strictly forbidden: Purple-to-blue, blue-to-cyan, indigo-to-pink gradient backgrounds.
   - Solution: Flat surface layers (`var(--surface)` / Mica `#0B1120`) with intentional typography and subtle 1px border elevation.

3. **Raw Emoji Icons in UI Controls**:
   - Strictly forbidden: `⚡`, `🚀`, `✨`, `🎯`, `🔥`, `💡`, `📈`, `🛡️` inside buttons, headers, or status tags.
   - Solution: Official FastFree Infinity Mark SVG (`/logo.svg`) or 1.6px monoline vector icons (`q-icon name="mdi-*"` or inline SVG with `currentColor`).

4. **Arbitrary Sans-Serif Fonts**:
   - Display and body text must follow FastFree standards:
     - Windows 11 Desktop: `Segoe UI Variable Display`, `Segoe UI`.
     - Web & ERP: `Cairo` for Arabic (RTL), `Inter` for Latin (LTR).

5. **AI Dashboard Tiles (Rounded Card with Left Colored Border)**:
   - Drop either the heavy border-radius or the colored left line. Prefer Bento grids with clean hairline borders (`rgba(255, 255, 255, 0.08)`).

6. **Invented Metrics & Fake Marketing Telemetry**:
   - Strictly forbidden: "10x faster", "99.9% uptime", "3x productivity".
   - Solution: Pull live telemetry from Hyper-V / systemd, or use labelled structural stubs (`—`).

7. **Filler Copy & Lorem Ipsum**:
   - Strictly forbidden: `lorem ipsum`, `feature one / two / three`, `sample content`.
   - Solution: Contextual business data (e.g., General Ledger accounts, WireGuard handshakes, Clan nodes).

## Invariants Checklist for FastFree

- [ ] **Zero TypeScript Errors**: `vue-tsc --noEmit` must pass with 0 errors.
- [ ] **Zero Raw Emojis**: All icons are official SVGs or MDI icons.
- [ ] **Bilingual RTL Support**: CSS uses logical properties (`inset-inline-start/end`, `margin-inline-start/end`).
- [ ] **Shared Composables**: Always reuse `useFormatNumber` and `useStatusHelpers`.
- [ ] **Form Safety**: Every dialog form binds `@submit.prevent="onSave"` with `type="submit"`.


## Resources

This skill bundles supporting files. Read them on demand when the task calls for them — don't bulk-load.

### References

- [`references/anti-slop-rules.md`](references/anti-slop-rules.md) — FastFree Craft & Anti-Slop Reference
