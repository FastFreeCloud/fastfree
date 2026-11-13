/**
 * Phase 2.4 probe H - live state + MCP tool schemas.
 * No backslash characters in this file.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'fastfree-qa-phase24-probeH', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

function textOf(content) { return content.map((c) => c.text ?? '').join('\n'); }
async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  return res.content ?? [];
}

// 1. tool schemas
const tools = await client.listTools();
const wanted = ['webview_interact', 'webview_keyboard', 'webview_execute_js', 'webview_find_element', 'webview_screenshot', 'manage_window', 'driver_session', 'webview_dom_snapshot', 'webview_wait_for', 'read_logs'];
console.log('=== TOOL SCHEMAS ===');
for (const t of tools.tools) {
  if (wanted.indexOf(t.name) >= 0) {
    console.log('--- ' + t.name + ' ---');
    console.log('desc: ' + String(t.description || '').slice(0, 200));
    console.log('schema: ' + JSON.stringify(t.inputSchema));
  }
}

// 2. session + window
console.log('=== SESSION ===');
console.log(textOf(await call('driver_session', { action: 'start' })).slice(0, 400));
console.log('=== WINDOW INFO ===');
console.log(textOf(await call('manage_window', { action: 'info', windowId: 'main' })).slice(0, 600));

// 3. live app state
console.log('=== APP STATE ===');
const stateScript = "(() => { const s = window.__FASTFREE_CURRENT_STEP__; const n = window.__FASTFREE_NAVIGATE_STEP__; return JSON.stringify({ step: s ? s.value : null, hasNav: typeof n, lang: document.documentElement.getAttribute('lang'), dir: document.documentElement.getAttribute('dir'), theme: document.documentElement.getAttribute('data-theme'), title: document.title, ready: document.readyState, hasMcpLogs: !!window.__MCP_CONSOLE_LOGS__, hasQA: !!window.__QA_DISPATCHER__, bodyLen: document.body ? document.body.innerText.length : 0 }); })()";
console.log(textOf(await call('webview_execute_js', { script: stateScript, windowId: 'main' })));

// 4. element inventory
console.log('=== ELEMENTS ===');
for (const sel of ['.q-slider', '.q-input', '.q-card', '.q-toggle', '.q-btn', '.lang-btn', '.theme-btn', '.step-item', '.sdui-step-host']) {
  const out = textOf(await call('webview_find_element', { selector: sel, strategy: 'css', limit: 3, windowId: 'main' }));
  console.log(sel + ' => ' + out.replace(/\s+/g, ' ').slice(0, 220));
}

// 5. screenshot
const shot = path.join(__dirname, '..', 'screenshots', 'probeH-live.png');
fs.mkdirSync(path.dirname(shot), { recursive: true });
console.log('=== SCREENSHOT ===');
console.log(textOf(await call('webview_screenshot', { format: 'png', filePath: shot, windowId: 'main' })).slice(0, 200));
console.log('saved: ' + shot);

await client.close();
console.log('done');
