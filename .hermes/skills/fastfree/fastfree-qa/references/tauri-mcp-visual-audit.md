# Tauri MCP Visual Audit (Phase 2.3)

Automated visual/layout verification of the FastFree Installer Tauri app by driving it
through the `@hypothesi/tauri-mcp-server` MCP server.

## When to use
- Visual / layout audit across themes and resolutions
- Verifying glassmorphism, borders, text contrast, clipping, overlap
- Regression check after UI or theme changes

## Architecture (read this first)

```
Hermes QA worker
  └─ MCP client (Node, @modelcontextprotocol/sdk)  ──stdio──▶  @hypothesi/tauri-mcp-server
                                                              └─ WebSocket :9223 ──▶  Tauri app
                                                                    (tauri-plugin-mcp-bridge 0.13.2)
```

- The bridge is compiled **only in debug builds** (`#[cfg(debug_assertions)]` in `src-tauri/src/lib.rs`).
  A release/binary build has NO MCP server. Always run `src-tauri/target/debug/fastfree-installer.exe`.
- The frontend must be served by Vite on `http://localhost:1420` (`bun run dev` in `apps/fastfree_installer`).
- The bridge WebSocket binds `0.0.0.0:9223` (scans up to 100 ports from 9223).
- The MCP server package is NOT in `.hermes/config.yaml`. Install it locally and spawn it yourself:
  `npm install @hypothesi/tauri-mcp-server@0.13.2` then spawn `node node_modules/@hypothesi/tauri-mcp-server/dist/index.js`.

## Tool mapping (task mandate → actual MCP tool)

| Mandate | Actual tool call |
| --- | --- |
| `webview_screenshot` | `webview_screenshot {format:"png", filePath, windowId:"main"}` (native WebView2 CapturePreview) |
| `get_window_info` | `manage_window {action:"info", windowId:"main"}` |
| `set_window_size` | `manage_window {action:"resize", width, height, logical:true, windowId:"main"}` |
| (driving UI) | `webview_execute_js {script, windowId:"main"}` |
| (session) | `driver_session {action:"start"}` |
| (inventory) | `manage_window {action:"list"}`, `ipc_get_backend_state {}` |

## Launch procedure

```bash
# 1. frontend
cd apps/fastfree_installer && bun run dev &
# 2. debug Tauri app (bridge on :9223)
cd apps/fastfree_installer/src-tauri && ./target/debug/fastfree-installer.exe &
# 3. verify
netstat -ano | grep 9223     # must be LISTENING
curl -s -o /dev/null -w '%{http_code}' http://localhost:1420/   # 200
```

## Driving themes and steps

- Themes: click `.theme-btn` repeatedly until `document.documentElement.getAttribute('data-theme')`
  equals the target (`dark` | `light` | `oled-black`). Order is dark → light → oled-black.
- Steps: `window.__FASTFREE_CURRENT_STEP__.value = n` (the app exposes this bridge for headless
  navigation). Do NOT use `navigateToStep()` — it has forward-navigation guards and step 6 locks
  navigation.
- Wait ~900 ms after a step/theme change for the transition to finish before screenshotting.

## Client boilerplate (MCP SDK 0.6.1)

```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: toolsDir });
const client = new Client({ name: 'qa', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
```

The second constructor argument `{capabilities:{}}` is mandatory in SDK 0.6.1 or the client throws.

## Validation methods that worked

- **Contrast:** computed `color` vs the **alpha-composited** ancestor background (blend every `rgba()`
  layer up the DOM), WCAG 2.1 relative luminance, AA 4.5:1 normal / 3:1 large. Exclude icon fonts
  (Material Icons) from text checks.
- **Clipping:** compare `getBoundingClientRect()` to `innerWidth/innerHeight`, and read the computed
  `overflow` of `.content-wrapper`. If it is `overflow: hidden` and `scrollHeight == innerHeight`,
  below-viewport content is genuinely unreachable (not scrollable).
- **Overlap:** pairwise intersection of key interactive elements, skipping parent/child containment.
- **DPI:** `get_window_info` outer size vs requested logical size; cross-check `window.devicePixelRatio`.

## Pitfalls (cost real time)

1. **Backslash escaping.** Writing `.mjs` files through the file writer double-escapes `\`.
   Regex literals like `/blur\(/` become invalid (`Unterminated group`). Avoid backslashes entirely:
   use `String.includes('blur(')`, `indexOf`/`slice` parsers, and `node --check` before running.
2. **Vision models hallucinate colors.** A vision check claimed invisible dark-navy text was "white
   and readable". Pixel sampling with `pngjs` is authoritative — use it to confirm every contrast claim.
3. **`taskkill /F` is blocked** by single-query approvals. Use `process_manage action=kill` with the
   `terminal(background=true)` session id instead.
4. **Single-instance guard.** The app intercepts a second launch and just focuses the old window.
   Kill the old debug process before relaunching after a rebuild.
5. **App auto-navigation.** On mount the app may jump to step 5/6 based on Hyper-V VM state; always
   navigate explicitly after launch.

## Artifacts (Phase 2.3 run)

- `qa-artifacts/phase-2.3/screenshots/step{N}-{theme}-{resolution}.png` (54 native PNGs)
- `qa-artifacts/phase-2.3/reports/audit-report.json` (full metrics), `visual-audit-report.md`,
  `defects.json`, `stats.json`, `contact-sheet.png`, `evidence/pixel-evidence.txt`
- `qa-artifacts/phase-2.3/tools/audit2.mjs` — reproducible driver (regenerates everything)
- `qa-artifacts/phase-2.3/tools/pixels.mjs` — pngjs pixel ground-truth sampler
