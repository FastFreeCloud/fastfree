/**
 * Verification & Test Suite for FastFree Installer SDUI Screens
 * Covers:
 * 1. Schema Validation (JSON, i18n ar/en, design tokens, action mapping)
 * 2. Headless Component & Virtual DOM Rendering (RTL & LTR)
 * 3. Event Dispatcher & Interaction Simulation (tauri:invoke, navigate)
 */

const fs = require('fs');
const path = require('path');

const schemasDir = path.resolve(__dirname, '../src/schemas');
const schemaFiles = [
  'step1_discovery.json',
  'step2_license.json',
  'step3_sizing.json',
  'step4_wireguard.json',
  'step5_provisioning.json',
  'step6_launchpad.json',
];

const requiredTokens = ['diag-card', 'text-main', 'text-muted', 'accent-blue'];

// Dummy state mirroring SduiStepHost sharedState
const createInitialState = (locale = 'ar') => ({
  locale,
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

// SduiRegistry resolution simulator
const knownComponents = new Set([
  'qcard', 'qcardsection', 'qcardactions', 'qbtn', 'qslider', 'qinput',
  'qtoggle', 'qicon', 'qbanner', 'qlinearprogress', 'qchip', 'qbadge',
  'qseparator', 'button', 'btn', 'card', 'banner', 'progress', 'chip',
  'separator', 'input', 'slider', 'toggle', 'icon', 'badge', 'row',
  'div', 'span'
]);

function resolveComponent(type) {
  if (!type) return 'div';
  const norm = type.trim().toLowerCase().replace(/-/g, '');
  if (knownComponents.has(norm)) return norm;
  return 'FALLBACK_UNKNOWN';
}

function evaluateExpression(expr, state) {
  // Support state.prop and simple inline arithmetic like (state.val || 4096) / 1024
  return expr.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, expression) => {
    try {
      const fn = new Function('state', `with(state) { return (${expression}); }`);
      const val = fn(state);
      return val !== undefined && val !== null ? String(val) : '';
    } catch {
      // Fallback simple path lookup
      const clean = expression.replace(/^state\./, '').trim();
      return state[clean] !== undefined ? String(state[clean]) : '';
    }
  });
}

function resolveLocalized(val, locale, state) {
  if (!val) return val;
  if (typeof val === 'object' && ('ar' in val || 'en' in val)) {
    const raw = val[locale] || val['ar'] || val['en'] || '';
    return typeof raw === 'string' ? evaluateExpression(raw, state) : raw;
  }
  if (typeof val === 'string') {
    return evaluateExpression(val, state);
  }
  return val;
}

// Render node to Virtual DOM representation
function renderVNode(node, state, locale, depth = 0) {
  if (!node) return null;
  const compType = resolveComponent(node.type);
  const text = node.text ? resolveLocalized(node.text, locale, state) : null;
  
  const props = {};
  if (node.props) {
    for (const [k, v] of Object.entries(node.props)) {
      props[k] = resolveLocalized(v, locale, state);
    }
  }

  // Model binding sync
  if (node.model && state[node.model] !== undefined) {
    props.modelValue = state[node.model];
  }

  const children = Array.isArray(node.children)
    ? node.children.map(c => renderVNode(c, state, locale, depth + 1)).filter(Boolean)
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

// Traverse and inspect schema properties
function inspectSchema(schema, fileName) {
  const issues = [];
  const tokenSet = new Set();
  const actionsList = [];
  let totalNodes = 0;

  function traverse(node, pStr) {
    if (!node || typeof node !== 'object') return;
    totalNodes++;

    // Check component resolution
    const resolved = resolveComponent(node.type);
    if (resolved === 'FALLBACK_UNKNOWN') {
      issues.push(`[${pStr}] Unregistered component type "${node.type}"`);
    }

    // Check classes
    if (node.class && typeof node.class === 'string') {
      node.class.split(/\s+/).forEach(c => {
        if (c) tokenSet.add(c);
      });
    }

    // Check dual-language objects in text
    if (node.text !== undefined) {
      if (typeof node.text === 'string') {
        issues.push(`[${pStr}.text] Bare string detected: "${node.text}" (Must be {ar, en})`);
      } else if (typeof node.text === 'object') {
        if (!node.text.ar || !node.text.en) {
          issues.push(`[${pStr}.text] Missing ar or en key: ${JSON.stringify(node.text)}`);
        }
      }
    }

    // Check dual-language objects in relevant props
    if (node.props) {
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

    // Check events & actions
    if (node.events) {
      for (const [eventName, action] of Object.entries(node.events)) {
        const actList = Array.isArray(action) ? action : [action];
        actList.forEach((act, aIdx) => {
          if (!act.type) {
            issues.push(`[${pStr}.events.${eventName}[${aIdx}]] Missing action type`);
          } else {
            actionsList.push({ path: pStr, event: eventName, action: act });
          }
        });
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((c, i) => traverse(c, `${pStr}.children[${i}]`));
    }
  }

  // Check top-level screen
  if (!schema.id) issues.push('Missing screen id');
  if (!schema.title || !schema.title.ar || !schema.title.en) {
    issues.push('Missing or invalid screen dual-language title {ar, en}');
  }
  if (!schema.root) {
    issues.push('Missing screen root node');
  } else {
    traverse(schema.root, 'root');
  }

  // Check required tokens
  const missingTokens = requiredTokens.filter(t => !tokenSet.has(t));
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
        const num = parseInt(target.replace('step', ''), 10);
        if (!isNaN(num)) {
          this.currentStep = num;
          entry.result = `Navigated to step ${num}`;
        } else {
          throw new Error(`Invalid navigate target: ${target}`);
        }
      } else if (action.type === 'tauri:invoke') {
        if (!action.command) {
          throw new Error('tauri:invoke requires command');
        }
        entry.result = `Invoked command "${action.command}" with payload ${JSON.stringify(action.payload || {})}`;
      } else if (action.type === 'state:set') {
        if (!action.target) throw new Error('state:set requires target path');
        state[action.target] = action.payload;
        entry.result = `Set state.${action.target} = ${action.payload}`;
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

// Main Runner
async function runAll() {
  console.log('='.repeat(70));
  console.log('FASTFREE INSTALLER — SDUI VERIFICATION & INTERACTION SUITE');
  console.log('='.repeat(70));

  let totalPassed = 0;
  let totalFailed = 0;

  for (const file of schemaFiles) {
    console.log(`\n▶ Auditing Schema: [${file}]`);
    const filePath = path.join(schemasDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const { issues, tokenSet, actionsList, totalNodes } = inspectSchema(content, file);

    console.log(`  - Total nodes in AST: ${totalNodes}`);
    console.log(`  - Design tokens matched: ${requiredTokens.filter(t => tokenSet.has(t)).join(', ')}`);
    console.log(`  - Actions detected: ${actionsList.length}`);

    if (issues.length === 0) {
      console.log(`  ✓ Schema & i18n Validation: PASS (0 issues)`);
      totalPassed++;
    } else {
      console.error(`  ✗ Schema Validation FAILED: ${issues.length} issues`);
      issues.forEach(i => console.error(`    * ${i}`));
      totalFailed++;
    }

    // Render Virtual DOM in both 'ar' and 'en'
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

    // Simulate Actions Dispatch
    const dispatcher = new MockActionDispatcher();
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
  console.log(`SUMMARY: ${totalPassed} checks PASSED, ${totalFailed} checks FAILED`);
  console.log('='.repeat(70));

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
