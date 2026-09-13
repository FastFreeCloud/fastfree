import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureAuth } from './ensure-auth.mjs';
import {
  clickAny,
  failshot,
  fillAny,
  pickRadio,
  sleep,
  step,
  tryClick,
} from './helpers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(HERE, 'apps-config.json'), 'utf8'));

export function getApp(key) {
  const app = CFG.apps.find((a) => a.key === key);
  if (!app) {
    throw new Error(`unknown app key: ${key} (want one of: ${CFG.apps.map((a) => a.key).join(', ')})`);
  }
  return app;
}

/**
 * Create one app record in Play Console (Create app wizard).
 * Package name is NOT on this form — it comes from the first uploaded AAB.
 */
export async function createApp(key) {
  const app = getApp(key);
  const { browser, page } = await ensureAuth();
  try {
    step(`=== create app: ${app.name} (${app.package}) ===`);
    await page.goto('https://play.google.com/console', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await tryClick(page, [/accept|agree|موافق|قبول/i], 'cookie banner');

    // Skip if the app row already exists.
    try {
      const existing = page.getByText(app.name, { exact: true });
      if ((await existing.count()) > 0) {
        step(`"${app.name}" already listed — skipping creation`);
        return { skipped: true, app };
      }
    } catch {
      /* fall through to creation */
    }

    await clickAny(page, [/create app|إنشاء التطبيق/i], 'open Create app dialog');
    await sleep(2000);

    const dialog = page.getByRole('dialog');

    // 1. App name
    await fillAny(page, [/app name|اسم التطبيق/i], app.name, 'app name');

    // 2. Default language — prefer Arabic, keep default when unavailable.
    try {
      const lang = page.getByLabel(/default language|اللغة الافتراضية/i);
      await lang.first().waitFor({ state: 'visible', timeout: 6000 });
      const options = await lang.first().locator('option').allTextContents().catch(() => []);
      const arabic = options.find((t) => /arabic|العربية/i.test(t));
      if (arabic) {
        await lang.first().selectOption({ label: arabic });
        step(`default language -> ${arabic}`);
      } else {
        step(`default language: no Arabic option (saw: ${options.slice(0, 5).join(' | ')}) — leaving default`);
      }
    } catch {
      step('default language: dropdown not found — leaving default');
    }

    // 3. App (not game)
    await pickRadio(page, [/^app$/i, /تطبيق/], 'type = App');

    // 4. Free
    await pickRadio(page, [/^free$/i, /مجاني/], 'free');

    // 5. Contact email
    await fillAny(page, [/email|بريد إلكتروني|البريد الإلكتروني/i], CFG.contactEmail, 'contact email');

    // 6. Declarations — check every checkbox in the dialog.
    try {
      const boxes = dialog.getByRole('checkbox');
      const n = await boxes.count();
      for (let i = 0; i < n; i++) {
        try {
          await boxes.nth(i).check();
        } catch {
          /* ignore single failures */
        }
      }
      step(`checked ${n} declaration checkbox(es)`);
    } catch {
      await failshot(page, 'declarations', new Error('declaration checkboxes not found'));
    }

    // 7. Create app (button inside the dialog).
    try {
      const createBtn = dialog.getByRole('button', { name: /create app|إنشاء التطبيق/i });
      await createBtn.first().waitFor({ state: 'visible', timeout: 10000 });
      await createBtn.first().click();
      step('submitted Create app');
    } catch {
      await failshot(page, 'submit', new Error('Create app submit button not found'));
    }

    // Land on the new app dashboard.
    await page.waitForURL(/play\.google\.com\/console/i, { timeout: 60000 });
    await sleep(4000);
    step(`created (or creation submitted): ${app.name} — ${page.url()}`);
    return { skipped: false, app, url: page.url() };
  } finally {
    await browser.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const key = process.argv.find((a, i) => process.argv[i - 1] === '--app') ?? null;
  if (!key) {
    console.error('usage: node scripts/play-console/create-app.mjs --app <pos|erp|hr|ledger>');
    process.exit(1);
  }
  await createApp(key);
  step('DONE');
}
