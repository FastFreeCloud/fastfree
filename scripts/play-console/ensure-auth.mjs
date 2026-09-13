import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { STATE_FILE, launchOpts, step } from './helpers.mjs';

/**
 * Open Play Console with the saved session and verify we are really logged in.
 * NEVER types Google passwords — throws a clear re-login instruction instead.
 */
export async function ensureAuth() {
  if (!existsSync(STATE_FILE)) {
    throw new Error(
      `SESSION_MISSING: no saved session at ${STATE_FILE}\n` +
        'Run once (a headed browser opens — YOU log in with the Play Console owner account):\n' +
        '  node scripts/play-console/auth-login.mjs',
    );
  }
  const browser = await chromium.launch(launchOpts());
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('https://play.google.com/console', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  const url = page.url();
  let signInVisible = 0;
  try {
    signInVisible = await page.getByRole('button', { name: /sign in|تسجيل الدخول/i }).count();
  } catch {
    signInVisible = 0;
  }
  if (url.includes('accounts.google.com') || signInVisible > 0) {
    await browser.close();
    throw new Error(
      'SESSION_EXPIRED: Google session is no longer valid.\n' +
        'Re-login (headed, you complete login + 2FA in the window):\n' +
        '  node scripts/play-console/auth-login.mjs',
    );
  }
  step('auth OK — Play Console session is valid');
  return { browser, context, page };
}
