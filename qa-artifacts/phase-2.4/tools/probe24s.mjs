/**
 * Phase 2.4 probe S - restore window, reload, dump every step's live interactive DOM.
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
const client = new Client({ name: 'qa-probeS', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

const log = [];
function say(...args) { const l = args.join(' '); console.log(l); log.push(l); }
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await call('driver_session', { action: 'start' });

// 1. restore window
say('=== WINDOW RESTORE ===');
say(textOf(await call('manage_window', { action: 'focus', windowId: 'main' })).slice(0, 200));
await sleep(300);
say(textOf(await call('manage_window', { action: 'resize', width: 1280, height: 800, logical: true, windowId: 'main' })).slice(0, 200));
await sleep(800);
say('info: ' + textOf(await call('manage_window', { action: 'info', windowId: 'main' })).slice(0, 400));

// 2. reload for clean state
try { await call('webview_execute_js', { script: "(() => { window.location.reload(); return 1; })()", windowId: 'main' }); } catch (e) { say('reload err: ' + e.message); }
await sleep(9000);

// 3. state after reload
const stateScript = "(() => { const s = window.__FASTFREE_CURRENT_STEP__; return JSON.stringify({ step: s ? s.value : null, lang: document.documentElement.getAttribute('lang'), theme: document.documentElement.getAttribute('data-theme'), ready: document.readyState, winW: window.innerWidth, winH: window.innerHeight }); })()";
say('=== AFTER RELOAD ===');
say(textOf(await call('webview_execute_js', { script: stateScript, windowId: 'main' })));

// 4. dispatcher scan
const scanScript = [
  "(() => {",
  "  const root = document.querySelector('#app');",
  "  if (!root || !root.__vue_app__) return JSON.stringify({ ok: false, reason: 'no vue app' });",
  "  const inst = root.__vue_app__._instance;",
  "  let found = null; let scanned = 0; const seen = new Set();",
  "  function scan(vnode) {",
  "    if (!vnode || seen.has(vnode)) return; seen.add(vnode);",
  "    if (vnode.component) { scanned++; const st = vnode.component.setupState; if (st && st.dispatcher) found = st.dispatcher; scan(vnode.component.subTree); }",
  "    if (Array.isArray(vnode.children)) { for (const c of vnode.children) scan(c); }",
  "    else if (vnode.children && typeof vnode.children === 'object') { for (const k of Object.keys(vnode.children)) { const c = vnode.children[k]; if (c && typeof c === 'object') scan(c); } }",
  "    if (vnode.dynamicChildren) { for (const c of vnode.dynamicChildren) scan(c); }",
  "  }",
  "  scan(inst.subTree);",
  "  if (!found) return JSON.stringify({ ok: false, scanned });",
  "  window.__QA_DISPATCHER__ = found;",
  "  return JSON.stringify({ ok: true, scanned, count: found.getExecutionLogs().length });",
  "})()"
].join('\n');
say('=== DISPATCHER SCAN ===');
say(textOf(await call('webview_execute_js', { script: scanScript, windowId: 'main' })));

// 5. per-step inventory
const dump = "(() => { const q = (s) => Array.prototype.slice.call(document.querySelectorAll(s)); const m = (el) => (el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 50); const btn = q('.q-btn').map(function(b){ const r = b.getBoundingClientRect(); return { text: m(b), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0 }; }); const inp = q('.q-input input').map(function(i){ return { value: i.value, placeholder: i.placeholder, type: i.type }; }); const sld = q('.q-slider').map(function(s){ return { now: s.getAttribute('aria-valuenow'), min: s.getAttribute('aria-valuemin'), max: s.getAttribute('aria-valuemax'), label: m(s.parentElement || s).slice(0, 40) }; }); const tgl = q('.q-toggle').map(function(t){ return { checked: t.getAttribute('aria-checked'), label: m(t.parentElement || t).slice(0, 50) }; }); const steps = q('.step-item').map(function(s){ return { text: m(s), active: s.className.indexOf('active') >= 0 }; }); const tabs = q('.q-tab').map(m); const cards = q('.q-card').length; const host = document.querySelector('.sdui-step-host'); return JSON.stringify({ step: window.__FASTFREE_CURRENT_STEP__.value, buttons: btn, inputs: inp, sliders: sld, toggles: tgl, stepItems: steps, tabs: tabs, cards: cards, hostText: host ? m(host).slice(0, 120) : null }); })()";

for (let n = 1; n <= 6; n++) {
  await call('webview_execute_js', { script: "(() => { window.__FASTFREE_CURRENT_STEP__.value = " + n + "; return 1; })()", windowId: 'main' });
  await sleep(2500);
  say('===== STEP ' + n + ' =====');
  say(textOf(await call('webview_execute_js', { script: dump, windowId: 'main' })));
}

// 6. console errors since reload
say('=== CONSOLE ERRORS (all) ===');
say(textOf(await call('read_logs', { source: 'console', level: 'error', lines: 30 })).slice(0, 800));
say('=== CONSOLE WARNINGS (last 10) ===');
say(textOf(await call('read_logs', { source: 'console', level: 'warn', lines: 10 })).slice(0, 1200));

await client.close();
fs.mkdirSync(path.join(__dirname, '..', 'logs'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'logs', 'probeS.log'), log.join('\n'), 'utf8');
console.log('done');
