import { chromium } from 'playwright-core';
import {
  AUTH_DIR,
  PROFILE_DIR,
  STATE_FILE,
  ensureAuthDir,
  launchOpts,
  step,
} from './helpers.mjs';

/**
 * ONE-TIME step, run by the HUMAN:
 *   node scripts/play-console/auth-login.mjs
 * A headed browser opens on Play Console. Log in with the Play Console
 * OWNER account (email + password + 2FA — typed by YOU, never by the script).
 * When the console loads, the session is saved and the browser closes.
 */
ensureAuthDir();
step('Opening headed browser — log in with the Play Console OWNER account.');

const context = await chromium.launchPersistentContext(
  PROFILE_DIR,
  launchOpts({ viewport: null, locale: 'en-US' }),
);
const page = context.pages()[0] ?? (await context.newPage());
await page.goto('https://play.google.com/console');

step('Waiting for you to reach the console (no timeout) — finish login + 2FA in the window…');
await page.waitForURL(/play\.google\.com\/console/, { timeout: 0 });
await page.waitForTimeout(3000);
await context.storageState({ path: STATE_FILE, indexedDB: true });

step(`saved session  -> ${STATE_FILE}`);
step(`profile kept   -> ${PROFILE_DIR}`);
step(`auth dir       -> ${AUTH_DIR} (git-ignored, never commit)`);
await context.close();
step('DONE. Automation scripts can now reuse this session.');
