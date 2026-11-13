/**
 * Phase 2.3 — Automated Visual Inspection & Layout Audit (refined)
 * Drives the FastFree Installer Tauri app through @hypothesi/tauri-mcp-server
 * using the mandated MCP tools: webview_screenshot, manage_window (get_window_info /
 * set_window_size equivalents), webview_execute_js.
 *
 * NOTE: this file intentionally contains no backslash characters so it can be
 * written/verified without shell or JSON escaping hazards.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(__dirname, '..');
const shotDir = path.join(outRoot, 'screenshots');
const reportDir = path.join(outRoot, 'reports');
fs.mkdirSync(shotDir, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

const THEMES = ['dark', 'light', 'oled-black'];
const RESOLUTIONS = [
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1920x1080', width: 1920, height: 1080 },
];
const STEPS = [1, 2, 3, 4, 5, 6];
const DEFAULT_WINDOW = { width: 1180, height: 780 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'fastfree-qa-phase23', version: '2.0.0' }, { capabilities: {} });
await client.connect(transport);

const mcpLog = [];
async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  const content = res.content ?? [];
  mcpLog.push({ tool: name, args: args, content: content });
  return content;
}
const textOf = (content) => content.map((c) => c.text ?? '').join('\n');
function parseJsonText(t) {
  if (!t) return null;
  const s = String(t);
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* ignore */ }
  }
  return null;
}
async function toolJson(name, args) {
  const content = await call(name, args);
  const raw = textOf(content);
  return { raw: raw, parsed: parseJsonText(raw), content: content };
}

function setThemeScript(target) {
  return "(() => { var b = document.querySelector('.theme-btn'); if (!b) return { ok: false, reason: 'no theme button' }; var t = 0; while (document.documentElement.getAttribute('data-theme') !== " + JSON.stringify(target) + " && t < 4) { b.click(); t++; } return { ok: document.documentElement.getAttribute('data-theme') === " + JSON.stringify(target) + ", theme: document.documentElement.getAttribute('data-theme'), tries: t }; })()";
}
function setStepScript(step) {
  return "(() => { if (!window.__FASTFREE_CURRENT_STEP__) return { ok: false, reason: 'no step bridge' }; window.__FASTFREE_CURRENT_STEP__.value = " + step + "; return { ok: true, step: window.__FASTFREE_CURRENT_STEP__.value }; })()";
}

const METRICS_SCRIPT = [
  "(() => {",
  "  function parseRgb(s) {",
  "    s = String(s || '');",
  "    var i = s.indexOf('(');",
  "    var j = s.indexOf(')');",
  "    if (i < 0 || j < 0) return null;",
  "    var p = s.slice(i + 1, j).split(',').map(Number);",
  "    if (p.length < 3 || p.some(function(v){ return isNaN(v); })) return null;",
  "    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };",
  "  }",
  "  function lum(c) {",
  "    function f(v){ v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }",
  "    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);",
  "  }",
  "  function effBg(el) {",
  "    var layers = [];",
  "    var e = el;",
  "    while (e) { var c = parseRgb(getComputedStyle(e).backgroundColor); if (c) layers.push(c); e = e.parentElement; }",
  "    var out = { r: 0, g: 0, b: 0, a: 0 };",
  "    for (var i = layers.length - 1; i >= 0; i--) {",
  "      var L = layers[i];",
  "      out.r = L.r * L.a + out.r * (1 - L.a);",
  "      out.g = L.g * L.a + out.g * (1 - L.a);",
  "      out.b = L.b * L.a + out.b * (1 - L.a);",
  "      out.a = L.a + out.a * (1 - L.a);",
  "    }",
  "    if (out.a < 0.01) { out.r = 255; out.g = 255; out.b = 255; out.a = 1; }",
  "    return out;",
  "  }",
  "  function ratio(fg, bg) {",
  "    var L1 = lum(fg); var L2 = lum(bg);",
  "    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);",
  "  }",
  "  function rectOf(el) {",
  "    var r = el.getBoundingClientRect();",
  "    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) };",
  "  }",
  "  function isIcon(el) {",
  "    var cls = String(el.className || '');",
  "    var ff = String(getComputedStyle(el).fontFamily || '');",
  "    return cls.indexOf('material-icons') >= 0 || cls.indexOf('q-icon') >= 0 || cls.indexOf('icon') >= 0 || ff.indexOf('Material') >= 0 || ff.indexOf('Icons') >= 0;",
  "  }",
  "  var doc = document.documentElement;",
  "  var innerW = window.innerWidth; var innerH = window.innerHeight;",
  "  var cw = document.querySelector('.content-wrapper');",
  "  var cwStyle = cw ? getComputedStyle(cw) : null;",
  "  var glassSelectors = ['.titlebar', '.sdui-screen-wrapper', '.q-card', '.q-banner', '.step-progress', '.content-wrapper'];",
  "  var glass = [];",
  "  glassSelectors.forEach(function(sel) {",
  "    document.querySelectorAll(sel).forEach(function(el, i) {",
  "      if (i >= 4) return;",
  "      var cs = getComputedStyle(el);",
  "      glass.push({ selector: sel, backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || 'none', backgroundColor: cs.backgroundColor, borderColor: cs.borderTopColor, borderWidth: cs.borderTopWidth, borderStyle: cs.borderTopStyle, boxShadow: cs.boxShadow === 'none' ? 'none' : 'present', borderRadius: cs.borderRadius, rect: rectOf(el) });",
  "    });",
  "  });",
  "  var textEls = Array.prototype.slice.call(document.querySelectorAll('.sdui-screen-wrapper, .sdui-screen-wrapper *'))",
  "    .filter(function(el) {",
  "      if (el.children.length !== 0) return false;",
  "      if (!el.textContent || !el.textContent.trim()) return false;",
  "      if (isIcon(el)) return false;",
  "      var r = el.getBoundingClientRect();",
  "      if (r.width < 1 || r.height < 1) return false;",
  "      return true;",
  "    }).slice(0, 40);",
  "  var textSamples = textEls.map(function(el) {",
  "    var cs = getComputedStyle(el);",
  "    var fg = parseRgb(cs.color) || { r: 0, g: 0, b: 0, a: 1 };",
  "    var bg = effBg(el);",
  "    var size = parseFloat(cs.fontSize) || 16;",
  "    var weight = parseInt(cs.fontWeight) || 400;",
  "    var large = size >= 18.66 || (weight >= 700 && size >= 14);",
  "    var cr = ratio(fg, bg);",
  "    return { text: el.textContent.trim().slice(0, 40), color: cs.color, bg: 'rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ')', fontSize: cs.fontSize, fontWeight: cs.fontWeight, contrast: Math.round(cr * 100) / 100, large: large, passesAA: large ? cr >= 3 : cr >= 4.5, rect: rectOf(el) };",
  "  });",
  "  var overflowing = [];",
  "  var maxBottom = 0;",
  "  Array.prototype.slice.call(document.querySelectorAll('.content-wrapper *')).forEach(function(el) {",
  "    var r = el.getBoundingClientRect();",
  "    if (r.width < 1 || r.height < 1) return;",
  "    if (r.bottom > maxBottom) maxBottom = r.bottom;",
  "    var hClip = r.right > innerW + 1 || r.left < -1;",
  "    var vClip = r.bottom > innerH + 1;",
  "    if (hClip || vClip) {",
  "      if (overflowing.length < 12) overflowing.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 60), rect: rectOf(el), horizontal: hClip, vertical: vClip });",
  "    }",
  "  });",
  "  var keyEls = Array.prototype.slice.call(document.querySelectorAll('.titlebar-tools, .window-controls, .step-progress, .sdui-screen-wrapper, .q-card, button'))",
  "    .map(function(el) { return { el: el, r: el.getBoundingClientRect() }; })",
  "    .filter(function(o) { return o.r.width > 0 && o.r.height > 0; });",
  "  var overlaps = [];",
  "  for (var i = 0; i < keyEls.length; i++) {",
  "    for (var j = i + 1; j < keyEls.length; j++) {",
  "      var A = keyEls[i].r; var B = keyEls[j].r;",
  "      var ox = Math.min(A.right, B.right) - Math.max(A.left, B.left);",
  "      var oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);",
  "      if (ox > 2 && oy > 2) {",
  "        var ae = keyEls[i].el; var be = keyEls[j].el;",
  "        if (ae.contains(be) || be.contains(ae)) continue;",
  "        overlaps.push({ a: String(ae.className || ae.tagName).slice(0, 40), b: String(be.className || be.tagName).slice(0, 40), ox: Math.round(ox), oy: Math.round(oy) });",
  "      }",
  "    }",
  "  }",
  "  return {",
  "    theme: doc.getAttribute('data-theme'),",
  "    step: window.__FASTFREE_CURRENT_STEP__ ? window.__FASTFREE_CURRENT_STEP__.value : null,",
  "    dir: doc.getAttribute('dir'), lang: doc.getAttribute('lang'),",
  "    dpr: window.devicePixelRatio,",
  "    innerW: innerW, innerH: innerH, outerW: window.outerWidth, outerH: window.outerHeight,",
  "    scrollW: doc.scrollWidth, scrollH: doc.scrollHeight,",
  "    screenW: screen.width, screenH: screen.height, availW: screen.availWidth, availH: screen.availHeight,",
  "    horizontalOverflow: doc.scrollWidth > innerW + 1,",
  "    contentWrapperOverflow: cwStyle ? (cwStyle.overflow + ' / ' + cwStyle.overflowY) : 'missing',",
  "    contentWrapperRect: cw ? rectOf(cw) : null,",
  "    maxContentBottom: Math.round(maxBottom),",
  "    glass: glass,",
  "    textSamples: textSamples,",
  "    overflowing: overflowing,",
  "    overlaps: overlaps.slice(0, 20),",
  "    title: document.title",
  "  };",
  "})()",
].join('\n');

function pngSize(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.readUInt32BE(0) === 0x89504e47) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
  } catch { /* ignore */ }
  return null;
}

const startedAt = new Date().toISOString();
const results = [];
const toolManifest = (await client.listTools()).tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));

const session = await toolJson('driver_session', { action: 'start' });
const windows = await toolJson('manage_window', { action: 'list' });
const backend = await toolJson('ipc_get_backend_state', {});

function evaluate(entry) {
  const issues = [];
  const m = entry.metrics;
  if (m) {
    if (m.theme !== entry.theme) issues.push({ category: 'theme', severity: 'high', detail: 'requested ' + entry.theme + ' but DOM reports ' + m.theme });
    if (m.step !== entry.step) issues.push({ category: 'step', severity: 'high', detail: 'requested step ' + entry.step + ' but app reports ' + m.step });
    const dpr = m.dpr || 1;
    if (Math.abs(m.innerW - entry.requested.width) > 2 || Math.abs(m.innerH - entry.requested.height) > 2) {
      issues.push({ category: 'dimensions', severity: 'high', detail: 'requested ' + entry.requested.width + 'x' + entry.requested.height + ', viewport is ' + m.innerW + 'x' + m.innerH + ' (dpr ' + dpr + ')' });
    }
    if (Math.abs(m.outerW - m.innerW) > 40 || Math.abs(m.outerH - m.innerH) > 40) {
      issues.push({ category: 'dimensions', severity: 'low', detail: 'outer ' + m.outerW + 'x' + m.outerH + ' vs inner ' + m.innerW + 'x' + m.innerH });
    }
    const panels = m.glass.filter((g) => g.selector === '.sdui-screen-wrapper' || g.selector === '.q-card' || g.selector === '.q-banner');
    const noBlur = panels.filter((g) => !(g.backdropFilter || '').includes('blur('));
    if (panels.length === 0) issues.push({ category: 'glassmorphism', severity: 'medium', detail: 'no glass panels found' });
    else if (noBlur.length > 0) issues.push({ category: 'glassmorphism', severity: 'medium', detail: noBlur.length + '/' + panels.length + ' glass panels lack backdrop blur (e.g. ' + noBlur[0].selector + ': ' + noBlur[0].backdropFilter + ')' });
    const noBorder = panels.filter((g) => (parseFloat(g.borderWidth) || 0) < 1 || g.borderStyle === 'none' || !g.borderColor);
    if (panels.length > 0 && noBorder.length > 0) issues.push({ category: 'glassmorphism', severity: 'low', detail: noBorder.length + '/' + panels.length + ' glass panels lack a visible border' });
    const failing = m.textSamples.filter((t) => !t.passesAA);
    if (failing.length > 0) {
      const worst = failing.slice().sort((a, b) => a.contrast - b.contrast)[0];
      issues.push({ category: 'contrast', severity: worst.contrast < 2 ? 'high' : 'medium', detail: failing.length + '/' + m.textSamples.length + ' text samples below WCAG AA; worst ' + worst.contrast + ' (' + worst.color + ' on ' + worst.bg + ') "' + worst.text + '"' });
    }
    if (m.horizontalOverflow) issues.push({ category: 'clipping', severity: 'high', detail: 'horizontal overflow: scrollWidth ' + m.scrollW + ' > viewport ' + m.innerW });
    const hClipped = m.overflowing.filter((o) => o.horizontal);
    const vClipped = m.overflowing.filter((o) => o.vertical);
    if (hClipped.length > 0) issues.push({ category: 'clipping', severity: 'high', detail: hClipped.length + ' elements exceed horizontal viewport bounds (e.g. ' + hClipped[0].tag + '.' + hClipped[0].cls + ')' });
    if (vClipped.length > 0) {
      const noScroll = m.scrollH <= m.innerH + 1;
      issues.push({ category: 'clipping', severity: noScroll ? 'high' : 'low', detail: vClipped.length + ' elements extend below viewport (max bottom ' + m.maxContentBottom + ' > ' + m.innerH + '); content-wrapper overflow: ' + m.contentWrapperOverflow + (noScroll ? ' [NO SCROLL POSSIBLE]' : ' [scrollable]') });
    }
    if (m.overlaps.length > 0) issues.push({ category: 'overlap', severity: 'high', detail: m.overlaps.length + ' non-nested overlaps (e.g. ' + m.overlaps[0].a + ' x ' + m.overlaps[0].b + ' ' + m.overlaps[0].ox + 'x' + m.overlaps[0].oy + ')' });
  }
  if (!entry.screenshotPath || !fs.existsSync(entry.screenshotPath)) issues.push({ category: 'screenshot', severity: 'high', detail: 'screenshot file missing' });
  else if (!entry.screenshotDimensions || !entry.screenshotDimensions.w) issues.push({ category: 'screenshot', severity: 'high', detail: 'screenshot dimensions unreadable' });
  const status = issues.length === 0 ? 'pass' : (issues.some((i) => i.severity === 'high') ? 'fail' : 'warn');
  return { status: status, issues: issues };
}

async function auditPoint(resolution, theme, step) {
  await toolJson('manage_window', { action: 'resize', windowId: 'main', width: resolution.width, height: resolution.height, logical: true });
  await sleep(450);
  await toolJson('webview_execute_js', { script: setThemeScript(theme), windowId: 'main' });
  await sleep(250);
  await toolJson('webview_execute_js', { script: setStepScript(step), windowId: 'main' });
  await sleep(950);
  const info = await toolJson('manage_window', { action: 'info', windowId: 'main' });
  const metrics = await toolJson('webview_execute_js', { script: METRICS_SCRIPT, windowId: 'main' });
  const fileName = 'step' + step + '-' + theme + '-' + resolution.name + '.png';
  const filePath = path.join(shotDir, fileName);
  const shot = await toolJson('webview_screenshot', { format: 'png', filePath: filePath, windowId: 'main' });
  const entry = {
    resolution: resolution.name,
    requested: { width: resolution.width, height: resolution.height },
    theme: theme,
    step: step,
    window: info.parsed || null,
    metrics: metrics.parsed || null,
    screenshot: shot.raw.trim(),
    screenshotPath: fs.existsSync(filePath) ? filePath : null,
    screenshotDimensions: pngSize(filePath),
    raw: { info: info.raw, metrics: metrics.raw, screenshot: shot.raw },
  };
  const ev = evaluate(entry);
  entry.status = ev.status;
  entry.issues = ev.issues;
  results.push(entry);
  console.log('[' + entry.status.toUpperCase() + '] ' + resolution.name + ' ' + theme + ' step' + step + ' -> ' + fileName + (ev.issues.length ? ' :: ' + ev.issues.map((i) => i.category).join(',') : ''));
  return entry;
}

await toolJson('manage_window', { action: 'resize', windowId: 'main', width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height, logical: true });
await sleep(500);

for (const resolution of RESOLUTIONS) {
  for (const theme of THEMES) {
    for (const step of STEPS) {
      try {
        await auditPoint(resolution, theme, step);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log('[ERROR] ' + resolution.name + ' ' + theme + ' step' + step + ' :: ' + msg);
        results.push({ resolution: resolution.name, requested: { width: resolution.width, height: resolution.height }, theme: theme, step: step, error: msg, status: 'error', issues: [{ category: 'harness', severity: 'high', detail: msg }] });
      }
    }
  }
}

await toolJson('manage_window', { action: 'resize', windowId: 'main', width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height, logical: true });

const endedAt = new Date().toISOString();
const summary = {
  total: results.length,
  pass: results.filter((r) => r.status === 'pass').length,
  warn: results.filter((r) => r.status === 'warn').length,
  fail: results.filter((r) => r.status === 'fail').length,
  error: results.filter((r) => r.status === 'error').length,
  screenshotsCaptured: results.filter((r) => r.screenshotPath).length,
  issuesByCategory: {},
  clippingByStep: {},
  contrastFailuresByTheme: {},
};
for (const r of results) {
  for (const i of r.issues || []) summary.issuesByCategory[i.category] = (summary.issuesByCategory[i.category] || 0) + 1;
  if (r.metrics) {
    const clipped = (r.metrics.overflowing || []).some((o) => o.vertical);
    if (clipped) summary.clippingByStep[r.step] = (summary.clippingByStep[r.step] || 0) + 1;
    const failing = (r.metrics.textSamples || []).filter((t) => !t.passesAA).length;
    if (failing > 0) summary.contrastFailuresByTheme[r.theme] = (summary.contrastFailuresByTheme[r.theme] || 0) + 1;
  }
}

const report = {
  meta: {
    phase: '2.3',
    title: 'Tauri MCP Automated Visual Inspection & Layout Audit',
    generatedAt: startedAt,
    completedAt: endedAt,
    app: backend.parsed || null,
    session: session.parsed || session.raw,
    windows: windows.parsed || null,
    matrix: { themes: THEMES, resolutions: RESOLUTIONS, steps: STEPS, totalCombinations: THEMES.length * RESOLUTIONS.length * STEPS.length },
    mcpTools: toolManifest.map((t) => t.name),
    method: {
      screenshotTool: 'webview_screenshot (native WebView2 CapturePreview, PNG, saved to disk)',
      windowInfoTool: 'manage_window action=info (get_window_info)',
      windowResizeTool: 'manage_window action=resize (set_window_size equivalent, logical pixels)',
      themeControl: 'webview_execute_js clicking .theme-btn (cycles dark -> light -> oled-black)',
      stepControl: 'webview_execute_js setting window.__FASTFREE_CURRENT_STEP__.value',
      contrastMethod: 'computed style color vs alpha-composited ancestor background, WCAG 2.1 relative luminance',
      clippingMethod: 'getBoundingClientRect vs viewport; content-wrapper computed overflow',
    },
  },
  toolManifest: toolManifest,
  summary: summary,
  results: results,
};

fs.writeFileSync(path.join(reportDir, 'audit-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportDir, 'mcp-session.json'), JSON.stringify(mcpLog, null, 2));

const md = [];
md.push('# Phase 2.3 — Tauri MCP Automated Visual Inspection & Layout Audit');
md.push('');
md.push('- Generated: ' + startedAt);
md.push('- Completed: ' + endedAt);
md.push('- Matrix: ' + THEMES.length + ' themes x ' + RESOLUTIONS.length + ' resolutions x ' + STEPS.length + ' steps = ' + summary.total + ' checkpoints');
md.push('- MCP tools: webview_screenshot, manage_window (info/resize/list), webview_execute_js, driver_session, ipc_get_backend_state');
md.push('');
md.push('## Summary');
md.push('');
md.push('| Status | Count |');
md.push('| --- | --- |');
md.push('| pass | ' + summary.pass + ' |');
md.push('| warn | ' + summary.warn + ' |');
md.push('| fail | ' + summary.fail + ' |');
md.push('| error | ' + summary.error + ' |');
md.push('| screenshots captured | ' + summary.screenshotsCaptured + ' |');
md.push('');
md.push('Issues by category: `' + JSON.stringify(summary.issuesByCategory) + '`');
md.push('');
md.push('Checkpoints with vertical clipping, by step: `' + JSON.stringify(summary.clippingByStep) + '`');
md.push('');
md.push('Checkpoints with text-contrast failures, by theme: `' + JSON.stringify(summary.contrastFailuresByTheme) + '`');
md.push('');
md.push('## Flagged Checkpoints');
md.push('');
const flagged = results.filter((r) => (r.issues || []).length > 0);
if (flagged.length === 0) md.push('No issues detected.');
for (const r of flagged) {
  md.push('### ' + r.resolution + ' / ' + r.theme + ' / step ' + r.step + ' — ' + r.status);
  for (const i of r.issues) md.push('- **[' + i.severity + '] ' + i.category + '**: ' + i.detail);
  md.push('');
}
md.push('## Full Checklist');
md.push('');
md.push('| resolution | theme | step | status | viewport | dpr | max bottom | screenshot | issues |');
md.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of results) {
  const m = r.metrics;
  md.push('| ' + r.resolution + ' | ' + r.theme + ' | ' + r.step + ' | ' + r.status + ' | ' + (m ? m.innerW + 'x' + m.innerH : 'n/a') + ' | ' + (m ? m.dpr : 'n/a') + ' | ' + (m ? m.maxContentBottom : 'n/a') + ' | ' + (r.screenshotPath ? path.basename(r.screenshotPath) : 'none') + ' | ' + (r.issues || []).length + ' |');
}
fs.writeFileSync(path.join(reportDir, 'audit-report.md'), md.join('\n'));

await client.close();
console.log('AUDIT COMPLETE');
console.log(JSON.stringify(summary, null, 2));
