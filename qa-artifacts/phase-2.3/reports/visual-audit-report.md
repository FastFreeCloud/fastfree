# Phase 2.3 — Tauri MCP Automated Visual Inspection & Layout Audit

**Project:** FastFree ERP — Installer (Tauri v2 desktop app)
**Component under test:** `apps/fastfree_installer` (`FastFree-Node-Setup` v26.5.33, identifier `cloud.fastfree.installer`)
**Audit driver:** Hermes QA profile via `@hypothesi/tauri-mcp-server` 0.13.2 (MCP over stdio) → Tauri MCP Bridge 0.13.2 WebSocket (port 9223)
**Date:** 2026-11-12
**Verdict:** ❌ **ACCEPTANCE NOT MET** — clipping present; text contrast fails; glassmorphism and overlap checks pass.

---

## 1. Executive Summary

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Visual screenshots captured and saved for forensic auditing | ✅ PASS | 54 native PNG screenshots (3 themes × 3 resolutions × 6 steps) |
| Zero visual **overlapping** elements | ✅ PASS | 0 non-nested element overlaps across all 54 checkpoints |
| Zero visual **clipping** | ❌ **FAIL** | 24/54 checkpoints clip content; `.content-wrapper` is `overflow: hidden` with no scroll |
| Glassmorphism `backdrop-filter` | ✅ PASS | blur(12–20px) present on titlebar, screen wrapper, cards, banners |
| Border specular accents | ✅ PASS | 1px `rgba(255,255,255,0.08)` / `rgba(14,165,233,0.3)` borders on glass panels |
| Text contrast | ❌ **FAIL** | 435/1242 text samples below WCAG AA; light theme worst 1.07:1, dark 1.18:1, OLED 1.17:1 |

**Matrix:** 3 themes (Dark, Light, OLED-Black) × 3 resolutions (1024×768, 1280×800, 1920×1080) × 6 wizard steps = **54 checkpoints**, each with a `webview_screenshot`, a `manage_window` info reading, and a DOM/computed-style metrics probe.

---

## 2. Method & MCP Tools Used

The audit drove the **debug** Tauri build (`src-tauri/target/debug/fastfree-installer.exe`), the only build that compiles the MCP Bridge (`#[cfg(debug_assertions)]`). The frontend was served by Vite at `http://localhost:1420`.

| Mandated tool | MCP call used | Purpose |
| --- | --- | --- |
| `webview_screenshot` | `webview_screenshot {format:"png", filePath, windowId:"main"}` | Native WebView2 `CapturePreview` PNG saved to disk |
| `get_window_info` | `manage_window {action:"info", windowId:"main"}` | Outer size/position/title/visibility; DPI cross-check |
| `set_window_size` | `manage_window {action:"resize", width, height, logical:true}` | Responsiveness at 1024×768 / 1280×800 / 1920×1080 |
| (supporting) | `webview_execute_js` | Theme cycling via `.theme-btn`; step switching via `window.__FASTFREE_CURRENT_STEP__`; computed-style/DOM metrics |
| (supporting) | `driver_session`, `manage_window {action:"list"}`, `ipc_get_backend_state` | Session, window inventory, app metadata |

**Theme control:** clicking `.theme-btn` cycles Dark → Light → OLED-Black (verified `data-theme` attribute after each click).
**Step control:** `window.__FASTFREE_CURRENT_STEP__.value = n` (the app exposes this bridge deliberately for MCP/headless navigation).
**Contrast method:** computed `color` vs the **alpha-composited** ancestor background (walks the DOM blending every `rgba()` layer), WCAG 2.1 relative-luminance ratio; AA thresholds 4.5:1 (normal) / 3:1 (large ≥18.66px or ≥14px bold).
**Clipping method:** `getBoundingClientRect()` vs viewport, plus the computed `overflow` of `.content-wrapper`.

---

## 3. Environment Verification (DPI & Dimensions)

| Requested | `get_window_info` outer | Webview viewport | `devicePixelRatio` | Screenshot | Match |
| --- | --- | --- | --- | --- | --- |
| 1024×768 | 1040×776 | 1024×768 | 1 | 1024×768 | ✅ |
| 1280×800 | 1296×808 | 1280×800 | 1 | 1280×800 | ✅ |
| 1920×1080 | 1936×1088 | 1920×1080 | 1 | 1920×1080 | ✅ |

- Outer size = requested + 16 px (8 px window border per side) — consistent across all sizes.
- `devicePixelRatio = 1` (no DPI scaling on the test host); screen 1920×1080.
- All 54 screenshots exactly match the webview viewport. Window resize via MCP works correctly.

---

## 4. Results

### 4.1 Status summary

| Status | Count |
| --- | --- |
| pass | 0 |
| warn | 12 |
| fail | 42 |
| error | 0 |
| screenshots captured | 54 |

Issues by category: `contrast` 54, `clipping` 24.

### 4.2 Clipping matrix (vertical content beyond viewport)

| Step | 1024×768 | 1280×800 | 1920×1080 | Max content bottom |
| --- | --- | --- | --- | --- |
| 1 | OK | OK | OK | 727–730 |
| 2 | OK | OK | OK | 656–659 |
| 3 | ❌ clipped | ❌ clipped | OK | 821 / 822 / 824 |
| 4 | OK | OK | OK | 624–627 |
| 5 | ❌ clipped | ❌ clipped | ❌ clipped | 1216 / 1217 / 1219 |
| 6 | ❌ clipped | ❌ clipped | ❌ clipped | 1769 / 1769 / 1768 |

`.content-wrapper` computed style is `overflow: hidden / hidden` and `document.scrollHeight == innerHeight` in every checkpoint — **the clipped content cannot be scrolled to**. Visually confirmed: the bottom card row of step 6 at 1024×768 is cut mid-card with no scrollbar.

### 4.3 Text contrast by theme

| Theme | Checkpoints with failures | Text samples | Failing | Min ratio | Worst offender |
| --- | --- | --- | --- | --- | --- |
| Dark | 18/18 | 414 | 69 (16.7%) | **1.18:1** | `rgba(0,0,0,0.6)` on `rgb(23,23,31)` — "مسار قرص VHDX المستهدف" (step 3) |
| Light | 18/18 | 414 | 231 (55.8%) | **1.07:1** | `rgb(15,23,42)` on `rgb(30,30,37)` — "client1: البوابة والراوتر (Gateway)" (step 5) |
| OLED-Black | 18/18 | 414 | 135 (32.6%) | **1.17:1** | `rgba(0,0,0,0.6)` on `rgb(23,23,30)` — "مسار قرص VHDX المستهدف" (step 3) |

### 4.4 Glassmorphism (pass)

| Element | backdrop-filter | background | border |
| --- | --- | --- | --- |
| `.titlebar` | `blur(12px)` | theme-aware | 0 px (no border) |
| `.sdui-screen-wrapper` | `blur(20px)` | `rgba(18,18,24,0.72)` — **hardcoded dark in all themes** | 1px `rgba(255,255,255,0.08)` |
| `.q-card` | `blur(14px)` | `rgba(26,26,34,0.75)` — **hardcoded dark in all themes** | 1px `rgba(255,255,255,0.08)` |
| `.q-banner` | `blur(14px)` | theme-aware | 1px `rgba(14,165,233,0.3)` (cyan specular) |

### 4.5 Overlaps (pass)

Zero non-nested element overlaps across all 54 checkpoints (titlebar tools, window controls, step progress, cards, buttons).

---

## 5. Defects

### DEF-001 — CRITICAL — Light theme: SDUI text is effectively invisible
- **What:** In Light theme, SDUI labels/values render dark navy `rgb(15,23,42)` on dark glass cards `rgb(30,30,37)` → contrast **1.07–1.22:1** (WCAG AA needs 4.5:1).
- **Where:** Steps 1, 3, 5, 6 (all steps with SDUI cards). Examples: "المعالج (CPU Cores)", "الذاكرة العشوائية (RAM)", "client1: البوابة والراوتر (Gateway)".
- **Root cause:** `apps/fastfree_installer/src/components/SduiStepHost.vue` hardcodes dark panel backgrounds (`rgba(18,18,24,0.72)`, `rgba(26,26,34,0.75)`) in its scoped CSS, while the app-level light theme switches `--text-main` to dark navy. Dark text on a dark panel.
- **Evidence:** `screenshots/step1-light-1280x800.png` region (505,320→776,348): dominant pixels `rgb(28,28,35)` (background) and `rgb(15,23,42)` (text). See `reports/evidence/pixel-evidence.txt`.

### DEF-002 — HIGH — Tall wizard steps are clipped with no scroll
- **What:** `.content-wrapper` (`App.vue:749-758`) has `overflow: hidden`; `.installer-app` also `overflow: hidden` (`App.vue:493`). Steps 3 (1024/1280), 5 (all), and 6 (all) extend past the viewport and **cannot be scrolled**.
- **Impact:** Step 6 at 1024×768 shows content down to y=1769 in a 768 px viewport — ~1000 px of content unreachable. Step 5 ~450 px unreachable. Buttons at the bottom of these steps are inaccessible.
- **Evidence:** `screenshots/step6-dark-1024x768.png` (bottom card row cut mid-card, no scrollbar); DOM metrics in `reports/audit-report.json`.

### DEF-003 — MEDIUM — Secondary text below WCAG AA in Dark/OLED
- **What:** Blue secondary text `rgb(25,118,210)` on `rgb(23,23,31)` = **3.86:1** (below 4.5:1 for 14 px/600 text); muted gray `rgb(113,113,122)` on `rgb(23,23,30)` = **3.7:1**; semi-transparent black `rgba(0,0,0,0.6)` labels on dark cards = **1.18:1**.
- **Where:** Dark/OLED themes, steps 1, 3, 5 (client chips, body descriptions, VHDX path label).
- **Evidence:** `screenshots/step1-dark-1280x800.png` region (944,511→1024,532): background `rgb(23,23,30)`, text `rgb(25,118,210)`.

### DEF-004 — MEDIUM — Unrendered SDUI template placeholders
- **What:** Mustache bindings are displayed literally instead of resolved values:
  - `{{ state.cpuCores || 8 }} أنوية متوفرة`
  - `{{ state.totalRamGb || 16 }} جيجابايت إجمالي`
  - `الأنوية المعينة حالياً: {{ state.assignedCpu || ... }}`
  - `الذاكرة المحددة: {{ state.assignedRam || ... }}`
  - `{{ state.installPercent || 92 }}% منجز`
- **Where:** Steps 1, 3, 5 (SDUI schema-driven screens).
- **Root cause:** SDUI runtime (`packages/fastfree_lowcode/src/runtime/sdui`) does not interpolate `{{ state.* }}` in these schemas.

### DEF-005 — LOW — Glass panel background not theme-aware (root cause of DEF-001)
- **What:** `.sdui-screen-wrapper` and `.q-card` remain dark in Light and OLED themes; only `.titlebar`, `.q-banner` and `.content-wrapper` follow the theme.
- **Where:** `apps/fastfree_installer/src/components/SduiStepHost.vue` lines 213–235.

---

## 6. Recommendations

1. **DEF-002 (do first):** make `.content-wrapper` scrollable (`overflow-y: auto`) or let `.sdui-step-host` grow and scroll, so all steps are reachable at every resolution.
2. **DEF-001/DEF-005:** replace the hardcoded dark RGBA in `SduiStepHost.vue` with theme-aware CSS variables (e.g. `var(--glass-bg)`, `var(--glass-border)`) so Light/OLED themes get light glass and light text.
3. **DEF-003:** raise secondary text tokens to ≥4.5:1 (e.g. blue `#3B82F6`→`#60A5FA` on dark; replace `rgba(0,0,0,0.6)` labels with a light muted token).
4. **DEF-004:** fix SDUI `{{ state.* }}` interpolation in the lowcode runtime and add a test asserting no `{{` remains in rendered text.
5. Add these checks to CI as an automated regression: clip detection (max content bottom ≤ viewport) + contrast sampling per theme.

---

## 7. Artifacts

| Path | Description |
| --- | --- |
| `qa-artifacts/phase-2.3/screenshots/*.png` | 54 native WebView2 screenshots (`step{N}-{theme}-{resolution}.png`) |
| `qa-artifacts/phase-2.3/reports/audit-report.json` | Full structured results (per-checkpoint metrics, issues, raw MCP responses) |
| `qa-artifacts/phase-2.3/reports/audit-report.md` | Machine-generated checklist |
| `qa-artifacts/phase-2.3/reports/stats.json` | Aggregate statistics |
| `qa-artifacts/phase-2.3/reports/visual-audit-report.md` | This report |
| `qa-artifacts/phase-2.3/reports/contact-sheet.png` | Labeled 54-thumbnail contact sheet (border colour = pass/warn/fail) |
| `qa-artifacts/phase-2.3/reports/evidence/pixel-evidence.txt` | Pixel-sampling ground truth |
| `qa-artifacts/phase-2.3/reports/mcp-session.json` | Raw MCP tool-call log |
| `qa-artifacts/phase-2.3/tools/audit2.mjs` | Reproducible audit driver |

### Reproduction

```bash
cd apps/fastfree_installer
bun run dev &                       # Vite on :1420
cd src-tauri && ./target/debug/fastfree-installer.exe &   # MCP Bridge on :9223
cd ../../../qa-artifacts/phase-2.3/tools
node audit2.mjs                      # regenerates screenshots + reports
```
