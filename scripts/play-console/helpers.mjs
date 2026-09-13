import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..');
export const AUTH_DIR = join(REPO_ROOT, '.auth', 'play-console');
export const PROFILE_DIR = join(AUTH_DIR, 'profile');
export const STATE_FILE = join(AUTH_DIR, 'state.json');

export function ensureAuthDir() {
  mkdirSync(AUTH_DIR, { recursive: true });
}

/** Headed by default (safer vs Google risk checks). Set PLAY_CONSOLE_HEADLESS=1 for headless. */
export function isHeadless() {
  return process.env.PLAY_CONSOLE_HEADLESS === '1';
}

/** Prefer cached Playwright chromium; override with PLAY_CONSOLE_CHROME_PATH. */
export function executablePath() {
  if (process.env.PLAY_CONSOLE_CHROME_PATH && existsSync(process.env.PLAY_CONSOLE_CHROME_PATH)) {
    return process.env.PLAY_CONSOLE_CHROME_PATH;
  }
  const base = process.env.LOCALAPPDATA || '';
  const cached = join(base, 'ms-playwright', 'chromium-1234', 'chrome-win', 'chrome.exe');
  if (base && existsSync(cached)) return cached;
  return null; // playwright default resolution
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function step(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

export async function failshot(page, name, err) {
  try {
    ensureAuthDir();
    const file = join(AUTH_DIR, `fail-${name}-${Date.now()}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.error(`FAIL[${name}]: ${err?.message || err}`);
    console.error(`  url=${page.url()}`);
    console.error(`  screenshot=${file}`);
  } catch {
    console.error(`FAIL[${name}]: ${err?.message || err}`);
  }
  throw err instanceof Error ? err : new Error(String(err));
}

async function tryRole(page, role, re, action) {
  try {
    const loc = page.getByRole(role, { name: re });
    await loc.first().waitFor({ state: 'visible', timeout: 4000 });
    await action(loc.first());
    return true;
  } catch {
    return false;
  }
}

/** Click first matching button/link/text. Throws with screenshot when nothing matches. */
export async function clickAny(page, patterns, desc) {
  for (const re of patterns) {
    if (await tryRole(page, 'button', re, (b) => b.click())) {
      step(`clicked button: ${desc}`);
      return;
    }
    if (await tryRole(page, 'link', re, (b) => b.click())) {
      step(`clicked link: ${desc}`);
      return;
    }
    try {
      const txt = page.getByText(re);
      await txt.first().waitFor({ state: 'visible', timeout: 4000 });
      await txt.first().click();
      step(`clicked text: ${desc}`);
      return;
    } catch {
      /* next pattern */
    }
  }
  await failshot(page, desc, new Error(`nothing clickable matched for: ${desc}`));
}

/** Optional click — returns true/false, never throws (cookie banners, optional dialogs). */
export async function tryClick(page, patterns, desc) {
  for (const re of patterns) {
    if (await tryRole(page, 'button', re, (b) => b.click())) {
      step(`clicked (optional): ${desc}`);
      return true;
    }
  }
  return false;
}

/** Fill first matching labelled/placeholder input. */
export async function fillAny(page, patterns, value, desc) {
  for (const re of patterns) {
    try {
      const f = page.getByLabel(re);
      await f.first().waitFor({ state: 'visible', timeout: 4000 });
      await f.first().fill(value);
      step(`filled: ${desc}`);
      return;
    } catch {
      /* next */
    }
    try {
      const f = page.getByPlaceholder(re);
      await f.first().waitFor({ state: 'visible', timeout: 4000 });
      await f.first().fill(value);
      step(`filled (placeholder): ${desc}`);
      return;
    } catch {
      /* next */
    }
  }
  await failshot(page, desc, new Error(`no input matched for: ${desc}`));
}

/** Check first matching radio. */
export async function pickRadio(page, patterns, desc) {
  for (const re of patterns) {
    try {
      const r = page.getByRole('radio', { name: re });
      await r.first().waitFor({ state: 'visible', timeout: 4000 });
      await r.first().check();
      step(`picked radio: ${desc}`);
      return;
    } catch {
      /* next */
    }
  }
  await failshot(page, desc, new Error(`no radio matched: ${desc}`));
}

/** Check first matching checkbox. */
export async function pickCheckbox(page, patterns, desc) {
  for (const re of patterns) {
    try {
      const c = page.getByRole('checkbox', { name: re });
      await c.first().waitFor({ state: 'visible', timeout: 4000 });
      await c.first().check();
      step(`checked: ${desc}`);
      return;
    } catch {
      /* next */
    }
  }
  await failshot(page, desc, new Error(`no checkbox matched: ${desc}`));
}

export function launchOpts(extra = {}) {
  const opts = { headless: isHeadless(), ...extra };
  const exe = executablePath();
  if (exe) opts.executablePath = exe;
  return opts;
}
