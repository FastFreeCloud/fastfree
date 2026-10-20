/**
 * Builds brand/brand.json from the sources that already exist.
 *
 * The app metadata is copied from the places that are already authoritative
 * for it, and the screen catalogue is extracted from the lowcode packages
 * so it can never drift from the code.
 *
 *   node scripts/build-brand.mjs            # write brand/brand.json
 *   node scripts/build-brand.mjs --check    # fail if the file is out of date
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'brand', 'brand.json');

/**
 * Read the app context files that the Flow MCP already uses.
 *
 * They carry the features, the imagery hints and the prompt hints, all of
 * which move to the canonical file unchanged.
 */
const FLOW_APPS_DIR = path.join(root, 'fastfree_mcp_tools', 'fastfree_flow_mcp', 'apps');

/**
 * The brand colours, names and taglines.
 *
 * These come from the asset generator, which is what the shipped icons,
 * adaptive icons and splash screens are built from, so the canonical file
 * matches the assets that are already published.
 */
const APPS = [
  {
    key: 'website',
    name: 'FastFree Website',
    nameAr: 'موقع فاست فري الرسمي',
    tagline: 'Fast ERP for fast-moving businesses',
    taglineAr: 'بوابتك السحابية الرسمية',
    subtitle: 'Marketing & Sovereign SaaS Portal',
    subtitleAr: 'البوابة السحابية الرسمية والتطبيقات المؤسسية',
    domain: 'fastfree.cloud',
    url: 'https://fastfree.cloud',
    colors: { primary: '#2563EB', secondary: '#1D4ED8', accent: '#00F0FF', deep: '#0B132B' },
    packages: [],
  },
  {
    key: 'panel',
    name: 'FastFree Panel',
    nameAr: 'لوحة تحكم فاست فري',
    tagline: 'Clan DevOps and fleet operations',
    taglineAr: 'إدارة الخوادم والبنية السحابية',
    subtitle: 'Clan DevOps & Fleet Operations',
    subtitleAr: 'إدارة خوادم كلان والبنية السحابية المؤتمتة',
    domain: 'panel.fastfree.cloud',
    url: 'https://panel.fastfree.cloud',
    colors: { primary: '#4F46E5', secondary: '#3730A3', accent: '#818CF8', deep: '#080816' },
    packages: ['lowcode'],
  },
  {
    key: 'ledger',
    name: 'FastFree Ledger',
    nameAr: 'فاست فري ليدجر',
    tagline: 'Accounting and finance made simple',
    taglineAr: 'محاسبة ومبيعات ومخزون',
    subtitle: 'Accounting, Sales & Inventory',
    subtitleAr: 'دفاتر محاسبية معتمدة ومخزون ومبيعات سيادية',
    domain: 'ledger.fastfree.cloud',
    url: 'https://ledger.fastfree.cloud',
    colors: { primary: '#0D9488', secondary: '#047857', accent: '#34D399', deep: '#031410' },
    packages: ['lowcode', 'auth', 'accounting', 'inventory', 'update'],
  },
  {
    key: 'erp',
    name: 'FastFree ERP',
    nameAr: 'فاست فري للمؤسسات',
    tagline: 'Enterprise operations for fast-moving businesses',
    taglineAr: 'المنظومة المؤسسية وسلاسل الإمداد',
    subtitle: 'Enterprise Operations & Supply Chain',
    subtitleAr: 'المنظومة المؤسسية الكبرى وسلاسل الإمداد والتصنيع',
    domain: 'erp.fastfree.cloud',
    url: 'https://erp.fastfree.cloud',
    colors: { primary: '#D97706', secondary: '#B45309', accent: '#F59E0B', deep: '#170E05' },
    packages: ['lowcode', 'auth', 'accounting', 'inventory', 'sales', 'purchase', 'hr', 'crm', 'update'],
  },
  {
    key: 'pos',
    name: 'FastFree POS',
    nameAr: 'فاست فري نقطة البيع',
    tagline: 'Point of Sale for fast stores',
    taglineAr: 'نظام الكاشير السريع والمبيعات',
    subtitle: 'Point of Sale & Retail Counter',
    subtitleAr: 'نظام الكاشير السريع والمبيعات والتجزئة اللحظية',
    domain: 'pos.fastfree.cloud',
    url: 'https://pos.fastfree.cloud',
    colors: { primary: '#E11D48', secondary: '#9F1239', accent: '#FB7185', deep: '#18040A' },
    packages: ['lowcode', 'auth', 'accounting', 'inventory', 'sales', 'update'],
  },
  {
    key: 'hr',
    name: 'FastFree HR',
    nameAr: 'فاست فري الموارد البشرية',
    tagline: 'Human resources and payroll simplified',
    taglineAr: 'الموارد البشرية والرواتب',
    subtitle: 'Human Resources & Automated Payroll',
    subtitleAr: 'إدارة شؤون الموظفين والرواتب والخدمة الذاتية',
    domain: 'hr.fastfree.cloud',
    url: 'https://hr.fastfree.cloud',
    colors: { primary: '#0284C7', secondary: '#7C3AED', accent: '#C084FC', deep: '#08081A' },
    packages: ['lowcode', 'auth', 'accounting', 'inventory', 'hr', 'crm', 'update'],
  },
];

/**
 * The contact details.
 *
 * These are the union of the website's siteConfig and the poster MCP's
 * contact strip. Every value that appears in both was verified to agree.
 */
const CONTACT = {
  phone: '+201091999937',
  phoneDisplay: '01091999937',
  phoneTel: '+201091999937',
  phoneSa: '+966 57 229 3845',
  phoneSaTel: '+966572293845',
  whatsapp: '+201091999937',
  whatsappEg: 'https://wa.me/201091999937',
  whatsappSa: 'https://wa.me/966572293845',
  email: 'sales@fastfree.cloud',
  address: 'مصر',
  country: 'مصر',
  website: 'fastfree.cloud',
  social: {
    facebook: 'https://www.facebook.com/share/1DHAKK2ek1/',
    twitter: '',
    linkedin: 'https://www.linkedin.com/company/fastfree-cloud/',
    github: '',
    youtube: '',
    instagram: '',
  },
};

/**
 * The output sizes the platforms accept.
 *
 * The sizes come from the platform documentation: Meta requires a JPEG
 * within 4:5 to 1.91:1 and 320 to 1440 px wide, and LinkedIn renders
 * anything between 3:1 and 4:5 uncropped.
 */
const RATIOS = {
  '4:5': {
    width: 1080,
    height: 1350,
    label: 'Portrait feed',
    platforms: ['Facebook feed', 'Instagram feed', 'LinkedIn feed', 'Threads'],
    note: 'Best reach in 2026. Takes the most screen space in a mobile feed.',
  },
  '1:1': {
    width: 1080,
    height: 1080,
    label: 'Square',
    platforms: ['Facebook feed', 'Instagram feed', 'LinkedIn feed', 'Instagram carousel'],
    note: 'Safe on every platform. Slightly cropped in the 3:4 profile grid.',
  },
  '1.91:1': {
    width: 1200,
    height: 630,
    label: 'Link preview',
    platforms: ['Facebook link', 'LinkedIn shared link', 'Open Graph', 'X'],
    note: 'Use for link previews. Small in a feed; the Instagram equivalent is 1080x566.',
  },
  '9:16': {
    width: 1080,
    height: 1920,
    label: 'Story',
    platforms: ['Instagram story', 'Facebook story', 'Reels cover'],
    note: 'Keep text clear of the top and bottom 250 px, where the UI overlays sit.',
  },
  '16:9': {
    width: 1920,
    height: 1080,
    label: 'Landscape',
    platforms: ['YouTube', 'X', 'Presentation'],
    note: 'Wide screens. Not an accepted Instagram feed ratio.',
  },
  '3:4': {
    width: 1080,
    height: 1440,
    label: 'Tall feed',
    platforms: ['Facebook feed', 'Instagram feed'],
    note: 'Fills the 3:4 profile grid with no crop.',
  },
};

/**
 * The master brand palette, used by the LowCode shell.
 *
 * Each application has its own colours in apps[].colors; this ramp is the
 * shell default that the apps override through their brand theme.
 */
const PALETTE = {
  primary: '#1976D2',
  primaryDark: '#1565C0',
  primaryDarker: '#0D47A1',
  secondary: '#26A69A',
  accent: '#9C27B0',
  positive: '#21BA45',
  negative: '#C10015',
  info: '#31CCEC',
  warning: '#F2C037',
  dark: '#1D1D1D',
  darkPage: '#121212',
  border: '#E5E7EB',
  surfaceAlt: '#F7F8FA',
  textSecondary: '#6B7280',
};

/**
 * The shared brand identity, copied from the brand kit document.
 */
const BRAND = {
  company: 'FastFree',
  nameAr: 'فاست فري',
  tagline: 'ERP for fast-moving businesses',
  taglineAr: 'ERP for fast-moving businesses',
  voice: 'direct practical confident short sentences',
  imagery: 'clean flat UI illustration light background generous whitespace soft shadows',
  avoid: 'stock photos of people shaking hands glossy 3D renders cluttered gradients',
  icons: 'mdi-v7',
  fonts: { family: 'Roboto', label: '12px/500', body: '14px/400', headline: '20px/600' },
  palette: PALETTE,
  ratiosText: {
    facebookFeed: '1.91:1 (1200x630)',
    facebookSquare: '1:1 (1080x1080)',
    story: '9:16 (1080x1920)',
  },
};

/**
 * Extract the screen catalogue from the lowcode packages.
 */
function extractScreens() {
  const output = execFileSync(
    process.execPath,
    [path.join(root, 'scripts', 'extract-screens.mjs')],
    { cwd: root, encoding: 'utf8' },
  );
  return JSON.parse(output);
}

/**
 * Read the features and the prompt hints for an app.
 */
function readFlowContext(appKey) {
  const file = path.join(FLOW_APPS_DIR, `${appKey}.json`);
  if (!fs.existsSync(file)) return {};
  const context = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    features: context.features ?? [],
    imageryHints: context.imageryHints ?? [],
    promptHints: context.promptHints ?? [],
    negativeHints: context.negativeHints ?? [],
  };
}

const screens = extractScreens();
const today = new Date().toISOString().slice(0, 10);

const brand = {
  $schema: './brand.schema.json',
  version: 1,
  updatedAt: today,

  brand: BRAND,
  ratios: RATIOS,
  contact: CONTACT,

  screens: screens.map((screen) => ({
    key: screen.key,
    package: screen.package,
    group: screen.group ?? null,
    icon: screen.icon ?? null,
    labelKey: screen.labelKey ?? null,
    labelAr: screen.labelAr ?? null,
    labelEn: screen.labelEn ?? null,
    component: screen.component,
  })),

  apps: APPS.map((app) => ({ ...app, ...readFlowContext(app.key) })),
};

const json = `${JSON.stringify(brand, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (current !== json) {
    console.error('brand/brand.json is out of date. Run: node scripts/build-brand.mjs');
    process.exit(1);
  }
  console.log('brand/brand.json is up to date');
} else {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, json, 'utf8');
  console.log(`wrote ${path.relative(root, outFile)}`);
  console.log(`  ${brand.apps.length} apps, ${brand.screens.length} screens`);
  for (const app of brand.apps) {
    const count = brand.screens.filter((s) => app.packages.includes(s.package)).length;
    console.log(`  ${app.key.padEnd(9)} ${String(count).padStart(2)} screens`);
  }
}
