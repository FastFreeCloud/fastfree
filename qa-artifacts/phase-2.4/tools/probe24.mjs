/**
 * Phase 2.4 probe — verify real behavior of click -> SDUI dispatch -> console.
 * No backslashes in this file (writer escaping hazard).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'fastfree-qa-phase24-probe', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
console.log('connected');

async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  return res.content ?? [];
}
const textOf = (content) => content.map((c) => c.text ?? '').join('\n');

// session
console.log('--- driver_session ---');
console.log(textOf(await call('driver_session', { action: 'start' })));

// window list
console.log('--- windows ---');
console.log(textOf(await call('manage_window', { action: 'list' })));

// clear logs
console.log('--- clear console + dispatcher logs ---');
console.log(textOf(await call('webview_execute_js', { script: "window.__MCP_CONSOLE_LOGS__ = []; 'cleared';" })));
console.log(textOf(await call('webview_execute_js', { script: "(() => { const d = window.__FASTFREE_SDUI_DISPATCHER__; return 'probe'; })()" })));

// current step
console.log('--- current step ---');
console.log(textOf(await call('webview_execute_js', { script: "(() => { const s = window.__FASTFREE_CURRENT_STEP__; return JSON.stringify({ step: s ? s.value : null, theme: document.documentElement.getAttribute('data-theme') }); })()" })));

// find the Re-scan Hardware button
console.log('--- find Re-scan Hardware ---');
const found = await call('webview_find_element', { selector: 'Re-scan Hardware', strategy: 'text', limit: 5 });
console.log(textOf(found));

// click it
console.log('--- click Re-scan Hardware ---');
console.log(textOf(await call('webview_interact', { action: 'click', selector: 'Re-scan Hardware', strategy: 'text' })));

await sleep(2500);

// console logs
console.log('--- console logs (all) ---');
console.log(textOf(await call('read_logs', { source: 'console', lines: 60, maxChars: 12000 })));

// dispatcher logs via evaluate
console.log('--- dispatcher logs ---');
const disp = await call('webview_execute_js', {
  script: "(() => { try { const m = Object.keys(window).filter(k => k.indexOf('SDUI') >= 0 || k.indexOf('DISPATCH') >= 0); return JSON.stringify(m); } catch (e) { return 'err:' + e.message; } })()",
});
console.log(textOf(disp));

await client.close();
console.log('done');
