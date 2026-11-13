/**
 * Phase 2.2 — MCP client wrapper for the running FastFree Installer Tauri app.
 *
 * The Tauri app exposes an MCP bridge (tauri-plugin-mcp-bridge) on localhost:9223.
 * The @hypothesi/tauri-mcp-server (installed under qa-artifacts/phase-2.4/tools)
 * is the stdio MCP server that connects to it.
 *
 * Mandated tool mapping used across Phase 2.2 verification:
 *   webview_evaluate -> webview_execute_js { script }
 *   webview_click    -> webview_interact { action: "click" }
 *   webview_screenshot -> webview_screenshot
 *
 * This file intentionally contains NO backslash characters.
 */

// The MCP SDK ships in the phase-2.4 tools node_modules; import by absolute
// path so this driver works without duplicating node_modules.
import { Client } from '../../phase-2.4/tools/node_modules/@modelcontextprotocol/sdk/dist/client/index.js';
import { StdioClientTransport } from '../../phase-2.4/tools/node_modules/@modelcontextprotocol/sdk/dist/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The tauri-mcp-server ships in the phase-2.4 tools node_modules.
const P24 = path.resolve(__dirname, '../../phase-2.4/tools');
const SERVER = path.join(P24, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');

export const WINDOW = 'main';

export async function connect() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
    cwd: P24,
  });
  const client = new Client({ name: 'fastfree-phase22', version: '2.2.0' }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

export function textOf(content) {
  return (content || []).map((c) => c.text ?? '').join('\n');
}

export function extractJson(text) {
  const s = String(text ?? '');
  let i = s.indexOf('{');
  let j = s.lastIndexOf('}');
  if (i >= 0 && j > i) {
    try { return JSON.parse(s.slice(i, j + 1)); } catch { /* keep looking */ }
  }
  i = s.indexOf('[');
  j = s.lastIndexOf(']');
  if (i >= 0 && j > i) {
    try { return JSON.parse(s.slice(i, j + 1)); } catch { /* ignore */ }
  }
  return null;
}

export async function makeHelpers(client) {
  const calls = [];
  async function call(name, args) {
    const started = Date.now();
    let content = [];
    let error = null;
    try {
      const res = await client.callTool({ name, arguments: args });
      content = res.content ?? [];
    } catch (e) {
      error = e?.message || String(e);
    }
    const entry = { tool: name, args, ok: error === null, error, ms: Date.now() - started, at: new Date(started).toISOString() };
    calls.push(entry);
    if (error !== null) throw new Error(name + ': ' + error);
    return content;
  }

  async function ev(script) {
    const content = await call('webview_execute_js', { script, windowId: WINDOW });
    const raw = textOf(content);
    return { raw, json: extractJson(raw) };
  }

  async function evJson(script) {
    const r = await ev(script);
    return r.json;
  }

  async function click(selector, opts = {}) {
    const out = textOf(await call('webview_interact', { action: 'click', selector, windowId: WINDOW, ...opts }));
    return { ok: true, out };
  }

  async function screenshot(filePath) {
    await call('webview_screenshot', { format: 'png', filePath, windowId: WINDOW });
    return filePath;
  }

  async function currentStep() {
    const j = await evJson("(() => { const s = window.__FASTFREE_CURRENT_STEP__; return JSON.stringify({ step: s ? s.value : null }); })()");
    return j && j.step ? j.step : null;
  }

  return { call, ev, evJson, click, screenshot, currentStep, calls };
}
