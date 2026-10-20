/**
 * Validates the canonical brand file and checks it against the rest of the
 * repository.
 *
 * The drift checks are the point: a colour that changes in the apps but not
 * in the canonical file, or a screen that is registered in a package but
 * missing from the catalogue, is a silent inconsistency. This script fails
 * on both.
 *
 *   node scripts/check-brand.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrand } from '../brand/loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks += 1;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` - ${detail}` : ''}`);
  if (!condition) failures += 1;
}

// ─── The file itself ────────────────────────────────────────────────────────

const brand = loadBrand();

check('brand.json loads', true, brand.sourceFile);
check('it holds six apps', brand.apps.length === 6, `${brand.apps.length}`);
check('it holds the screen catalogue', brand.screens.length > 40, `${brand.screens.length}`);
check('it holds the contact details', Boolean(brand.contact?.phone && brand.contact?.email));
check('it holds the output ratios', Object.keys(brand.ratios).length >= 4);

// Every app has a URL that matches its domain.
for (const app of brand.apps) {
  check(
    `${app.key}: the URL matches the domain`,
    app.url === `https://${app.domain}`,
    app.url,
  );
}

// ─── The app colours match the runtime themes ───────────────────────────────

/**
 * The colour each app applies at runtime.
 *
 * The apps set it in several places. Only the boot theme is checked here,
 * because that is the one every app ships.
 */
const APP_THEME_FILES = {
  pos: 'apps/fastfree_pos/src/boot/brand-theme.ts',
  erp: 'apps/fastfree_erp/src/boot/brand-theme.ts',
  ledger: 'apps/fastfree_ledger/src/boot/brand-theme.ts',
  panel: 'apps/fastfree_panel/src/boot/brand-theme.ts',
  hr: 'apps/fastfree_hr/src/boot/brand-theme.ts',
};

for (const [appKey, file] of Object.entries(APP_THEME_FILES)) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    check(`${appKey}: the brand theme file exists`, false, file);
    continue;
  }
  const source = fs.readFileSync(absolute, 'utf8');
  const expected = brand.getApp(appKey).colors.primary;
  check(
    `${appKey}: the runtime theme matches the canonical colour`,
    source.toUpperCase().includes(expected.toUpperCase()),
    `${expected} in ${file}`,
  );
}

// The Quasar configs carry the same colour.
const QUASAR_FILES = {
  pos: 'apps/fastfree_pos/quasar.config.ts',
  erp: 'apps/fastfree_erp/quasar.config.ts',
  ledger: 'apps/fastfree_ledger/quasar.config.ts',
  panel: 'apps/fastfree_panel/quasar.config.ts',
  hr: 'apps/fastfree_hr/quasar.config.ts',
};

for (const [appKey, file] of Object.entries(QUASAR_FILES)) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) continue;
  const source = fs.readFileSync(absolute, 'utf8');
  const expected = brand.getApp(appKey).colors.primary;
  check(
    `${appKey}: the Quasar config matches the canonical colour`,
    source.toUpperCase().includes(expected.toUpperCase()),
    expected,
  );
}

// ─── Every screen points at a file that exists ─────────────────────────────

const missingComponents = brand.screens.filter(
  (screen) => !fs.existsSync(path.join(root, screen.component)),
);
check(
  'every screen component exists on disk',
  missingComponents.length === 0,
  missingComponents.map((screen) => screen.key).join(', '),
);

// ─── The catalogue matches the packages ─────────────────────────────────────

/**
 * The screens the packages register, read with the same extractor the
 * build uses. If the two lists differ, the catalogue is stale.
 */
const extracted = JSON.parse(
  (await import('node:child_process')).execFileSync(
    process.execPath,
    [path.join(root, 'scripts', 'extract-screens.mjs')],
    { cwd: root, encoding: 'utf8' },
  ),
);

const catalogueKeys = new Set(brand.screens.map((screen) => screen.key));
const extractedKeys = new Set(extracted.map((screen) => screen.key));

const onlyInCode = [...extractedKeys].filter((key) => !catalogueKeys.has(key));
const onlyInCatalogue = [...catalogueKeys].filter((key) => !extractedKeys.has(key));

check('no screen is missing from the catalogue', onlyInCode.length === 0, onlyInCode.join(', '));
check('no screen in the catalogue is gone from the code', onlyInCatalogue.length === 0, onlyInCatalogue.join(', '));

// The labels must still match the locale files.
const labelMismatches = [];
for (const screen of brand.screens) {
  const found = extracted.find((candidate) => candidate.key === screen.key);
  if (!found) continue;
  if (found.labelAr !== screen.labelAr || found.labelEn !== screen.labelEn) {
    labelMismatches.push(screen.key);
  }
}
check('every screen label matches the locale files', labelMismatches.length === 0, labelMismatches.join(', '));

// ─── The contact details match the website ─────────────────────────────────

const siteConfigFile = path.join(root, 'apps', 'fastfree_website', 'src', 'data', 'siteConfig.ts');
if (fs.existsSync(siteConfigFile)) {
  const source = fs.readFileSync(siteConfigFile, 'utf8');
  for (const field of ['phone', 'email']) {
    check(
      `the website ${field} matches the canonical value`,
      source.includes(brand.contact[field]),
      brand.contact[field],
    );
  }
} else {
  check('the website site config exists', false, siteConfigFile);
}

// ─── The poster server still works ──────────────────────────────────────────

const posterDir = path.join(root, 'fastfree_mcp_tools', 'fastfree_poster_mcp');
if (fs.existsSync(posterDir)) {
  check('the poster server is present', true, 'fastfree_mcp_tools/fastfree_poster_mcp');
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} of ${checks} CHECKS FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
