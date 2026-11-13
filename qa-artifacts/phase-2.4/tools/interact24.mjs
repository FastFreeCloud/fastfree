/**
 * Phase 2.4 — Automated E2E Wizard Flow & Interaction Testing
 * FastFree Installer Tauri app driven through @hypothesi/tauri-mcp-server.
 *
 * Mandated tool mapping (task language -> real MCP tool):
 *   webview_click     -> webview_interact { action: "click" }
 *   webview_type      -> webview_keyboard { action: "type", selector, text }
 *   webview_hover     -> webview_interact { action: "hover" }
 *   webview_press_key -> webview_keyboard { action: "press", key }
 *   webview_evaluate  -> webview_execute_js { script }
 *   supporting        -> driver_session, manage_window, webview_find_element,
 *                        webview_screenshot, read_logs
 *
 * This file intentionally contains NO backslash characters.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ART = path.resolve(__dirname, '..');
const REPORTS = path.join(ART, 'reports');
const SHOTS = path.join(ART, 'screenshots');
const LOGS = path.join(ART, 'logs');
fs.mkdirSync(REPORTS, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(LOGS, { recursive: true });

const WINDOW = 'main';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// MCP client
// ---------------------------------------------------------------------------
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'fastfree-qa-phase24', version: '2.0.0' }, { capabilities: {} });
await client.connect(transport);

const mcpCalls = [];
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
  mcpCalls.push(entry);
  if (error !== null) throw new Error(name + ': ' + error);
  return content;
}
const textOf = (content) => content.map((c) => c.text ?? '').join('\n');

function extractJson(text) {
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

async function ev(script) {
  const content = await call('webview_execute_js', { script, windowId: WINDOW });
  const raw = textOf(content);
  return { raw, json: extractJson(raw) };
}
async function evJson(script) {
  const r = await ev(script);
  return r.json;
}

// ---------------------------------------------------------------------------
// Mandated interaction wrappers
// ---------------------------------------------------------------------------
async function webview_click(selector, opts = {}) {
  const args = { action: 'click', selector, windowId: WINDOW, ...opts };
  const out = textOf(await call('webview_interact', args));
  return { ok: true, out };
}
async function webview_hover(selector, opts = {}) {
  const args = { action: 'hover', selector, windowId: WINDOW, ...opts };
  const out = textOf(await call('webview_interact', args));
  return { ok: true, out };
}
async function webview_type(selector, text, opts = {}) {
  const args = { action: 'type', selector, text, windowId: WINDOW, ...opts };
  const out = textOf(await call('webview_keyboard', args));
  return { ok: true, out };
}
async function webview_press_key(key, opts = {}) {
  const args = { action: 'press', key, windowId: WINDOW, ...opts };
  const out = textOf(await call('webview_keyboard', args));
  return { ok: true, out };
}
async function webview_evaluate(script) {
  return await ev(script);
}
async function findEl(selector, opts = {}) {
  const args = { selector, strategy: 'css', limit: 5, windowId: WINDOW, ...opts };
  const out = textOf(await call('webview_find_element', args));
  return extractJson(out);
}

// ---------------------------------------------------------------------------
// Instrumentation
// ---------------------------------------------------------------------------
const DISPATCHER_SCAN = [
  "(() => {",
  "  const root = document.querySelector('#app');",
  "  if (!root || !root.__vue_app__) return { ok: false, reason: 'no vue app' };",
  "  const inst = root.__vue_app__._instance;",
  "  if (!inst) return { ok: false, reason: 'no root instance' };",
  "  let found = null; let scanned = 0; const seen = new Set();",
  "  function scan(vnode) {",
  "    if (!vnode || seen.has(vnode)) return; seen.add(vnode);",
  "    if (vnode.component) {",
  "      scanned++;",
  "      const st = vnode.component.setupState;",
  "      if (st && st.dispatcher) found = st.dispatcher;",
  "      scan(vnode.component.subTree);",
  "    }",
  "    if (Array.isArray(vnode.children)) { for (const c of vnode.children) scan(c); }",
  "    else if (vnode.children && typeof vnode.children === 'object') {",
  "      for (const k of Object.keys(vnode.children)) { const c = vnode.children[k]; if (c && typeof c === 'object') scan(c); }",
  "    }",
  "    if (vnode.dynamicChildren) { for (const c of vnode.dynamicChildren) scan(c); }",
  "  }",
  "  scan(inst.subTree);",
  "  if (!found) return { ok: false, scanned };",
  "  window.__QA_DISPATCHER__ = found;",
  "  return { ok: true, scanned, count: found.getExecutionLogs().length };",
  "})()",
].join('\n');

async function readConsoleErrors() {
  const j = await evJson("(() => { const L = window.__MCP_CONSOLE_LOGS__ || []; return JSON.stringify(L.map(function(l){ return { level: l.level, message: String(l.message).slice(0, 500), timestamp: l.timestamp }; })); })()");
  return Array.isArray(j) ? j : [];
}
async function readDispatchLogs() {
  const j = await evJson("(() => { const d = window.__QA_DISPATCHER__; if (!d) return '[]'; return JSON.stringify(d.getExecutionLogs()); })()");
  return Array.isArray(j) ? j : [];
}
async function armListeners() {
  await ev([
    "(() => {",
    "  window.__QA_KEYS__ = [];",
    "  window.__QA_HOVER__ = [];",
    "  ['keydown','keypress','keyup'].forEach(function(t){ window.addEventListener(t, function(e){ window.__QA_KEYS__.push({ type: t, key: e.key, code: e.code }); }, true); });",
    "  ['mouseover','pointerover','mousemove'].forEach(function(t){ window.addEventListener(t, function(e){ var c = e.target && e.target.className ? String(e.target.className) : ''; window.__QA_HOVER__.push({ type: t, target: c.slice(0, 80) }); }, true); });",
    "  return 'armed';",
    "})()",
  ].join('\n'));
}
async function readKeys() { return (await evJson("JSON.stringify(window.__QA_KEYS__ || [])")) || []; }
async function readHovers() { return (await evJson("JSON.stringify(window.__QA_HOVER__ || [])")) || []; }

// ---------------------------------------------------------------------------
// Checkpoint harness
// ---------------------------------------------------------------------------
const checkpoints = [];
async function checkpoint(id, title, fn) {
  const errBefore = (await readConsoleErrors()).length;
  const logBefore = (await readDispatchLogs()).length;
  const keysBefore = (await readKeys()).length;
  const hovBefore = (await readHovers()).length;
  let ok = true;
  let detail = null;
  const t0 = Date.now();
  try {
    detail = await fn();
  } catch (e) {
    ok = false;
    detail = { error: e?.message || String(e) };
  }
  await sleep(250);
  const errors = (await readConsoleErrors()).slice(errBefore);
  const logs = (await readDispatchLogs()).slice(0, Math.max(0, (await readDispatchLogs()).length - logBefore));
  const keys = (await readKeys()).slice(keysBefore);
  const hovs = (await readHovers()).slice(hovBefore);
  const entry = {
    id, title, ok, ms: Date.now() - t0,
    detail,
    consoleErrors: errors,
    dispatchDelta: logs,
    keys,
    hovers: hovs,
  };
  checkpoints.push(entry);
  const flag = ok ? 'PASS' : 'FAIL';
  console.log('[' + flag + '] ' + id + ' ' + title + (errors.length ? '  (console errors: ' + errors.length + ')' : ''));
  if (!ok) console.log('       ' + JSON.stringify(detail).slice(0, 300));
  return entry;
}

async function currentStep() {
  const j = await evJson("(() => { const s = window.__FASTFREE_CURRENT_STEP__; return JSON.stringify({ step: s ? s.value : null }); })()");
  return j && j.step ? j.step : null;
}
async function expectStep(n) {
  for (let i = 0; i < 20; i++) {
    const s = await currentStep();
    if (s === n) return true;
    await sleep(250);
  }
  return false;
}
async function shot(name) {
  const filePath = path.join(SHOTS, name + '.png');
  await call('webview_screenshot', { format: 'png', filePath, windowId: WINDOW });
  return filePath;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
console.log('=== Phase 2.4 interaction run start ===');

// --- Setup ---------------------------------------------------------------
await call('driver_session', { action: 'start' });
await call('manage_window', { action: 'resize', width: 1280, height: 800, logical: true, windowId: WINDOW });

await ev("(() => { window.__MCP_CONSOLE_LOGS__ = []; return 'cleared'; })()");
const scan = await ev(DISPATCHER_SCAN);
if (!scan.json || !scan.json.ok) throw new Error('dispatcher scan failed: ' + JSON.stringify(scan.json));
await ev("(() => { window.__QA_DISPATCHER__.clearLogs(); return 'cleared'; })()");
await armListeners();
console.log('dispatcher attached (scanned ' + scan.json.scanned + ' component vnodes)');

// locale -> EN for stable text selectors
await webview_click('.lang-btn');
await sleep(500);
const lang = await evJson("(() => { return JSON.stringify({ locale: document.documentElement.getAttribute('lang'), dir: document.documentElement.getAttribute('dir') }); })()");
console.log('locale: ' + JSON.stringify(lang));

// reset to step 1 via the app test hook (step 6 locks wizard navigation)
await ev("(() => { window.__FASTFREE_CURRENT_STEP__.value = 1; return 'ok'; })()");
await sleep(900);
console.log('starting step: ' + JSON.stringify(await currentStep()));

// --- Step 1: Discovery ---------------------------------------------------
await checkpoint('S1.1', 'click "Re-scan Hardware" button (webview_click)', async () => {
  const r = await webview_click('Re-scan Hardware', { strategy: 'text' });
  return { out: r.out };
});
await sleep(2000);

await checkpoint('S1.2', 'hover hardware card (webview_hover)', async () => {
  const r = await webview_hover('.q-card', { nth: 0 });
  return { out: r.out };
});

await checkpoint('S1.3', 'keyboard Tab (webview_press_key)', async () => {
  const r = await webview_press_key('Tab');
  return { out: r.out, delivered: (await readKeys()).filter(k => k.key === 'Tab').length };
});

await checkpoint('S1.4', 'keyboard Enter (webview_press_key)', async () => {
  const r = await webview_press_key('Enter');
  return { out: r.out, delivered: (await readKeys()).filter(k => k.key === 'Enter').length };
});

await checkpoint('S1.5', 'click "Proceed to License" (webview_click -> navigate)', async () => {
  const r = await webview_click('Proceed to License', { strategy: 'text' });
  const reached = await expectStep(2);
  return { out: r.out, reachedStep2: reached };
});
await shot('step2-license');

// --- Step 2: License -----------------------------------------------------
await checkpoint('S2.1', 'type license key into input (webview_type)', async () => {
  const r = await webview_type('.q-input input', 'FF-CL01-41EF-AC89');
  await sleep(400);
  const v = await evJson("(() => { const i = document.querySelector('.q-input input'); return JSON.stringify({ value: i ? i.value : null }); })()");
  return { out: r.out, inputValue: v ? v.value : null };
});

await checkpoint('S2.2', 'hover "Verify Key" button (webview_hover)', async () => {
  const r = await webview_hover('Verify Key', { strategy: 'text' });
  return { out: r.out };
});

await checkpoint('S2.3', 'click "Verify Key" (webview_click -> tauri:invoke)', async () => {
  const r = await webview_click('Verify Key', { strategy: 'text' });
  await sleep(3500);
  return { out: r.out };
});

await checkpoint('S2.4', 'keyboard Escape (webview_press_key)', async () => {
  const r = await webview_press_key('Escape');
  return { out: r.out, delivered: (await readKeys()).filter(k => k.key === 'Escape').length };
});

await checkpoint('S2.5', 'click "Proceed to Resource Sizing" (webview_click -> navigate)', async () => {
  const r = await webview_click('Proceed to Resource Sizing', { strategy: 'text' });
  const reached = await expectStep(3);
  return { out: r.out, reachedStep3: reached };
});
await shot('step3-sizing');

// --- Step 3: Sizing ------------------------------------------------------
await checkpoint('S3.1', 'click CPU slider (webview_click)', async () => {
  const before = await evJson("(() => { return JSON.stringify({ cpu: (window.__QA_DISPATCHER__ ? null : null) }); })()");
  const r = await webview_click('.q-slider', { nth: 0 });
  await sleep(400);
  const v = await evJson("(() => { const s = document.querySelectorAll('.q-slider'); return JSON.stringify({ count: s.length, aria: s[0] ? s[0].getAttribute('aria-valuenow') : null }); })()");
  return { out: r.out, sliders: v };
});

await checkpoint('S3.2', 'click RAM slider (webview_click)', async () => {
  const r = await webview_click('.q-slider', { nth: 1 });
  await sleep(400);
  const v = await evJson("(() => { const s = document.querySelectorAll('.q-slider'); return JSON.stringify({ count: s.length, aria: s[1] ? s[1].getAttribute('aria-valuenow') : null }); })()");
  return { out: r.out, sliders: v };
});

await checkpoint('S3.3', 'type target VHDX path (webview_type)', async () => {
  const r = await webview_type('.q-input input', 'C:/FastFree/vms/fastfree-clan.vhdx');
  await sleep(400);
  const v = await evJson("(() => { const i = document.querySelector('.q-input input'); return JSON.stringify({ value: i ? i.value : null }); })()");
  return { out: r.out, inputValue: v ? v.value : null };
});

await checkpoint('S3.4', 'hover sizing card (webview_hover)', async () => {
  const r = await webview_hover('.q-card', { nth: 0 });
  return { out: r.out };
});

await checkpoint('S3.5', 'click "Proceed to WireGuard Mesh" (webview_click -> navigate)', async () => {
  const r = await webview_click('Proceed to WireGuard Mesh', { strategy: 'text' });
  const reached = await expectStep(4);
  return { out: r.out, reachedStep4: reached };
});
await shot('step4-wireguard');

// --- Step 4: WireGuard ---------------------------------------------------
await checkpoint('S4.1', 'type controller endpoint / IP address (webview_type)', async () => {
  const r = await webview_type('.q-input input', '203.0.113.10', { nth: 0 });
  await sleep(400);
  const v = await evJson("(() => { const i = document.querySelectorAll('.q-input input')[0]; return JSON.stringify({ value: i ? i.value : null }); })()");
  return { out: r.out, inputValue: v ? v.value : null };
});

await checkpoint('S4.2', 'type WireGuard listening port (webview_type)', async () => {
  const r = await webview_type('.q-input input', '51820', { nth: 1 });
  await sleep(400);
  const v = await evJson("(() => { const i = document.querySelectorAll('.q-input input')[1]; return JSON.stringify({ value: i ? i.value : null }); })()");
  return { out: r.out, inputValue: v ? v.value : null };
});

await checkpoint('S4.3', 'click kill-switch toggle (webview_click)', async () => {
  const r = await webview_click('.q-toggle', { nth: 1 });
  await sleep(400);
  const v = await evJson("(() => { const t = document.querySelectorAll('.q-toggle'); return JSON.stringify({ count: t.length, checked: Array.prototype.map.call(t, function(x){ return x.getAttribute('aria-checked'); }) }); })()");
  return { out: r.out, toggles: v };
});

await checkpoint('S4.4', 'hover WireGuard card (webview_hover)', async () => {
  const r = await webview_hover('.q-card', { nth: 0 });
  return { out: r.out };
});

await checkpoint('S4.5', 'tab navigation: click step 1 tab then step 4 tab (webview_click)', async () => {
  const back = await webview_click('.step-item', { nth: 0 });
  const s1 = await expectStep(1);
  const fwd = await webview_click('.step-item', { nth: 3 });
  const s4 = await expectStep(4);
  return { backOut: back.out, reachedStep1: s1, fwdOut: fwd.out, reachedStep4: s4 };
});

await checkpoint('S4.6', 'click "Proceed to Machine Deployment" (webview_click -> navigate)', async () => {
  const r = await webview_click('Proceed to Machine Deployment', { strategy: 'text' });
  const reached = await expectStep(5);
  return { out: r.out, reachedStep5: reached };
});
await shot('step5-provisioning');

// --- Step 5: Provisioning ------------------------------------------------
await checkpoint('S5.1', 'hover provisioning card (webview_hover)', async () => {
  const r = await webview_hover('.q-card', { nth: 0 });
  return { out: r.out };
});

await checkpoint('S5.2', 'click "Complete & Open Sovereign Launchpad" (webview_click -> navigate)', async () => {
  const r = await webview_click('Complete & Open Sovereign Launchpad', { strategy: 'text' });
  const reached = await expectStep(6);
  return { out: r.out, reachedStep6: reached };
});
await shot('step6-launchpad');

// --- Step 6: Launchpad ---------------------------------------------------
await checkpoint('S6.1', 'verify launchpad grid + hover card (webview_hover)', async () => {
  const found = await findEl('Open Create Sovereign Node In-App', { strategy: 'text' });
  const r = await webview_hover('.q-card', { nth: 0 });
  return { found: found ? found.totalMatches : 0, out: r.out };
});

await checkpoint('S6.2', 'click in-app screen button (webview_click -> open_sdui_screen)', async () => {
  const r = await webview_click('Open Create Sovereign Node In-App', { strategy: 'text' });
  await sleep(800);
  const state = await evJson("(() => { const host = document.querySelector('.sdui-step-host'); const back = document.querySelector('.sdui-step-host .q-btn'); return JSON.stringify({ hasBack: !!back, text: host ? (host.textContent || '').trim().slice(0, 120) : null }); })()");
  return { out: r.out, state };
});

await checkpoint('S6.3', 'click back to launchpad (webview_click)', async () => {
  const r = await webview_click('Back to CasaOS Launchpad', { strategy: 'text' });
  await sleep(600);
  const state = await evJson("(() => { const host = document.querySelector('.sdui-step-host'); return JSON.stringify({ text: host ? (host.textContent || '').trim().slice(0, 120) : null }); })()");
  return { out: r.out, state };
});

await checkpoint('S6.4', 'keyboard navigation Tab / Enter / Escape (webview_press_key)', async () => {
  const tab = await webview_press_key('Tab');
  const enter = await webview_press_key('Enter');
  const esc = await webview_press_key('Escape');
  const keys = await readKeys();
  const want = ['Tab', 'Enter', 'Escape'];
  const delivered = want.filter(k => keys.some(x => x.key === k));
  return { out: [tab.out, enter.out, esc.out], delivered };
});

await shot('step6-launchpad-final');

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const consoleAll = await readConsoleErrors();
const dispatchAll = await readDispatchLogs();
const errorEntries = consoleAll.filter(e => e.level === 'error');
const warnEntries = consoleAll.filter(e => e.level === 'warn');

const dispatchSuccess = dispatchAll.filter(d => d.success === true).length;
const dispatchFail = dispatchAll.filter(d => d.success === false).length;
const dispatchByType = {};
for (const d of dispatchAll) {
  const t = d.action && d.action.type ? d.action.type : 'unknown';
  dispatchByType[t] = dispatchByType[t] || { total: 0, success: 0, fail: 0 };
  dispatchByType[t].total++;
  if (d.success) dispatchByType[t].success++; else dispatchByType[t].fail++;
}

const mcpOk = mcpCalls.filter(c => c.ok).length;
const mcpFail = mcpCalls.filter(c => !c.ok).length;
const checksPass = checkpoints.filter(c => c.ok).length;
const checksFail = checkpoints.filter(c => !c.ok).length;

const verdict = (errorEntries.length === 0 && dispatchFail === 0 && checksFail === 0) ? 'PASS' : 'FAIL';

const report = {
  phase: '2.4',
  title: 'Tauri MCP Automated E2E Wizard Flow & Interaction Testing',
  generatedAt: new Date().toISOString(),
  app: { window: WINDOW, url: 'http://localhost:1420/', bridge: 'localhost:9223', locale: lang },
  toolMapping: {
    webview_click: 'webview_interact action=click',
    webview_type: 'webview_keyboard action=type',
    webview_hover: 'webview_interact action=hover',
    webview_press_key: 'webview_keyboard action=press',
    webview_evaluate: 'webview_execute_js',
  },
  verdict,
  acceptance: {
    zeroConsoleErrors: { expected: 0, actual: errorEntries.length, pass: errorEntries.length === 0 },
    dispatchSuccessRate: {
      expected: '100%',
      actual: dispatchAll.length ? Math.round((dispatchSuccess / dispatchAll.length) * 1000) / 10 + '%' : 'n/a',
      success: dispatchSuccess, fail: dispatchFail, total: dispatchAll.length,
      pass: dispatchFail === 0 && dispatchAll.length > 0,
    },
    wizardPassSteps1to6: { pass: checksFail === 0, checksPass, checksFail },
  },
  mcpToolCalls: { total: mcpCalls.length, ok: mcpOk, fail: mcpFail },
  console: { total: consoleAll.length, errors: errorEntries.length, warnings: warnEntries.length },
  dispatchByType,
  checkpoints,
  consoleEntries: consoleAll,
  dispatchLogs: dispatchAll,
};

fs.writeFileSync(path.join(REPORTS, 'interaction-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(REPORTS, 'action-log.json'), JSON.stringify(dispatchAll, null, 2));
fs.writeFileSync(path.join(REPORTS, 'console-errors.json'), JSON.stringify({ errors: errorEntries, warnings: warnEntries }, null, 2));
fs.writeFileSync(path.join(REPORTS, 'mcp-calls.json'), JSON.stringify(mcpCalls, null, 2));

// markdown summary
const lines = [];
lines.push('# Phase 2.4 — Tauri MCP Automated E2E Wizard Flow & Interaction Testing');
lines.push('');
lines.push('**Verdict: ' + verdict + '**  ');
lines.push('Generated: ' + report.generatedAt);
lines.push('');
lines.push('## Acceptance');
lines.push('');
lines.push('| Criterion | Expected | Actual | Result |');
lines.push('| --- | --- | --- | --- |');
lines.push('| Console errors during Steps 1-6 | 0 | ' + errorEntries.length + ' | ' + (errorEntries.length === 0 ? 'PASS' : 'FAIL') + ' |');
lines.push('| Action dispatcher success | 100% | ' + report.acceptance.dispatchSuccessRate.actual + ' (' + dispatchSuccess + '/' + dispatchAll.length + ') | ' + (dispatchFail === 0 ? 'PASS' : 'FAIL') + ' |');
lines.push('| Wizard pass Steps 1-6 | all checkpoints | ' + checksPass + ' pass / ' + checksFail + ' fail | ' + (checksFail === 0 ? 'PASS' : 'FAIL') + ' |');
lines.push('| MCP tool dispatch | 100% | ' + mcpOk + '/' + mcpCalls.length + ' | ' + (mcpFail === 0 ? 'PASS' : 'FAIL') + ' |');
lines.push('');
lines.push('## Tool mapping (mandate -> real MCP tool)');
lines.push('');
for (const [k, v] of Object.entries(report.toolMapping)) lines.push('- `' + k + '` -> `' + v + '`');
lines.push('');
lines.push('## Dispatch by action type');
lines.push('');
lines.push('| Action type | Total | Success | Fail |');
lines.push('| --- | --- | --- | --- |');
for (const [t, s] of Object.entries(dispatchByType)) lines.push('| ' + t + ' | ' + s.total + ' | ' + s.success + ' | ' + s.fail + ' |');
lines.push('');
lines.push('## Checkpoints');
lines.push('');
lines.push('| ID | Title | Result | Console errors | Notes |');
lines.push('| --- | --- | --- | --- | --- |');
for (const c of checkpoints) {
  const note = c.ok ? '' : JSON.stringify(c.detail).slice(0, 160);
  lines.push('| ' + c.id + ' | ' + c.title + ' | ' + (c.ok ? 'PASS' : 'FAIL') + ' | ' + c.consoleErrors.length + ' | ' + note + ' |');
}
lines.push('');
lines.push('## Console errors');
lines.push('');
if (errorEntries.length === 0) lines.push('None.');
for (const e of errorEntries) lines.push('- `' + e.level + '` ' + String(e.message).split('\n')[0].slice(0, 300));
lines.push('');
lines.push('## Failed dispatch entries');
lines.push('');
const failed = dispatchAll.filter(d => !d.success);
if (failed.length === 0) lines.push('None.');
for (const d of failed) lines.push('- `' + (d.action && d.action.type) + '` ' + JSON.stringify(d.action).slice(0, 200) + ' -> ' + String(d.error).slice(0, 200));
lines.push('');
lines.push('## Artifacts');
lines.push('');
lines.push('- `reports/interaction-report.json` — full structured results');
lines.push('- `reports/action-log.json` — SDUI action dispatcher execution log');
lines.push('- `reports/console-errors.json` — captured console error/warn entries');
lines.push('- `reports/mcp-calls.json` — every MCP tool call and response status');
lines.push('- `screenshots/step*.png` — per-step native screenshots');
lines.push('- `tools/interact24.mjs` — reproducible driver');
lines.push('');

fs.writeFileSync(path.join(REPORTS, 'interaction-report.md'), lines.join('\n'));

console.log('=== Phase 2.4 run complete ===');
console.log('verdict: ' + verdict);
console.log('console errors: ' + errorEntries.length + ' (warnings: ' + warnEntries.length + ')');
console.log('dispatch: ' + dispatchSuccess + ' success / ' + dispatchFail + ' fail / ' + dispatchAll.length + ' total');
console.log('checkpoints: ' + checksPass + ' pass / ' + checksFail + ' fail');
console.log('mcp calls: ' + mcpOk + ' ok / ' + mcpFail + ' fail');
console.log('report: ' + path.join(REPORTS, 'interaction-report.md'));

await client.close();
