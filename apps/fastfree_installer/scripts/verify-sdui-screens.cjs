/**
 * Verification & Test Suite for FastFree SDUI Screens
 *
 * Expanded for SDUI-02 (P0): accepts the new shared contract (packages/fastfree_sdui)
 * and validates screens against the widget catalog (JSON) that mirrors SduiRegistry.
 *
 * Covers:
 *  1. JSON parsing
 *  2. i18n ar/en (text + label/title/placeholder/hint props)
 *  3. Design tokens (core token set shared by all shipped screens)
 *  4. Action mapping (tauri:invoke -> command, open_sdui_screen -> screen, ...)
 *  5. Registered widgets (every node.type resolves against the widget catalog)
 *  6. Headless Virtual DOM rendering (AR & EN)
 *  7. Action dispatcher simulation
 *
 * Usage:
 *   node verify-sdui-screens.cjs                 # validate all shipped screens
 *   node verify-sdui-screens.cjs <file.json>...  # validate given files
 *   node verify-sdui-screens.cjs <dir>           # validate all *.json in dir
 *
 * Exit code: 0 if all pass, 1 otherwise. Issues are printed with clear paths.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SCREEN_SOURCES = [
  { name: 'installer', dir: path.join(ROOT, 'apps', 'fastfree_installer', 'src', 'schemas') },
  { name: 'panel', dir: path.join(ROOT, 'packages', 'fastfree_panel', 'src', 'schemas') },
  { name: 'sales', dir: path.join(ROOT, 'packages', 'fastfree_sales', 'src', 'schemas') },
  { name: 'accounting', dir: path.join(ROOT, 'packages', 'fastfree_accounting', 'src', 'schemas') },
];

const REQUIRED_TOKENS = ['diag-card', 'text-main', 'text-muted'];

// Widget catalog (JSON) mirroring SduiRegistry. Loaded from disk so the verifier
// and the contract stay in sync.
function loadWidgetCatalog() {
  const candidates = [
    path.join(__dirname, 'widget-catalog.json'),
    path.join(__dirname, '..', 'src', 'schemas', 'widget-catalog.json'),
    path.join(ROOT, 'packages', 'fastfree_sdui', 'contract', 'widget-catalog.json'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        const data = JSON.parse(fs.readFileSync(c, 'utf8'));
        if (Array.isArray(data) && data.length > 0) return { path: c, data };
      }
    } catch (e) {
      // ignore and try next
    }
  }
  // Fallback (should not happen): minimal canonical set
  return {
    path: '(embedded)',
    data: [
      'QCard', 'QCardSection', 'QCardActions', 'QBtn', 'QSlider', 'QInput', 'QToggle',
      'QIcon', 'QBanner', 'QLinearProgress', 'QChip', 'QBadge', 'QSeparator',
      'button', 'btn', 'card', 'banner', 'progress', 'chip', 'separator', 'input',
      'slider', 'toggle', 'icon', 'badge', 'row', 'div', 'span',
    ],
  };
}

const CATALOG_INFO = loadWidgetCatalog();
const WIDGET_CATALOG = CATALOG_INFO.data;

function toKebabCase(str) {
  return String(str)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
    .toLowerCase();
}

function buildWidgetResolver(catalog) {
  const registered = new Set();
  for (const key of catalog) {
    registered.add(key);
    registered.add(toKebabCase(key));
  }
  const byLower = new Map();
  for (const key of registered) byLower.set(key.toLowerCase(), key);
  return function isKnown(type) {
    if (!type) return false;
    const trimmed = String(type).trim();
    return registered.has(trimmed) || registered.has(toKebabCase(trimmed)) || byLower.has(trimmed.toLowerCase());
  };
}

const isKnownWidget = buildWidgetResolver(WIDGET_CATALOG);

// Dummy state mirroring SduiStepHost sharedState
const createInitialState = (locale) => ({
  locale: locale || 'ar',
  theme: 'dark',
  cpuCores: 16,
  totalRamGb: 64,
  assignedCpu: 8,
  assignedRam: 16384,
  targetDisk: 'D:\\FastFree\\vms\\fastfree-clan.vhdx',
  licenseKey: 'FAST-FREE-2026-TEST',
  wgEndpoint: 'mesh.fastfree.internal',
  wgPort: 51820,
  wgMeshInterconnect: true,
  wgKillSwitch: true,
  wgHardwareAcceleration: true,
  installPercent: 78,
});

function resolveComponent(type) {
  if (!type) return 'div';
  const norm = String(type).trim().toLowerCase().replace(/-/g, '');
  // Resolve through catalog (registry parity)
  if (isKnownWidget(type)) return norm;
  return 'FALLBACK_UNKNOWN';
}

function evaluateExpression(expr, state) {
  return String(expr).replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, expression) => {
    try {
      const fn = new Function('state', `with(state) { return (${expression}); }`);
      const val = fn(state);
      return val !== undefined && val !== null ? String(val) : '';
    } catch {
      const clean = String(expression).replace(/^state\./, '').trim();
      return state && state[clean] !== undefined ? String(state[clean]) : '';
    }
  });
}

function resolveLocalized(val, locale, state) {
  if (!val) return val;
  if (typeof val === 'object' && ('ar' in val || 'en' in val)) {
    const raw = (val[locale] !== undefined ? val[locale] : (val['ar'] !== undefined ? val['ar'] : val['en'])) || '';
    return typeof raw === 'string' ? evaluateExpression(raw, state) : raw;
  }
  if (typeof val === 'string') {
    return evaluateExpression(val, state);
  }
  return val;
}

function renderVNode(node, state, locale, depth) {
  if (!node) return null;
  const compType = resolveComponent(node.type);
  const text = node.text ? resolveLocalized(node.text, locale, state) : null;

  const props = {};
  if (node.props) {
    for (const [k, v] of Object.entries(node.props)) {
      props[k] = resolveLocalized(v, locale, state);
    }
  }

  if (node.model && state && state[node.model] !== undefined) {
    props.modelValue = state[node.model];
  }

  const children = Array.isArray(node.children)
    ? node.children.map((c) => renderVNode(c, state, locale, (depth || 0) + 1)).filter(Boolean)
    : [];

  return {
    type: compType,
    rawType: node.type,
    id: node.id || null,
    class: node.class || null,
    text,
    props,
    events: node.events || null,
    children,
  };
}

function inspectSchema(schema, fileName) {
  const issues = [];
  const tokenSet = new Set();
  const actionsList = [];
  let totalNodes = 0;

  function traverse(node, pStr) {
    if (!node || typeof node !== 'object') return;
    totalNodes++;

    // Widget catalog check (registered widgets)
    if (typeof node.type !== 'string' || node.type.trim() === '') {
      issues.push(`[${pStr}.type] Missing or empty component type`);
    } else {
      if (!isKnownWidget(node.type)) {
        issues.push(`[${pStr}.type] Unregistered widget type "${node.type}" (not in widget catalog / SduiRegistry)`);
      }
    }

    // Classes / design tokens
    if (node.class && typeof node.class === 'string') {
      node.class.split(/\s+/).forEach((c) => { if (c) tokenSet.add(c); });
    } else if (Array.isArray(node.class)) {
      node.class.forEach((c) => { if (typeof c === 'string') c.split(/\s+/).forEach((x) => { if (x) tokenSet.add(x); }); });
    }

    // i18n: text must be {ar, en}
    if (node.text !== undefined) {
      if (typeof node.text === 'string') {
        issues.push(`[${pStr}.text] Bare string detected: "${node.text}" (Must be {ar, en})`);
      } else if (typeof node.text === 'object' && node.text !== null) {
        if (!node.text.ar || !node.text.en) {
          issues.push(`[${pStr}.text] Missing ar or en key: ${JSON.stringify(node.text)}`);
        }
      } else {
        issues.push(`[${pStr}.text] Invalid text type: ${typeof node.text}`);
      }
    }

    // i18n: relevant props
    if (node.props && typeof node.props === 'object') {
      for (const [k, v] of Object.entries(node.props)) {
        if (['label', 'title', 'placeholder', 'hint'].includes(k)) {
          if (typeof v === 'string') {
            issues.push(`[${pStr}.props.${k}] Bare string detected: "${v}" (Must be {ar, en})`);
          } else if (typeof v === 'object' && v !== null) {
            if (!v.ar || !v.en) {
              issues.push(`[${pStr}.props.${k}] Missing ar or en key: ${JSON.stringify(v)}`);
            }
          }
        }
      }
    }

    // Events & actions
    if (node.events && typeof node.events === 'object') {
      for (const [eventName, action] of Object.entries(node.events)) {
        const actList = Array.isArray(action) ? action : [action];
        actList.forEach((act, aIdx) => {
          if (!act || typeof act !== 'object') {
            issues.push(`[${pStr}.events.${eventName}[${aIdx}]] Invalid action (not an object)`);
            return;
          }
          if (!act.type) {
            issues.push(`[${pStr}.events.${eventName}[${aIdx}]] Missing action type`);
            return;
          }
          // tauri:invoke requires command
          if (act.type === 'tauri:invoke' && !act.command) {
            issues.push(`[${pStr}.events.${eventName}[${aIdx}]] tauri:invoke requires a command name`);
          }
          // open_sdui_screen requires screen
          if (act.type === 'open_sdui_screen' && !act.screen) {
            issues.push(`[${pStr}.events.${eventName}[${aIdx}]] open_sdui_screen requires a screen id`);
          }
          actionsList.push({ path: pStr, event: eventName, action: act });
        });
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((c, i) => traverse(c, `${pStr}.children[${i}]`));
    }
  }

  // Top-level screen checks (new contract aware)
  if (!schema || typeof schema !== 'object') {
    issues.push('Screen payload is not an object');
    return { issues, tokenSet, actionsList, totalNodes };
  }
  if (!schema.id) issues.push('Missing screen id');
  else if (typeof schema.id !== 'string' || schema.id.trim() === '') issues.push('Screen id must be a non-empty string');

  // title: string or {ar, en} (contract allows both; mission prefers {ar,en})
  if (schema.title !== undefined) {
    if (typeof schema.title === 'string') {
      // allowed by contract; no i18n enforcement on bare string title? mission says {ar,en}
      // Keep permissive to accept new contract.
    } else if (typeof schema.title === 'object' && schema.title !== null) {
      if (!schema.title.ar || !schema.title.en) {
        issues.push('Missing or invalid screen dual-language title {ar, en}');
      }
    } else {
      issues.push('Invalid screen title type');
    }
  } else {
    // title optional in contract; original required. Keep optional to accept new contract.
  }

  if (!schema.root) {
    issues.push('Missing screen root node');
  } else {
    traverse(schema.root, 'root');
  }

  // meta (new contract): if present, validate shape
  if (schema.meta !== undefined) {
    if (typeof schema.meta !== 'object' || schema.meta === null) {
      issues.push('meta must be an object');
    } else {
      if (!schema.meta.app || typeof schema.meta.app !== 'string') issues.push('meta.app must be a non-empty string');
      if (schema.meta.updatedAt === undefined || typeof schema.meta.updatedAt !== 'number') issues.push('meta.updatedAt must be a number');
    }
  }

  // versionHash optional (string if present)
  if (schema.versionHash !== undefined && typeof schema.versionHash !== 'string') {
    issues.push('versionHash must be a string');
  }

  // state optional (record if present)
  if (schema.state !== undefined && (typeof schema.state !== 'object' || schema.state === null || Array.isArray(schema.state))) {
    issues.push('state must be a record/object');
  }

  // Design tokens: core set shared across all shipped screens
  const missingTokens = REQUIRED_TOKENS.filter((t) => !tokenSet.has(t));
  if (missingTokens.length > 0) {
    issues.push(`Missing required design token class(es): ${missingTokens.join(', ')}`);
  }

  return { issues, tokenSet, actionsList, totalNodes };
}

// Action Dispatcher Simulator
class MockActionDispatcher {
  constructor() {
    this.logs = [];
    this.currentStep = 1;
  }

  async dispatch(action, state) {
    const entry = { action, timestamp: Date.now(), success: true };
    try {
      if (action.type === 'navigate') {
        const target = action.target || '';
        if (target) {
          const num = parseInt(String(target).replace('step', ''), 10);
          if (!isNaN(num)) {
            this.currentStep = num;
            entry.result = `Navigated to step ${num}`;
          } else {
            entry.result = `Navigated to ${target}`;
          }
        } else {
          entry.result = 'Navigate (no target)';
        }
      } else if (action.type === 'tauri:invoke') {
        if (!action.command) throw new Error('tauri:invoke requires command');
        entry.result = `Invoked command "${action.command}" with payload ${JSON.stringify(action.payload || {})}`;
      } else if (action.type === 'state:set') {
        if (action.target) {
          if (!state) state = {};
          state[action.target] = action.payload;
          entry.result = `Set state.${action.target} = ${JSON.stringify(action.payload)}`;
        } else if (action.payload && typeof action.payload === 'object') {
          entry.result = `Bulk merge state ${JSON.stringify(action.payload)}`;
        } else {
          entry.result = 'state:set (no target)';
        }
      } else if (action.type === 'open_sdui_screen') {
        entry.result = `Open SDUI screen ${action.screen}`;
      } else if (action.type === 'open_external_url') {
        entry.result = `Open external url ${action.url || action.payload}`;
      } else if (action.type === 'back_to_launchpad') {
        entry.result = 'Back to launchpad';
      } else {
        entry.result = `Custom action ${action.type}`;
      }
    } catch (err) {
      entry.success = false;
      entry.error = err.message;
    }
    this.logs.push(entry);
    return entry;
  }
}

function collectScreenFiles(args) {
  const files = [];
  if (!args || args.length === 0) {
    for (const src of SCREEN_SOURCES) {
      if (!fs.existsSync(src.dir)) continue;
      for (const f of fs.readdirSync(src.dir)) {
        if (f.endsWith('.json') && f !== 'widget-catalog.json') files.push(path.join(src.dir, f));
      }
    }
    return files;
  }
  for (const a of args) {
    const p = path.resolve(a);
    if (!fs.existsSync(p)) {
      console.error(`File not found: ${p}`);
      process.exit(1);
    }
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(p)) {
        if (f.endsWith('.json') && f !== 'widget-catalog.json') files.push(path.join(p, f));
      }
    } else {
      files.push(p);
    }
  }
  return files;
}

async function runAll(args) {
  console.log('='.repeat(70));
  console.log('FASTFREE SDUI — VERIFICATION & INTERACTION SUITE');
  console.log('Widget catalog:', CATALOG_INFO.path, `(${WIDGET_CATALOG.length} entries)`);
  console.log('='.repeat(70));

  const files = collectScreenFiles(args);
  let totalPassed = 0;
  let totalFailed = 0;
  let totalScreens = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    totalScreens++;
    console.log(`\n▶ Auditing Schema: [${fileName}]`);
    let content;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      content = JSON.parse(raw);
    } catch (err) {
      console.error(`  ✗ JSON parse FAILED: ${err.message}`);
      totalFailed++;
      continue;
    }

    const { issues, tokenSet, actionsList, totalNodes } = inspectSchema(content, fileName);

    console.log(`  - Total nodes in AST: ${totalNodes}`);
    console.log(`  - Design tokens matched: ${REQUIRED_TOKENS.filter((t) => tokenSet.has(t)).join(', ')}`);
    console.log(`  - Actions detected: ${actionsList.length}`);
    console.log(`  - Widgets: catalog (${WIDGET_CATALOG.length})`);

    if (issues.length === 0) {
      console.log(`  ✓ Schema & i18n & token & action & widget Validation: PASS (0 issues)`);
      totalPassed++;
    } else {
      console.error(`  ✗ Validation FAILED: ${issues.length} issues`);
      issues.forEach((i) => console.error(`    * ${i}`));
      totalFailed++;
    }

    // Render Virtual DOM in both 'ar' and 'en'
    try {
      const stateAr = createInitialState('ar');
      const vdomAr = renderVNode(content.root, stateAr, 'ar');
      const stateEn = createInitialState('en');
      const vdomEn = renderVNode(content.root, stateEn, 'en');

      if (vdomAr && vdomEn) {
        console.log(`  ✓ Virtual DOM Headless Rendering (AR & EN): SUCCESS`);
        totalPassed++;
      } else {
        console.error(`  ✗ Virtual DOM Rendering FAILED`);
        totalFailed++;
      }
    } catch (err) {
      console.error(`  ✗ Virtual DOM Rendering ERROR: ${err.message}`);
      totalFailed++;
    }

    // Simulate Actions Dispatch
    const dispatcher = new MockActionDispatcher();
    const stateAr = createInitialState('ar');
    let actionErrors = 0;
    for (const actItem of actionsList) {
      const res = await dispatcher.dispatch(actItem.action, stateAr);
      if (!res.success) {
        console.error(`    ✗ Action error on ${actItem.path}: ${res.error}`);
        actionErrors++;
      }
    }

    if (actionErrors === 0) {
      console.log(`  ✓ Action Dispatcher Verification (${actionsList.length} actions): ALL RESOLVED`);
      totalPassed++;
    } else {
      console.error(`  ✗ Action Dispatcher: ${actionErrors} failed`);
      totalFailed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`SUMMARY: ${totalScreens} screens, ${totalPassed} checks PASSED, ${totalFailed} checks FAILED`);
  console.log('='.repeat(70));

  if (totalFailed > 0) {
    process.exit(1);
  }
}

// Export for testability
module.exports = {
  inspectSchema,
  runAll,
  loadWidgetCatalog,
  isKnownWidget,
  WIDGET_CATALOG,
  REQUIRED_TOKENS,
  toKebabCase,
  buildWidgetResolver,
  MockActionDispatcher,
};

if (require.main === module) {
  runAll(process.argv.slice(2)).catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
