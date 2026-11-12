/**
 * SDUI Modular Business Packages Verification Script
 * Validates SduiScreen JSON schemas against SduiScreen specs:
 * 1. packages/fastfree_sales/src/schemas/pos_checkout.json
 * 2. packages/fastfree_os/src/schemas/fleet_monitor.json
 * 3. packages/fastfree_accounting/src/schemas/general_ledger.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SCHEMAS = [
  {
    name: 'Sales POS Checkout',
    id: 'pos_checkout',
    relPath: 'packages/fastfree_sales/src/schemas/pos_checkout.json',
    expectedTokens: ['diag-card', 'text-main', 'text-muted', 'accent-blue'],
    requiredActions: ['pos:sync_offline_orders', 'pos:scan_barcode', 'pos:add_to_cart', 'pos:process_payment'],
    customChecks: (schema, errors) => {
      const jsonStr = JSON.stringify(schema);
      // Check Cashier and Shift
      if (!jsonStr.includes('أحمد العتيبي') && !jsonStr.includes('Ahmad Al-Otaibi')) {
        errors.push('POS: Missing cashier name in schema');
      }
      if (!jsonStr.includes('08:00 - 16:00')) {
        errors.push('POS: Missing shift time in schema');
      }
      // Check offline badge
      if (!jsonStr.includes('cloud_off') && !jsonStr.includes('Offline-First')) {
        errors.push('POS: Missing offline badge');
      }
      // Check barcode search
      if (!jsonStr.includes('searchQuery') && !jsonStr.includes('scan_barcode')) {
        errors.push('POS: Missing barcode search/filter');
      }
      // Check product catalog cards with stock badge and add to cart
      if (!jsonStr.includes('PRD-001') || !jsonStr.includes('pos:add_to_cart')) {
        errors.push('POS: Missing product catalog cards with add_to_cart action');
      }
      // Check cart drawer with tax / VAT calculation
      if (!jsonStr.includes('15%') && !jsonStr.includes('VAT')) {
        errors.push('POS: Missing tax/VAT calculation in order summary');
      }
      // Check payment buttons (Cash, Card, Deferred)
      const hasCash = jsonStr.includes('cash') || jsonStr.includes('نقدي');
      const hasCard = jsonStr.includes('card') || jsonStr.includes('مدى');
      const hasDeferred = jsonStr.includes('deferred') || jsonStr.includes('آجل');
      if (!hasCash || !hasCard || !hasDeferred) {
        errors.push(`POS: Missing required payment methods: cash=${hasCash}, card=${hasCard}, deferred=${hasDeferred}`);
      }
    }
  },
  {
    name: 'Sovereign Clan Fleet Monitor',
    id: 'fleet_monitor',
    relPath: 'packages/fastfree_os/src/schemas/fleet_monitor.json',
    expectedTokens: ['diag-card', 'text-main', 'text-muted', 'accent-blue'],
    requiredActions: ['clan:mesh:restart', 'clan:flake:pull', 'clan:cluster:audit', 'clan:node:inspect'],
    customChecks: (schema, errors) => {
      const jsonStr = JSON.stringify(schema);
      // Check WireGuard mesh controller
      if (!jsonStr.includes('client1.fastfree.local') || !jsonStr.includes('51820')) {
        errors.push('Fleet Monitor: Missing WireGuard mesh controller status');
      }
      // Check vCPU and RAM allocation
      if (!jsonStr.includes('44') || !jsonStr.includes('128')) {
        errors.push('Fleet Monitor: Missing vCPU/RAM allocation metrics');
      }
      // Check all 11 clan nodes
      for (let i = 1; i <= 11; i++) {
        const node = `client${i}`;
        if (!jsonStr.includes(node)) {
          errors.push(`Fleet Monitor: Missing node ${node} in 11-node grid`);
        }
      }
      // Check cluster actions
      if (!jsonStr.includes('clan:mesh:restart')) {
        errors.push('Fleet Monitor: Missing Restart WireGuard Mesh action');
      }
      if (!jsonStr.includes('clan:flake:pull')) {
        errors.push('Fleet Monitor: Missing Pull Flake Update action');
      }
      if (!jsonStr.includes('clan:cluster:audit')) {
        errors.push('Fleet Monitor: Missing Run Cluster Audit action');
      }
    }
  },
  {
    name: 'Executive General Ledger',
    id: 'general_ledger',
    relPath: 'packages/fastfree_accounting/src/schemas/general_ledger.json',
    expectedTokens: ['diag-card', 'text-main', 'text-muted', 'accent-blue'],
    requiredActions: ['accounting:export_ledger', 'accounting:entry:view'],
    customChecks: (schema, errors) => {
      const jsonStr = JSON.stringify(schema);
      // Check 4 KPI summary cards (Total Revenue, Expenses, Net Profit, Unpaid Invoices)
      if (!jsonStr.includes('1,842,500.00')) {
        errors.push('General Ledger: Missing Total Revenue KPI');
      }
      if (!jsonStr.includes('1,120,300.00')) {
        errors.push('General Ledger: Missing Total Expenses KPI');
      }
      if (!jsonStr.includes('722,200.00')) {
        errors.push('General Ledger: Missing Net Profit KPI');
      }
      if (!jsonStr.includes('89,450.00')) {
        errors.push('General Ledger: Missing Unpaid Invoices KPI');
      }
      // Check status chips: Paid, Pending, Overdue
      const hasPaid = jsonStr.includes('Paid') || jsonStr.includes('مسدد');
      const hasPending = jsonStr.includes('Pending') || jsonStr.includes('معلق');
      const hasOverdue = jsonStr.includes('Overdue') || jsonStr.includes('متأخر');
      if (!hasPaid || !hasPending || !hasOverdue) {
        errors.push(`General Ledger: Missing required status chips: Paid=${hasPaid}, Pending=${hasPending}, Overdue=${hasOverdue}`);
      }
      // Check Action buttons: New Invoice, Export General Ledger (Excel/PDF)
      if (!jsonStr.includes('New Invoice') && !jsonStr.includes('/accounting/invoices/new')) {
        errors.push('General Ledger: Missing New Invoice action');
      }
      if (!jsonStr.includes('accounting:export_ledger')) {
        errors.push('General Ledger: Missing Export General Ledger action');
      }
      if (!jsonStr.includes('xlsx') || !jsonStr.includes('pdf')) {
        errors.push('General Ledger: Missing Excel / PDF export formats');
      }
    }
  }
];

function isBilingual(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return typeof obj.ar === 'string' && obj.ar.trim().length > 0 &&
         typeof obj.en === 'string' && obj.en.trim().length > 0;
}

function traverseNodes(node, pathStr, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node, pathStr);
  if (Array.isArray(node.children)) {
    node.children.forEach((child, idx) => {
      traverseNodes(child, `${pathStr}.children[${idx}]`, callback);
    });
  }
}

function validateSchema(cfg) {
  const fullPath = path.join(ROOT, cfg.relPath);
  console.log(`\n======================================================`);
  console.log(`Verifying: ${cfg.name} (${cfg.relPath})`);
  console.log(`======================================================`);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    return { ok: false, errors: [`File not found: ${fullPath}`] };
  }

  let data;
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ JSON parse error in ${cfg.relPath}:`, err.message);
    return { ok: false, errors: [err.message] };
  }

  const errors = [];
  const warnings = [];

  // 1. Root structure
  if (data.id !== cfg.id) {
    errors.push(`Expected id "${cfg.id}", found "${data.id}"`);
  }
  if (!data.versionHash) {
    errors.push(`Missing versionHash`);
  }
  if (!isBilingual(data.title)) {
    errors.push(`Screen title must be bilingual { ar, en }`);
  }
  if (!data.root || typeof data.root !== 'object' || !data.root.type) {
    errors.push(`Missing valid root SduiNode`);
  }

  // 2. Node traversal: bilingual text, props, tokens, actions
  let totalNodes = 0;
  let bilingualLabelsCount = 0;
  let actionBindingsCount = 0;
  const classesFound = new Set();
  const actionsFound = new Set();

  traverseNodes(data.root, 'root', (node, nodePath) => {
    totalNodes++;

    // Record classes
    if (typeof node.class === 'string') {
      node.class.split(/\s+/).forEach(c => classesFound.add(c));
    }

    // Check text bilingualism
    if (node.text !== undefined) {
      if (typeof node.text === 'object') {
        if (!isBilingual(node.text)) {
          errors.push(`Non-bilingual text at ${nodePath}: ${JSON.stringify(node.text)}`);
        } else {
          bilingualLabelsCount++;
        }
      } else if (typeof node.text === 'string') {
        // If it's a string, ensure it's a dynamic template or acceptable identifier
        if (!node.text.includes('{{') && !node.text.startsWith('#') && node.text.trim().length > 0) {
          warnings.push(`Static string text instead of bilingual object at ${nodePath}: "${node.text}"`);
        }
      }
    }

    // Check props label/placeholder bilingualism
    if (node.props && typeof node.props === 'object') {
      for (const propKey of ['label', 'placeholder', 'hint', 'title']) {
        const val = node.props[propKey];
        if (val !== undefined) {
          if (typeof val === 'object') {
            if (!isBilingual(val)) {
              errors.push(`Non-bilingual prop "${propKey}" at ${nodePath}: ${JSON.stringify(val)}`);
            } else {
              bilingualLabelsCount++;
            }
          } else if (typeof val === 'string' && !val.includes('{{')) {
            warnings.push(`Static string in prop "${propKey}" at ${nodePath}: "${val}"`);
          }
        }
      }
    }

    // Check events / SduiAction
    if (node.events && typeof node.events === 'object') {
      for (const [evtName, actionDef] of Object.entries(node.events)) {
        const actions = Array.isArray(actionDef) ? actionDef : [actionDef];
        for (const act of actions) {
          actionBindingsCount++;
          if (!act.type) {
            errors.push(`Action at ${nodePath}.events.${evtName} missing 'type'`);
          } else {
            if (act.command) actionsFound.add(act.command);
            if (act.target) actionsFound.add(act.target);
            // Verify valid type
            const validTypes = ['tauri:invoke', 'state:set', 'notify', 'navigate'];
            if (!validTypes.includes(act.type)) {
              errors.push(`Action at ${nodePath}.events.${evtName} has unrecognized type '${act.type}'`);
            }
          }
        }
      }
    }
  });

  // 3. Design tokens check
  for (const token of cfg.expectedTokens) {
    if (!classesFound.has(token)) {
      errors.push(`Missing required design token class: "${token}"`);
    }
  }

  // 4. Required actions check
  for (const reqAct of cfg.requiredActions) {
    if (!actionsFound.has(reqAct)) {
      errors.push(`Missing expected action command/target: "${reqAct}"`);
    }
  }

  // 5. Custom functional checks
  if (cfg.customChecks) {
    cfg.customChecks(data, errors);
  }

  console.log(`✓ Total SduiNodes: ${totalNodes}`);
  console.log(`✓ Bilingual Labels Checked: ${bilingualLabelsCount}`);
  console.log(`✓ SduiActions Bound: ${actionBindingsCount}`);
  console.log(`✓ Design Tokens Verified: ${cfg.expectedTokens.join(', ')}`);

  if (warnings.length > 0) {
    console.log(`⚠️ Warnings (${warnings.length}):`);
    warnings.forEach(w => console.log(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error(`❌ Errors (${errors.length}):`);
    errors.forEach(e => console.error(`   - ${e}`));
    return { ok: false, errors };
  }

  console.log(`✅ PASSED: ${cfg.name} (0 errors)`);
  return { ok: true, errors: [] };
}

function run() {
  console.log('Starting FastFree SDUI Packages Verification...\n');
  let allOk = true;
  let totalErrors = 0;

  for (const cfg of SCHEMAS) {
    const res = validateSchema(cfg);
    if (!res.ok) {
      allOk = false;
      totalErrors += res.errors.length;
    }
  }

  console.log(`\n======================================================`);
  console.log(`SUMMARY: ${allOk ? 'ALL SCHEMAS VERIFIED SUCCESSFULLY (0 ERRORS)' : `FAILED WITH ${totalErrors} ERRORS`}`);
  console.log(`======================================================\n`);

  if (!allOk) {
    process.exit(1);
  }
}

run();
