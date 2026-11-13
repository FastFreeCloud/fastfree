/**
 * Phase 2.3 — Automated Visual Inspection & Layout Audit
 * Drives the FastFree Installer Tauri app through the @hypothesi/tauri-mcp-server
 * MCP server (webview_screenshot / manage_window / webview_execute_js) and validates
 * layout, glassmorphism, and text contrast across themes x resolutions x steps.
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

// ---------------------------------------------------------------------------
// MCP client
// ---------------------------------------------------------------------------
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'fastfree-qa-phase23', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

const mcpLog = [];
async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  const content = res.content ?? [];
  mcpLog.push({ tool: name, args, content });
  return content;
}
const textOf = (content) => content.map((c) => c.text ?? '').join('\n');

function parseJsonText(t) {
  if (!t) return null;
  const s = String(t).replace(/\n*\[Executed in window:[^\]]*\]\s*$/i, '').trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* fall through */ }
  }
  return null;
}

async function toolJson(name, args) {
  const content = await call(name, args);
  return { raw: textOf(content), parsed: parseJsonText(textOf(content)), content };
}

// ---------------------------------------------------------------------------
// JS snippets executed inside the webview
// ---------------------------------------------------------------------------
function setThemeScript(target) {
  return `(() => {
    const btn = document.querySelector('.theme-btn');
    if (!btn) return { ok: false, reason: 'theme button not found' };
    let tries = 0;
    while (document.documentElement.getAttribute('data-theme') !== ${JSON.stringify(target)} && tries < 4) {
      btn.click(); tries++;
    }
    return { ok: document.documentElement.getAttribute('data-theme') === ${JSON.stringify(target)}, theme: document.documentElement.getAttribute('data-theme'), tries };
  })()`;
}

function setStepScript(step) {
  return `(() => {
    if (!window.__FASTFREE_CURRENT_STEP__) return { ok: false, reason: 'step bridge missing' };
    window.__FASTFREE_CURRENT_STEP__.value = ${step};
    return { ok: true, step: window.__FASTFREE_CURRENT_STEP__.value };
  })()`;
}

const METRICS_SCRIPT = `(() => {
  function parseRgb(s) {
    const m = String(s || '').match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map(function(x){ return parseFloat(x); });
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  }
  function lum(c) {
    function f(v){ v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b);
  }
  function effBg(el) {
    let e = el;
    while (e) {
      const c = parseRgb(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.01) return c;
      e = e.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  function ratio(fg, bg) {
    const L1 = lum(fg), L2 = lum(bg);
    return (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
  }
  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) };
  }
  const doc = document.documentElement;
  const innerW = window.innerWidth, innerH = window.innerHeight;
  const theme = doc.getAttribute('data-theme');
  const step = window.__FASTFREE_CURRENT_STEP__ ? window.__FASTFREE_CURRENT_STEP__.value : null;
  const glassSelectors = ['.titlebar', '.sdui-screen-wrapper', '.q-card', '.q-banner', '.step-progress', '.content-wrapper', '.q-btn'];
  const glass = [];
  glassSelectors.forEach(function(sel) {
    document.querySelectorAll(sel).forEach(function(el, i) {
      if (i >= 4) return;
      const cs = getComputedStyle(el);
      glass.push({
        selector: sel,
        backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || 'none',
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderTopColor,
        borderWidth: cs.borderTopWidth,
        boxShadow: cs.boxShadow === 'none' ? 'none' : 'present',
        borderRadius: cs.borderRadius,
        rect: rectOf(el)
      });
    });
  });
  const textEls = Array.prototype.slice.call(document.querySelectorAll('.sdui-screen-wrapper, .sdui-screen-wrapper *'))
    .filter(function(el){ return el.children.length === 0 && el.textContent && el.textContent.trim().length > 0; })
    .slice(0, 30);
  const textSamples = textEls.map(function(el) {
    const cs = getComputedStyle(el);
    const fg = parseRgb(cs.color) || { r: 0, g: 0, b: 0, a: 1 };
    const bg = effBg(el);
    const size = parseFloat(cs.fontSize) || 16;
    const weight = parseInt(cs.fontWeight) || 400;
    const large = size >= 18.66 || (weight >= 700 && size >= 14);
    const cr = ratio(fg, bg);
    return { text: el.textContent.trim().slice(0, 40), color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, contrast: Math.round(cr * 100) / 100, large: large, passesAA: large ? cr >= 3 : cr >= 4.5 };
  });
  const overflowing = [];
  Array.prototype.slice.call(document.querySelectorAll('body *')).forEach(function(el) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.right > innerW + 1 || r.bottom > innerH + 1 || r.left < -1 || r.top < -1)) {
      if (overflowing.length < 15) overflowing.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 60), rect: rectOf(el) });
    }
  });
  const keyEls = Array.prototype.slice.call(document.querySelectorAll('.titlebar-tools, .window-controls, .step-progress, .sdui-screen-wrapper, .q-card, button'))
    .map(function(el){ return { el: el, r: el.getBoundingClientRect() }; })
    .filter(function(o){ return o.r.width > 0 && o.r.height > 0; });
  const overlaps = [];
  for (let i = 0; i < keyEls.length; i++) {
    for (let j = i + 1; j < keyEls.length; j++) {
      const a = keyEls[i].r, b = keyEls[j].r;
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 2 && oy > 2) {
        const ae = keyEls[i].el, be = keyEls[j].el;
        if (ae.contains(be) || be.contains(ae)) continue;
        overlaps.push({ a: String(ae.className || ae.tagName).slice(0, 40), b: String(be.className || be.tagName).slice(0, 40), ox: Math.round(ox), oy: Math.round(oy) });
      }
    }
  }
  return {
    theme: theme,
    step: step,
    dir: doc.getAttribute('dir'),
    lang: doc.getAttribute('lang'),
    dpr: window.devicePixelRatio,
    innerW: innerW, innerH: innerH,
    outerW: window.outerWidth, outerH: window.outerHeight,
    scrollW: doc.scrollWidth, scrollH: doc.scrollHeight,
    screenW: screen.width, screenH: screen.height,
    availW: screen.availWidth, availH: screen.availHeight,
    horizontalOverflow: doc.scrollWidth > innerW + 1,
    glass: glass,
    textSamples: textSamples,
    overflowing: overflowing,
    overlaps: overlaps.slice(0, 20),
    title: document.title
  };
})()`;

// ---------------------------------------------------------------------------
// PNG dimension reader
// ---------------------------------------------------------------------------
function pngSize(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.readUInt32BE(0) === 0x89504e47) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
  } catch { /* ignore */ }
  return null;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------
const startedAt = new Date().toISOString();
const results = [];
const toolManifest = (await client.listTools()).tools.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: t.inputSchema,
}));

const session = await toolJson('driver_session', { action: 'start' });
const windows = await toolJson('manage_window', { action: 'list' });
const backend = await toolJson('ipc_get_backend_state', {});

function evaluate(entry) {
  const issues = [];
  // Theme applied?
  if (entry.metrics && entry.metrics.theme !== entry.theme) {
    issues.push({ category: 'theme', severity: 'high', detail: `requested ${entry.theme} but DOM reports ${entry.metrics.theme}` });
  }
  // Step applied?
  if (entry.metrics && entry.metrics.step !== entry.step) {
    issues.push({ category: 'step', severity: 'high', detail: `requested step ${entry.step} but app reports ${entry.metrics.step}` });
  }
  // DPI / dimensions
  if (entry.metrics) {
    const m = entry.metrics;
    const dpr = m.dpr || 1;
    const expectedInnerW = Math.round(entry.requested.width);
    const expectedInnerH = Math.round(entry.requested.height);
    if (Math.abs(m.innerW - expectedInnerW) > 2 || Math.abs(m.innerH - expectedInnerH) > 2) {
      issues.push({ category: 'dimensions', severity: 'high', detail: `requested ${expectedInnerW}x${expectedInnerH}, viewport is ${m.innerW}x${m.innerH} (dpr ${dpr})` });
    }
    if (Math.abs(m.outerW - m.innerW) > 40 || Math.abs(m.outerH - m.innerH) > 40) {
      issues.push({ category: 'dimensions', severity: 'low', detail: `outer ${m.outerW}x${m.outerH} vs inner ${m.innerW}x${m.innerH}` });
    }
  }
  // Glassmorphism: backdrop-filter
  if (entry.metrics) {
    const glassPanels = entry.metrics.glass.filter((g) => g.selector === '.sdui-screen-wrapper' || g.selector === '.q-card' || g.selector === '.q-banner');
    const noBlur = glassPanels.filter((g) => !(g.backdropFilter || '').includes('blur('));
    if (glassPanels.length === 0) {
      issues.push({ category: 'glassmorphism', severity: 'medium', detail: 'no glass panels found in DOM' });
    } else if (noBlur.length > 0) {
      issues.push({ category: 'glassmorphism', severity: 'medium', detail: `${noBlur.length}/${glassPanels.length} glass panels lack backdrop blur (e.g. ${noBlur[0].selector}: ${noBlur[0].backdropFilter})` });
    }
    // Border specular accents
    const noBorder = glassPanels.filter((g) => {
      const bw = parseFloat(g.borderWidth) || 0;
      const bc = String(g.borderColor || '');
      return bw < 1 || bc === 'none' || bc === '';
    });
    if (glassPanels.length > 0 && noBorder.length > 0) {
      issues.push({ category: 'glassmorphism', severity: 'low', detail: `${noBorder.length}/${glassPanels.length} glass panels lack a visible border` });
    }
  }
  // Text contrast
  if (entry.metrics) {
    const failing = entry.metrics.textSamples.filter((t) => !t.passesAA);
    if (failing.length > 0) {
      issues.push({ category: 'contrast', severity: 'medium', detail: `${failing.length}/${entry.metrics.textSamples.length} text samples below WCAG AA (worst: ${failing.map((f) => f.text + ' ' + f.contrast).slice(0, 3).join(', ')})` });
    }
  }
  // Clipping
  if (entry.metrics) {
    if (entry.metrics.horizontalOverflow) {
      issues.push({ category: 'clipping', severity: 'high', detail: `horizontal overflow: scrollWidth ${entry.metrics.scrollW} > viewport ${entry.metrics.innerW}` });
    }
    if (entry.metrics.overflowing.length > 0) {
      issues.push({ category: 'clipping', severity: 'high', detail: `${entry.metrics.overflowing.length} elements extend beyond viewport (e.g. ${entry.metrics.overflowing[0].tag}.${entry.metrics.overflowing[0].cls} rect ${JSON.stringify(entry.metrics.overflowing[0].rect)})` });
    }
  }
  // Overlaps
  if (entry.metrics && entry.metrics.overlaps.length > 0) {
    issues.push({ category: 'overlap', severity: 'high', detail: `${entry.metrics.overlaps.length} non-nested element overlaps (e.g. ${entry.metrics.overlaps[0].a} x ${entry.metrics.overlaps[0].b} ${entry.metrics.overlaps[0].ox}x${entry.metrics.overlaps[0].oy})` });
  }
  // Screenshot integrity
  if (!entry.screenshotPath || !fs.existsSync(entry.screenshotPath)) {
    issues.push({ category: 'screenshot', severity: 'high', detail: 'screenshot file missing' });
  } else if (!entry.screenshotDimensions || entry.screenshotDimensions.w === 0) {
    issues.push({ category: 'screenshot', severity: 'high', detail: 'screenshot dimensions unreadable' });
  }
  const status = issues.length === 0 ? 'pass' : (issues.some((i) => i.severity === 'high') ? 'fail' : 'warn');
  return { status, issues };
}

async function auditPoint(resolution, theme, step) {
  // 1. resize (once per resolution is enough, but re-assert to be safe)
  const resize = await toolJson('manage_window', {
    action: 'resize', windowId: 'main', width: resolution.width, height: resolution.height, logical: true,
  });
  await sleep(450);

  // 2. theme
  const themeRes = await toolJson('webview_execute_js', { script: setThemeScript(theme), windowId: 'main' });
  await sleep(250);

  // 3. step
  const stepRes = await toolJson('webview_execute_js', { script: setStepScript(step), windowId: 'main' });
  await sleep(950);

  // 4. window info
  const info = await toolJson('manage_window', { action: 'info', windowId: 'main' });

  // 5. metrics
  const metrics = await toolJson('webview_execute_js', { script: METRICS_SCRIPT, windowId: 'main' });

  // 6. screenshot
  const fileName = `step${step}-${theme}-${resolution.name}.png`;
  const filePath = path.join(shotDir, fileName);
  const shot = await toolJson('webview_screenshot', { format: 'png', filePath, windowId: 'main' });

  const entry = {
    resolution: resolution.name,
    requested: { width: resolution.width, height: resolution.height },
    theme,
    step,
    window: info.parsed || null,
    metrics: metrics.parsed || null,
    screenshot: shot.raw.trim(),
    screenshotPath: fs.existsSync(filePath) ? filePath : null,
    screenshotDimensions: pngSize(filePath),
    raw: { resize: resize.raw, theme: themeRes.raw, step: stepRes.raw, info: info.raw, metrics: metrics.raw, screenshot: shot.raw },
  };
  const { status, issues } = evaluate(entry);
  entry.status = status;
  entry.issues = issues;
  results.push(entry);
  console.log(`[${status.toUpperCase()}] ${resolution.name} ${theme} step${step} -> ${fileName}${issues.length ? ' :: ' + issues.map((i) => i.category).join(',') : ''}`);
  return entry;
}

// Baseline at configured default size
await toolJson('manage_window', { action: 'resize', windowId: 'main', width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height, logical: true });
await sleep(500);

for (const resolution of RESOLUTIONS) {
  for (const theme of THEMES) {
    for (const step of STEPS) {
      try {
        await auditPoint(resolution, theme, step);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`[ERROR] ${resolution.name} ${theme} step${step} :: ${msg}`);
        results.push({
          resolution: resolution.name, requested: { width: resolution.width, height: resolution.height },
          theme, step, error: msg, status: 'error', issues: [{ category: 'harness', severity: 'high', detail: msg }],
        });
      }
    }
  }
}

// Restore default window size
await toolJson('manage_window', { action: 'resize', windowId: 'main', width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height, logical: true });

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const endedAt = new Date().toISOString();
const summary = {
  total: results.length,
  pass: results.filter((r) => r.status === 'pass').length,
  warn: results.filter((r) => r.status === 'warn').length,
  fail: results.filter((r) => r.status === 'fail').length,
  error: results.filter((r) => r.status === 'error').length,
  screenshotsCaptured: results.filter((r) => r.screenshotPath).length,
  issuesByCategory: {},
};
for (const r of results) {
  for (const i of r.issues || []) {
    summary.issuesByCategory[i.category] = (summary.issuesByCategory[i.category] || 0) + 1;
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
  },
  toolManifest,
  summary,
  results,
};

fs.writeFileSync(path.join(reportDir, 'audit-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportDir, 'mcp-session.json'), JSON.stringify(mcpLog, null, 2));

// Markdown summary
const md = [];
md.push('# Phase 2.3 — Tauri MCP Automated Visual Inspection & Layout Audit');
md.push('');
md.push(`- Generated: ${startedAt}`);
md.push(`- Completed: ${endedAt}`);
md.push(`- Matrix: ${THEMES.length} themes x ${RESOLUTIONS.length} resolutions x ${STEPS.length} steps = ${summary.total} checkpoints`);
md.push(`- MCP tools used: \`webview_screenshot\`, \`manage_window\` (info/resize/list), \`webview_execute_js\`, \`driver_session\`, \`ipc_get_backend_state\``);
md.push('');
md.push('## Summary');
md.push('');
md.push(`| Status | Count |`);
md.push(`| --- | --- |`);
md.push(`| pass | ${summary.pass} |`);
md.push(`| warn | ${summary.warn} |`);
md.push(`| fail | ${summary.fail} |`);
md.push(`| error | ${summary.error} |`);
md.push(`| screenshots captured | ${summary.screenshotsCaptured} |`);
md.push('');
md.push(`Issues by category: \`${JSON.stringify(summary.issuesByCategory)}\``);
md.push('');
md.push('## Failures & Warnings');
md.push('');
const flagged = results.filter((r) => (r.issues || []).length > 0);
if (flagged.length === 0) {
  md.push('No issues detected.');
} else {
  for (const r of flagged) {
    md.push(`### ${r.resolution} / ${r.theme} / step ${r.step} — ${r.status}`);
    for (const i of r.issues) {
      md.push(`- **[${i.severity}] ${i.category}**: ${i.detail}`);
    }
    md.push('');
  }
}
md.push('## Full Checklist');
md.push('');
md.push(`| resolution | theme | step | status | viewport | dpr | screenshot | issues |`);
md.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
for (const r of results) {
  const m = r.metrics;
  md.push(`| ${r.resolution} | ${r.theme} | ${r.step} | ${r.status} | ${m ? `${m.innerW}x${m.innerH}` : 'n/a'} | ${m ? m.dpr : 'n/a'} | ${r.screenshotPath ? path.basename(r.screenshotPath) : 'none'} | ${(r.issues || []).length} |`);
}
fs.writeFileSync(path.join(reportDir, 'audit-report.md'), md.join('\n'));

await client.close();
console.log('AUDIT COMPLETE');
console.log(JSON.stringify(summary, null, 2));
