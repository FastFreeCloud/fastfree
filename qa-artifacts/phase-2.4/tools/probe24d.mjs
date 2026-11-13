/**
 * Phase 2.4 probe 3 — dispatcher log access + click behavior.
 * No backslashes in this file.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'fastfree-qa-phase24-probe3', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  return res.content ?? [];
}
const textOf = (content) => content.map((c) => c.text ?? '').join('\n');
async function ev(script) {
  const c = await call('webview_execute_js', { script, windowId: 'main' });
  return textOf(c);
}

// switch to EN
console.log('--- click lang-btn ---');
console.log(textOf(await call('webview_interact', { action: 'click', selector: '.lang-btn', windowId: 'main' })));
await sleep(600);
console.log(await ev("(() => { return JSON.stringify({ locale: document.documentElement.getAttribute('lang'), dir: document.documentElement.getAttribute('dir'), step: window.__FASTFREE_CURRENT_STEP__.value }); })()"));

// go to step 1
console.log('--- set step 1 ---');
console.log(await ev("(() => { window.__FASTFREE_CURRENT_STEP__.value = 1; return 'ok'; })()"));
await sleep(800);

// find dispatcher module url
const modUrl = await ev("(() => { const rs = performance.getEntriesByType('resource').map(r => r.name); const u = rs.find(n => n.indexOf('SduiActionDispatcher.ts') >= 0); return u || 'NOT_FOUND'; })()");
console.log('--- dispatcher module url ---');
console.log(modUrl);

// dynamic import + clear logs
console.log('--- import dispatcher + clear logs ---');
console.log(await ev("(async () => { try { const m = await import(" + JSON.stringify(modUrl) + "); const d = m.SduiActionDispatcher.getInstance(); d.clearLogs(); return JSON.stringify({ ok: true, count: d.getExecutionLogs().length }); } catch (e) { return 'ERR:' + e.message; } })()"));

// click Re-scan Hardware
console.log('--- click Re-scan Hardware ---');
console.log(textOf(await call('webview_interact', { action: 'click', selector: 'Re-scan Hardware', strategy: 'text', windowId: 'main' })));
await sleep(2500);

// dispatcher logs
console.log('--- dispatcher logs ---');
console.log(await ev("(async () => { try { const m = await import(" + JSON.stringify(modUrl) + "); const d = m.SduiActionDispatcher.getInstance(); return JSON.stringify(d.getExecutionLogs()); } catch (e) { return 'ERR:' + e.message; } })()"));

// console logs
console.log('--- console logs ---');
console.log(textOf(await call('read_logs', { source: 'console', lines: 80, maxChars: 15000, windowId: 'main' })));

await client.close();
console.log('done');
