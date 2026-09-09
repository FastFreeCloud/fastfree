import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = join(import.meta.dirname, '..');
const APPS_DIR = join(ROOT, 'apps');
const PRODUCTS_TS = join(APPS_DIR, 'fastfree_website', 'src', 'data', 'products.ts');

const APPS = [
  { name: 'fastfree_pos', slug: 'fastfree-pos-app', color: '#22c55e' },
  { name: 'fastfree_erp', slug: 'fastfree-erp-app', color: '#3b82f6' },
  { name: 'fastfree_hr', slug: 'fastfree-hr-app', color: '#a855f7' },
  { name: 'fastfree_ledger', slug: 'fastfree-ledger-app', color: '#f59e0b' },
];

const LOCALES = ['ar', 'en-US'];

function parseProducts(tsSource) {
  const body = tsSource
    .replace(/export\s+type\s+Product\s*=\s*\{[\s\S]*?\};\s*/m, '')
    .replace(/export\s+(const|let|var)\s+products\s*:\s*Product\[\]\s*=\s*/, 'return ')
    .replace(/;\s*$/, '');

  const fn = new Function(body);
  return fn();
}

function getProductForApp(products, slug) {
  return products.find((p) => p.slug === slug) || null;
}

function truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '\u2026';
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function writeFileEnsured(filePath, content) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, 'utf-8');
}

function getVersionCode(appDir) {
  if (process.env.VERSION_CODE) return process.env.VERSION_CODE;
  const capConfig = join(appDir, 'src-capacitor', 'capacitor.config.ts');
  if (!existsSync(capConfig)) return '1';
  const source = readFileSync(capConfig, 'utf-8');
  const match = source.match(/versionCode['":\s]+(\d+)/);
  return match ? match[1] : '1';
}

function getGitLog() {
  try {
    const log = execSync('git log --oneline -8', { cwd: ROOT, encoding: 'utf-8' }).trim();
    return log || 'Bug fixes and improvements';
  } catch {
    return 'Bug fixes and improvements';
  }
}

const productsSource = readFileSync(PRODUCTS_TS, 'utf-8');
const products = parseProducts(productsSource);
const gitChangelog = getGitLog();
const versionCode = process.env.VERSION_CODE || '1';

for (const app of APPS) {
  const product = getProductForApp(products, app.slug);
  const appDir = join(APPS_DIR, app.name);
  const outRoot = join(appDir, 'fastlane', 'metadata', 'android');

  for (const locale of LOCALES) {
    const isArabic = locale === 'ar';
    const outDir = join(outRoot, locale);

    if (product) {
      const title = isArabic ? product.name_ar : product.name_en;
      const shortDesc = isArabic ? product.short_description_ar : product.short_description_en;
      const fullDesc = isArabic ? product.description_ar : product.description_en;

      writeFileEnsured(join(outDir, 'title.txt'), truncate(title, 30));
      writeFileEnsured(join(outDir, 'short_description.txt'), truncate(shortDesc, 80));
      writeFileEnsured(join(outDir, 'full_description.txt'), truncate(fullDesc, 4000));

      console.log(`[${app.name}/${locale}] title: ${truncate(title, 30)}`);
      console.log(`[${app.name}/${locale}] short: ${truncate(shortDesc, 80)}`);
    } else {
      console.log(`[${app.name}/${locale}] Product not found for slug "${app.slug}", skipping text.`);
    }

    const changelogDir = join(outDir, 'changelogs');
    writeFileEnsured(join(changelogDir, `${versionCode}.txt`), gitChangelog);
    console.log(`[${app.name}/${locale}] changelogs/${versionCode}.txt written.`);

    const iconSource = join(appDir, 'public', 'icons', 'icon-512x512.png');
    const iconDest = join(outDir, 'images', 'icon.png');
    if (existsSync(iconSource)) {
      ensureDir(dirname(iconDest));
      copyFileSync(iconSource, iconDest);
      console.log(`[${app.name}/${locale}] icon.png copied.`);
    } else {
      console.log(`[${app.name}/${locale}] icon-512x512.png not found, skipping.`);
    }

    const fgSource = join(appDir, 'src', 'assets', `feature-graphic-${locale}.png`);
    const fgDest = join(outDir, 'images', 'feature-graphic.png');
    if (existsSync(fgSource)) {
      copyFileSync(fgSource, fgDest);
      console.log(`[${app.name}/${locale}] feature-graphic.png reused from assets.`);
    }
  }

  console.log(`--- ${app.name} done ---`);
}

console.log(`\nAll metadata generated (versionCode=${versionCode}).`);