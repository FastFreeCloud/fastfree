import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── paths ────────────────────────────────────────────────────────────────
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const AUTH_DIR = join(REPO_ROOT, '.auth', 'play-console');
const PROFILE_DIR = join(AUTH_DIR, 'profile');
const STATE_FILE = join(AUTH_DIR, 'state.json');
const CFG = JSON.parse(readFileSync(join(HERE, 'apps-config.json'), 'utf8'));

const aabFor = (key) => join(REPO_ROOT, '.auth', 'aabs', key, 'app-release.aab');

// ── tiny helpers ─────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
mkdirSync(AUTH_DIR, { recursive: true });

async function failshot(page, name, err) {
  try {
    const file = join(AUTH_DIR, `fail-${name}-${Date.now()}.png`);
    await page.screenshot({ path: file });
    console.error(`FAIL[${name}]: ${err?.message || err}\n  url=${page.url()}\n  shot=${file}`);
  } catch {
    console.error(`FAIL[${name}]: ${err?.message || err}`);
  }
  throw err instanceof Error ? err : new Error(String(err));
}

async function clickAny(page, patterns, desc) {
  for (const re of patterns) {
    for (const role of ['button', 'link']) {
      try {
        const loc = page.getByRole(role, { name: re });
        await loc.first().waitFor({ state: 'visible', timeout: 4000 });
        await loc.first().click();
        step(`clicked ${role}: ${desc}`);
        return;
      } catch { /* next */ }
    }
    try {
      const txt = page.getByText(re);
      await txt.first().waitFor({ state: 'visible', timeout: 4000 });
      await txt.first().click();
      step(`clicked text: ${desc}`);
      return;
    } catch { /* next */ }
  }
  await failshot(page, desc, new Error(`nothing clickable matched: ${desc}`));
}

async function tryClick(page, patterns, desc) {
  for (const re of patterns) {
    try {
      const b = page.getByRole('button', { name: re });
      await b.first().waitFor({ state: 'visible', timeout: 3000 });
      await b.first().click();
      step(`clicked (optional): ${desc}`);
      return true;
    } catch { /* next */ }
  }
  return false;
}

async function fillAny(page, patterns, value, desc) {
  for (const re of patterns) {
    for (const by of ['label', 'placeholder']) {
      try {
        const f = by === 'label' ? page.getByLabel(re) : page.getByPlaceholder(re);
        await f.first().waitFor({ state: 'visible', timeout: 4000 });
        await f.first().fill(value);
        step(`filled: ${desc}`);
        return;
      } catch { /* next */ }
    }
  }
  await failshot(page, desc, new Error(`no input matched: ${desc}`));
}

async function pickOne(page, role, patterns, desc, action = 'check') {
  for (const re of patterns) {
    try {
      const loc = page.getByRole(role, { name: re });
      await loc.first().waitFor({ state: 'visible', timeout: 4000 });
      if (action === 'check') await loc.first().check();
      else await loc.first().click();
      step(`${action === 'check' ? 'checked' : 'clicked'} ${role}: ${desc}`);
      return;
    } catch { /* next */ }
  }
  await failshot(page, desc, new Error(`no ${role} matched: ${desc}`));
}

// ── phase 1: login (human, once) ─────────────────────────────────────────
async function loginPhase() {
  if (existsSync(STATE_FILE)) {
    step('saved session found — will verify after opening the browser');
  } else {
    step('NO saved session — you will log in with your own hands in the opened window.');
  }
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: null,
    locale: 'en-US',
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto('https://play.google.com/console');
  step('⏳ Waiting for YOU to log in (owner account + 2FA) — no timeout…');
  await page.waitForURL(/play\.google\.com\/console/, { timeout: 0 });
  await sleep(3000);
  await context.storageState({ path: STATE_FILE, indexedDB: true });
  step(`session saved -> ${STATE_FILE}`);
  return { context, page };
}

// ── phase 2: create app record ───────────────────────────────────────────
async function createApp(page, app) {
  step(`--- [${app.key}] create: ${app.name} ---`);
  await page.goto('https://play.google.com/console', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  await tryClick(page, [/accept|agree|موافق|قبول/i], 'cookie banner');

  try {
    if ((await page.getByText(app.name, { exact: true }).count()) > 0) {
      step(`"${app.name}" already listed — skipping creation`);
      return;
    }
  } catch { /* create it */ }

  await clickAny(page, [/create app|إنشاء التطبيق/i], 'open Create app');
  await sleep(2000);
  const dialog = page.getByRole('dialog');

  await fillAny(page, [/app name|اسم التطبيق/i], app.name, 'app name');

  try {
    const lang = page.getByLabel(/default language|اللغة الافتراضية/i);
    await lang.first().waitFor({ state: 'visible', timeout: 6000 });
    const options = await lang.first().locator('option').allTextContents().catch(() => []);
    const arabic = options.find((t) => /arabic|العربية/i.test(t));
    if (arabic) {
      await lang.first().selectOption({ label: arabic });
      step(`language -> ${arabic}`);
    } else step('language: leaving default');
  } catch { step('language: leaving default'); }

  await pickOne(page, 'radio', [/^app$/i, /تطبيق/], 'type = App');
  await pickOne(page, 'radio', [/^free$/i, /مجاني/], 'free');
  await fillAny(page, [/email|بريد إلكتروني|البريد الإلكتروني/i], CFG.contactEmail, 'contact email');

  try {
    const boxes = dialog.getByRole('checkbox');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) {
      try { await boxes.nth(i).check(); } catch { /* ignore */ }
    }
    step(`checked ${n} declaration(s)`);
  } catch {
    await failshot(page, 'declarations', new Error('declaration checkboxes not found'));
  }

  try {
    const btn = dialog.getByRole('button', { name: /create app|إنشاء التطبيق/i });
    await btn.first().waitFor({ state: 'visible', timeout: 10000 });
    await btn.first().click();
    step('submitted Create app');
  } catch {
    await failshot(page, 'submit', new Error('Create app submit button not found'));
  }
  await page.waitForURL(/play\.google\.com\/console/i, { timeout: 60000 });
  await sleep(4000);
  step(`created: ${app.name}`);
}

// ── phase 3: invite service account ──────────────────────────────────────
async function inviteSA(page, app) {
  step(`--- [${app.key}] invite SA on ${app.name} ---`);
  await page.goto('https://play.google.com/console/users-and-permissions', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  await tryClick(page, [/accept|agree|موافق|قبول/i], 'cookie banner');

  await clickAny(page, [/invite new users?|دعوة مستخدمين/i], 'Invite new users');
  await sleep(2000);
  await fillAny(page, [/email|بريد إلكتروني|البريد الإلكتروني/i], CFG.serviceAccount, 'SA email');

  await clickAny(page, [/app permissions|أذونات التطبيق/i], 'App permissions tab');
  await sleep(1000);
  await clickAny(page, [/add app|إضافة تطبيق/i], 'Add app');
  await sleep(2000);
  const safe = app.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await pickOne(page, 'checkbox', [new RegExp(safe, 'i')], `select ${app.name}`);
  await clickAny(page, [/^apply$|تطبيق/i], 'Apply app selection');
  await sleep(1500);

  await pickOne(page, 'checkbox', [/release apps to testing tracks/i], 'testing-tracks permission');
  await pickOne(page, 'checkbox', [/release to production, exclude devices/i], 'production permission');

  await clickAny(page, [/invite users?|دعوة|إرسال الدعوة/i], 'Invite user');
  await sleep(4000);
  step(`invited ${CFG.serviceAccount} on ${app.name} (expect Active)`);
}

// ── phase 4: first AAB upload ────────────────────────────────────────────
async function uploadFirstAab(page, app) {
  const aab = aabFor(app.key);
  if (!existsSync(aab)) {
    step(`[${app.key}] AAB missing at ${aab} — SKIPPING upload (create+invite done)`);
    return;
  }
  step(`--- [${app.key}] first AAB: ${app.package} ---`);
  await page.goto('https://play.google.com/console', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  await tryClick(page, [/accept|agree|موافق|قبول/i], 'cookie banner');

  await clickAny(page, [new RegExp(`^${app.name}$`)], `open ${app.name}`);
  await sleep(3000);
  await clickAny(page, [/test and release|الاختبار والإصدار/i], 'Test and release');
  await sleep(1500);
  await clickAny(page, [/internal testing|الاختبار الداخلي/i], 'Internal testing');
  await sleep(3000);
  await clickAny(page, [/create new release|إنشاء إصدار/i], 'Create new release');
  await sleep(2500);

  if (await tryClick(page, [/continue|متابعة|accept|قبول|let google manage/i], 'Play App Signing')) {
    await sleep(2000);
    await tryClick(page, [/continue|متابعة|accept|قبول|save|حفظ/i], 'signing confirm');
    await sleep(2000);
  }

  const inputs = page.locator('input[type="file"]');
  if ((await inputs.count()) === 0) {
    await failshot(page, 'upload', new Error('no file input on release page'));
  }
  await inputs.first().setInputFiles(aab);
  step('AAB attached — waiting for processing (up to 5 min)…');
  const review = page.getByRole('button', { name: /review release|مراجعة الإصدار/i });
  try {
    await review.first().waitFor({ state: 'visible', timeout: 300000 });
  } catch {
    await failshot(page, 'upload-wait', new Error('upload did not finish in 5 minutes'));
  }
  await sleep(2000);
  await review.first().click();
  step('review opened');
  await sleep(2500);
  await clickAny(page, [/start rollout to internal|بدء الطرح/i], 'Start rollout to Internal');
  await sleep(4000);
  step(`rolling out to Internal: ${app.name}`);
}

// ── main ─────────────────────────────────────────────────────────────────
const onlyKey = process.argv.find((a, i) => process.argv[i - 1] === '--app') ?? null;
const apps = onlyKey ? CFG.apps.filter((a) => a.key === onlyKey) : CFG.apps;
if (onlyKey && apps.length === 0) {
  console.error(`unknown --app ${onlyKey} (want: ${CFG.apps.map((a) => a.key).join(', ')})`);
  process.exit(1);
}

step(`PLAY CONSOLE SETUP — ${apps.length} app(s): ${apps.map((a) => a.key).join(', ')}`);
const { context, page } = await loginPhase();
try {
  for (const app of apps) await createApp(page, app);
  for (const app of apps) await inviteSA(page, app);
  for (const app of apps) await uploadFirstAab(page, app);
  step('=== ALL DONE ===');
} finally {
  await context.close();
}
