/**
 * Extracts the screen catalogue from the lowcode packages.
 *
 * Every package registers its screens with registerScreen(type, {label})
 * and carries an Arabic and English label in its locale files. This script
 * reads both and prints the result, so the catalogue in brand/brand.json is
 * derived from the code rather than written by hand.
 *
 *   node scripts/extract-screens.mjs            # print JSON
 *   node scripts/extract-screens.mjs --md       # print a markdown table
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The packages that ship screens, and where their locale files live. */
const PACKAGES = [
  { package: 'sales', dir: 'packages/fastfree_sales' },
  { package: 'accounting', dir: 'packages/fastfree_accounting' },
  { package: 'inventory', dir: 'packages/fastfree_inventory' },
  { package: 'purchase', dir: 'packages/fastfree_purchase' },
  { package: 'hr', dir: 'packages/fastfree_hr' },
  { package: 'crm', dir: 'packages/fastfree_crm' },
  { package: 'auth', dir: 'packages/fastfree_auth' },
  { package: 'lowcode', dir: 'packages/fastfree_lowcode' },
];

/**
 * Read every locale file in a package and return its flat key to value map.
 *
 * The locale files are TypeScript modules that export an object literal, so
 * they are read as text and the string pairs are extracted. A full
 * TypeScript parser is not needed for this and would add a dependency.
 */
function readLocale(file) {
  const map = new Map();
  if (!fs.existsSync(file)) return map;

  const source = fs.readFileSync(file, 'utf8');
  // Matches  key: 'value'  and  "key": "value"  pairs.
  const pattern = /(['"]?)([A-Za-z0-9_.-]+)\1\s*:\s*(['"])((?:\\.|(?!\3).)*)\3/g;
  let match = pattern.exec(source);
  while (match !== null) {
    map.set(match[2], match[4].replace(/\\'/g, "'").replace(/\\"/g, '"'));
    match = pattern.exec(source);
  }
  return map;
}

/**
 * Find the screen registrations in a package.
 *
 * The packages declare their screens as an array of descriptors and then
 * register them in a loop:
 *
 *   { type: 'sales-invoices', loader: () => import('./screens/SalesInvoiceList.vue'),
 *     label: 'sales.salesInvoices', icon: 'mdi-receipt' }
 *   registerScreen(s.type, { component, label: s.label, icon: s.icon, groupId: GROUP })
 *
 * The descriptor carries the type, the component and the locale key, so the
 * descriptor is what gets parsed. The group is read from the constant that
 * is passed as groupId.
 */
function readRegistrations(dir) {
  const found = new Map();

  const candidates = [
    path.join(dir, 'src', 'screens.ts'),
    path.join(dir, 'src', 'screens', 'register.ts'),
    path.join(dir, 'src', 'screenRegistration.ts'),
    path.join(dir, 'src', 'init.ts'),
    path.join(dir, 'src', 'runtime', 'composables', 'screen-registry.ts'),
  ];

  // A screen descriptor. The shape varies between packages: some use
  // { type, loader, label, icon }, some use { type, component, label, icon },
  // and the quoting varies too. The component slot accepts either a lazy
  // import or a reference to a statically imported component.
  const descriptor = new RegExp(
    String.raw`\{\s*type\s*:\s*['"]([^'"]+)['"]\s*,` +
    String.raw`\s*(?:loader\s*:\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)|component\s*:\s*([A-Za-z0-9_]+))\s*,` +
    String.raw`\s*label\s*:\s*['"]([^'"]+)['"]\s*,` +
    String.raw`\s*icon\s*:\s*['"]([^'"]+)['"]`,
    'g',
  );

  // The group constant, for example SALES_GROUP = 'sales.sales'
  const groupConstant = /const\s+[A-Z_]*GROUP[A-Z_]*\s*=\s*'([^']+)'/g;

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8');

    let match = descriptor.exec(source);
    while (match !== null) {
      const [, type, loaderPath, componentRef, labelKey, icon] = match;
      if (!found.has(type)) {
        found.set(type, {
          type,
          componentPath: loaderPath ?? null,
          componentRef: componentRef ?? null,
          labelKey,
          icon,
          group: null,
        });
      }
      match = descriptor.exec(source);
    }

    // A package may import the components statically and reference them by
    // name, for example:
    //   import InventoryDashboard from './screens/InventoryDashboard.vue'
    //   { type: 'inventory-dashboard', component: InventoryDashboard, ... }
    const staticImports = new Map();
    const importPattern = /import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"]/g;
    let importMatch = importPattern.exec(source);
    while (importMatch !== null) {
      staticImports.set(importMatch[1], importMatch[2]);
      importMatch = importPattern.exec(source);
    }

    // The lowcode package registers its built-in screens as a plain object:
    //   'splash': { component: LcSplashScreen, icon: 'mdi-power' },
    // The component is a local const, so the const name is mapped back to
    // the file it was imported from.
    //
    // These screens carry no locale key of their own. The label lives in the
    // global screens.* set, so the key is listed here.
    const BUILT_IN_LABELS = {
      splash: null,
      errors: 'screens.errorLogs',
      'error-logs': 'screens.errorLogs',
      about: 'screens.about',
      settings: 'screens.settings',
      'translation-editor': 'screens.translationEditor',
      theme: 'screens.theme',
      shortcuts: 'screens.shortcuts',
      privacy: null,
      'structure-inspector': 'screens.structureInspector',
      'pinia-debugger': 'screens.piniaDebugger',
    };

    const builtIn = /'([a-z0-9-]+)'\s*:\s*\{\s*component\s*:\s*([A-Za-z0-9_]+)\s*,\s*(?:icon\s*:\s*'([^']+)'\s*,\s*)?groupId\s*:\s*'([^']+)'/g;
    let builtInMatch = builtIn.exec(source);
    while (builtInMatch !== null) {
      const [, type, componentConst, icon, group] = builtInMatch;

      // The const was created by a lazy import of a component file.
      const importPattern = new RegExp(`const\\s+${componentConst}\\s*=\\s*defineAsyncComponent\\(\\(\\)\\s*=>\\s*import\\('([^']+)'\\)`);
      const componentPath = importPattern.exec(source)?.[1] ?? null;

      if (!found.has(type)) {
        found.set(type, {
          type,
          componentPath,
          labelKey: BUILT_IN_LABELS[type] ?? null,
          icon: icon ?? null,
          group,
        });
      }
      builtInMatch = builtIn.exec(source);
    }

    // The group is passed as groupId in the registerScreen call, so the
    // constant used there is the group for every screen in the file.
    let groupMatch = groupConstant.exec(source);
    const groups = [];
    while (groupMatch !== null) {
      groups.push(groupMatch[1]);
      groupMatch = groupConstant.exec(source);
    }

    if (groups.length === 1) {
      for (const entry of found.values()) {
        if (!entry.group) entry.group = groups[0];
      }
    }

    // Resolve a statically imported component to its file.
    for (const entry of found.values()) {
      if (!entry.componentPath && entry.componentRef) {
        entry.componentPath = staticImports.get(entry.componentRef) ?? null;
      }
    }
  }

  return found;
}

/**
 * Resolve a locale key to a value, trying the package namespace first and
 * then the global lowcode set.
 */
function resolveLabel(labelKey, namespace, packageLocales, globalLocales) {
  if (!labelKey) return null;

  // The registry stores the raw key, and registerMessages prefixes the
  // namespace, so the key can be found either bare or namespaced.
  const bare = labelKey.includes('.') ? labelKey.split('.').pop() : labelKey;

  const attempts = [
    packageLocales.get(labelKey),
    packageLocales.get(bare),
    globalLocales.get(labelKey),
    globalLocales.get(bare),
    globalLocales.get(`screens.${bare}`),
  ];

  for (const value of attempts) {
    if (value) return value;
  }
  return null;
}

/**
 * The English label for a screen that has no locale key of its own.
 *
 * A few screens, such as the splash and the privacy screen, are registered
 * without a label because they are never shown in a menu. The English name
 * is used instead so the catalogue always has something to show.
 */
const FALLBACK_LABELS = {
  splash: 'Splash',
  privacy: 'Privacy',
};

/** The global lowcode message set, which holds the screens.* keys. */
function readGlobalLocales() {
  const dir = path.join(root, 'packages', 'fastfree_lowcode', 'src', 'runtime');
  return {
    en: readLocale(path.join(dir, 'messages-en.ts')),
    ar: readLocale(path.join(dir, 'messages-ar.ts')),
  };
}

const global = readGlobalLocales();
const screens = [];

for (const { package: pkg, dir } of PACKAGES) {
  const packageDir = path.join(root, dir);
  if (!fs.existsSync(packageDir)) continue;

  const locales = {
    en: readLocale(path.join(packageDir, 'src', 'locales', 'en.ts')),
    ar: readLocale(path.join(packageDir, 'src', 'locales', 'ar.ts')),
  };

  const registrations = readRegistrations(packageDir);

  for (const registration of registrations.values()) {
    // The component path is relative to the file that declared it, and the
    // packages are under packages/, so the repository relative path is built
    // from that. Some packages import from ./screens/ and some from ./.
    let component = null;
    if (registration.componentPath) {
      const relative = registration.componentPath.replace(/^\.\//, '');
      const candidates = [
        path.join(packageDir, 'src', relative),
        path.join(packageDir, 'src', 'screens', relative),
        path.join(packageDir, 'src', 'runtime', 'components', relative),
      ];
      const match = candidates.find((candidate) => fs.existsSync(candidate));
      if (match) {
        component = path
          .relative(root, match)
          .split(path.sep)
          .join('/');
      }
    }

    screens.push({
      key: registration.type,
      package: pkg,
      group: registration.group,
      icon: registration.icon,
      labelKey: registration.labelKey,
      labelAr: resolveLabel(registration.labelKey, pkg, locales.ar, global.ar),
      labelEn: resolveLabel(registration.labelKey, pkg, locales.en, global.en)
        ?? FALLBACK_LABELS[registration.type]
        ?? null,
      component,
    });
  }
}

if (process.argv.includes('--md')) {
  console.log('| key | package | AR | EN | component |');
  console.log('|---|---|---|---|---|');
  for (const screen of screens) {
    console.log(`| \`${screen.key}\` | ${screen.package} | ${screen.labelAr ?? '—'} | ${screen.labelEn ?? '—'} | \`${screen.component ?? '—'}\` |`);
  }
} else {
  console.log(JSON.stringify(screens, null, 2));
}

console.error(`\n${screens.length} screens extracted from ${PACKAGES.length} packages.`);
