import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureAuth } from './ensure-auth.mjs';
import { clickAny, failshot, fillAny, pickCheckbox, sleep, step, tryClick } from './helpers.mjs';
import { getApp } from './create-app.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(HERE, 'apps-config.json'), 'utf8'));

/**
 * Invite the publisher Service Account on one app (least privilege, per-app):
 * Users and permissions → Invite new users → App permissions → Add app →
 * "Release apps to testing tracks" (+ production permission) → Invite.
 * Service accounts become Active immediately (no acceptance click).
 */
export async function inviteSA(key) {
  const app = getApp(key);
  const { browser, page } = await ensureAuth();
  try {
    step(`=== invite SA on: ${app.name} ===`);
    step(`SA: ${CFG.serviceAccount}`);
    await page.goto('https://play.google.com/console/users-and-permissions', {
      waitUntil: 'domcontentloaded',
    });
    await sleep(3000);
    await tryClick(page, [/accept|agree|موافق|قبول/i], 'cookie banner');

    await clickAny(page, [/invite new users?|دعوة مستخدمين/i], 'Invite new users');
    await sleep(2000);

    await fillAny(page, [/email|بريد إلكتروني|البريد الإلكتروني/i], CFG.serviceAccount, 'SA email');

    // Per-app permissions (least privilege).
    await clickAny(page, [/app permissions|أذونات التطبيق/i], 'App permissions tab');
    await sleep(1000);
    await clickAny(page, [/add app|إضافة تطبيق/i], 'Add app');
    await sleep(2000);
    await pickCheckbox(page, [new RegExp(app.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')], `select app ${app.name}`);
    await clickAny(page, [/^apply$|تطبيق/i], 'Apply app selection');
    await sleep(1500);

    // Minimum permissions for API uploads (testing now, production later).
    await pickCheckbox(page, [/release apps to testing tracks/i], 'Release apps to testing tracks');
    await pickCheckbox(
      page,
      [/release to production, exclude devices/i],
      'Release to production + Play App Signing',
    );

    await clickAny(page, [/invite users?|دعوة|إرسال الدعوة/i], 'Invite user');
    await sleep(4000);

    const body = await page.textContent('body').catch(() => '');
    if (/active|نشط/i.test(body ?? '')) {
      step(`invite ACTIVE: ${CFG.serviceAccount} on ${app.name}`);
    } else {
      step('invite submitted — verify status shows Active in Users and permissions');
    }
    return { app, url: page.url() };
  } finally {
    await browser.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const key = process.argv.find((a, i) => process.argv[i - 1] === '--app') ?? null;
  const all = process.argv.includes('--all');
  if (all) {
    for (const a of CFG.apps) {
      await inviteSA(a.key);
    }
  } else if (key) {
    await inviteSA(key);
  } else {
    console.error('usage: node scripts/play-console/invite-sa.mjs --app <key> | --all');
    process.exit(1);
  }
  step('DONE');
}
