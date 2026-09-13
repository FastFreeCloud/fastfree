import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureAuth } from './ensure-auth.mjs';
import { clickAny, failshot, sleep, step, tryClick } from './helpers.mjs';
import { getApp } from './create-app.mjs';

/**
 * Upload the FIRST AAB of one app via UI (required once per app):
 * select app → Test and release → Testing → Internal testing →
 * Create new release → Upload AAB → (Play App Signing defaults) →
 * Review release → Start rollout to Internal.
 *
 * Prefer this for the first upload; later uploads go through the API.
 */
export async function uploadFirstAab(key, aabPath) {
  const app = getApp(key);
  if (!aabPath || !existsSync(aabPath)) {
    throw new Error(`AAB not found: ${aabPath}\nDownload it first, e.g.:\n  gh run download <run-id> -n ${app.artifact} -D .auth/aabs/${key}`);
  }
  const { browser, page } = await ensureAuth();
  try {
    step(`=== first AAB upload: ${app.name} (${app.package}) ===`);
    step(`file: ${aabPath}`);
    await page.goto('https://play.google.com/console', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await tryClick(page, [/accept|agree|موافق|قبول/i], 'cookie banner');

    // Open the app.
    await clickAny(page, [new RegExp(`^${app.name}$`)], `open app ${app.name}`);
    await sleep(3000);

    // Internal testing track.
    await clickAny(page, [/test and release|الاختبار والإصدار/i], 'Test and release nav');
    await sleep(1500);
    await clickAny(page, [/internal testing|الاختبار الداخلي/i], 'Internal testing track');
    await sleep(3000);

    // New release + file upload.
    await clickAny(page, [/create new release|إنشاء إصدار/i], 'Create new release');
    await sleep(2500);

    // First-time Play App Signing prompt (accept Google defaults when shown).
    const signed = await tryClick(page, [/continue|متابعة|accept|قبول|let google manage/i], 'Play App Signing continue');
    if (signed) {
      await sleep(2000);
      await tryClick(page, [/continue|متابعة|accept|قبول|save|حفظ/i], 'Play App Signing confirm');
      await sleep(2000);
    }

    const inputs = page.locator('input[type="file"]');
    const nInputs = await inputs.count();
    if (nInputs === 0) {
      await failshot(page, 'upload', new Error('no file input found on release page'));
    }
    await inputs.first().setInputFiles(aabPath);
    step('AAB attached — waiting for upload to finish…');

    // Wait until processing finishes (Review button becomes enabled).
    const review = page.getByRole('button', { name: /review release|مراجعة الإصدار/i });
    try {
      await review.first().waitFor({ state: 'visible', timeout: 300000 });
    } catch {
      await failshot(page, 'upload-wait', new Error('upload did not finish within 5 minutes'));
    }
    await sleep(2000);
    await review.first().click();
    step('opened Review release');
    await sleep(2500);

    await clickAny(page, [/start rollout to internal|بدء الطرح/i], 'Start rollout to Internal');
    await sleep(4000);
    step(`first AAB rolling out to Internal: ${app.name} — ${page.url()}`);
    return { app, url: page.url() };
  } finally {
    await browser.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const key = process.argv.find((a, i) => process.argv[i - 1] === '--app') ?? null;
  const aab = process.argv.find((a, i) => process.argv[i - 1] === '--aab') ?? null;
  if (!key || !aab) {
    console.error('usage: node scripts/play-console/upload-first-aab.mjs --app <key> --aab <path-to.aab>');
    process.exit(1);
  }
  await uploadFirstAab(key, aab);
  step('DONE');
}
