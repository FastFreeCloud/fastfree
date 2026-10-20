/**
 * Browser session management over CDP.
 *
 * By default the server launches the browser itself (no terminal needed),
 * waits for the CDP endpoint, then attaches. Set FLOW_AUTO_LAUNCH=0 to
 * attach to a browser you started yourself.
 *
 * Attaching means the agent reuses the Google session already in that
 * profile - no API keys anywhere.
 */
import { chromium } from 'playwright-core';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const CLOSE_GRACE_MS = 5000;

/* ------------------------------------------------------------------ */
/* Resilience: retry, selector fallbacks, health, logging              */
/* ------------------------------------------------------------------ */

/** Promise-based delay. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Structured logging, off by default. Set FLOW_DEBUG=1 to see it on stderr.
 * One JSON object per line so a log shipper can parse it without extra work.
 */
export function log(level, message, meta = {}) {
  const ts = new Date().toISOString();
  const entry = { ts, level, message, ...meta };
  if (process.env.FLOW_DEBUG) {
    console.error(JSON.stringify(entry));
  }
}

/**
 * Run `fn`, retrying transient failures with linear backoff.
 *
 * Opt-in: callers decide which operations are worth retrying. The wrapper
 * never swallows the last error, so callers keep the original failure mode.
 */
export async function withRetry(fn, { retries = 2, backoffMs = 1000, label = 'operation' } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        log('warn', `Retrying ${label}`, { attempt: attempt + 1, retries, error: err.message });
        await sleep(backoffMs * (attempt + 1));
      }
    }
  }
  throw lastError;
}

/**
 * Selector registry with fallbacks. Flow's DOM changes between builds, so a
 * single hard-coded selector is one deploy away from breaking a tool. Each
 * name maps to an ordered list; the first selector that matches wins.
 */
const SELECTOR_FALLBACKS = {
  sendButton: [
    '[aria-label*="arrow_forward"]',
    'button:has-text("arrow_forward")',
    '[data-testid="send-button"]',
  ],
  promptInput: [
    '[contenteditable="true"]',
    '[role="textbox"]',
    'textarea',
  ],
  settingsTrigger: [
    '[aria-label="Settings trigger"]',
    '.settings-trigger-button',
    '[aria-label*="settings" i]',
  ],
  newProject: [
    'text=New project',
    'button:has-text("New project")',
    '[data-testid*="new-project" i]',
  ],
  scenesNav: [
    'text=Scenes',
    '[aria-label*="Scenes" i]',
    '[data-testid*="scene" i]',
  ],
  charactersNav: [
    'text=Characters',
    '[aria-label*="Characters" i]',
    '[data-testid*="character" i]',
  ],
  toolsNav: [
    'text=Tools',
    '[aria-label*="Tools" i]',
    '[data-testid*="tools" i]',
  ],
};

/**
 * Resolve a logical control name to a locator, trying each fallback in turn.
 * An unknown name is treated as a literal selector so callers can still pass
 * ad-hoc selectors without a registry entry.
 */
export async function queryWithFallbacks(page, selectorName, { timeout = 5000 } = {}) {
  const selectors = SELECTOR_FALLBACKS[selectorName];
  if (!selectors) return page.locator(selectorName);

  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    try {
      await loc.waitFor({ timeout: 1000 });
      if (await loc.count()) return loc;
    } catch {
      /* try next fallback */
    }
  }
  throw new Error(`No fallback selector matched for ${selectorName}`);
}

/**
 * Quick liveness probe. A page that is closed, on a devtools:// target, or
 * otherwise unresponsive is reported unhealthy instead of hanging a tool.
 */
export async function ensureSessionHealth(page) {
  try {
    const url = page.url();
    if (!url || url.startsWith('devtools://')) {
      return { healthy: false, reason: 'Invalid page URL' };
    }
    await page.evaluate(() => document.title);
    return { healthy: true };
  } catch {
    return { healthy: false, reason: 'Page not responsive' };
  }
}

/**
 * Look for visible error indicators on the page.
 *
 * Returns { detected, messages } so the caller can decide what to do. This is
 * deliberately conservative: only visible role="alert" nodes and short leaf
 * lines that contain a real policy/error keyword are reported, so help text
 * and footer links do not trip it.
 */
async function detectFlowError(page) {
  try {
    return await page.evaluate(() => {
      const visible = (el) => {
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          (el.offsetParent !== null || el.getClientRects().length > 0)
        );
      };

      const messages = [];
      const push = (text) => {
        const clean = (text || '').replace(/\s+/g, ' ').trim();
        if (clean && clean.length <= 200 && !messages.includes(clean)) messages.push(clean);
      };

      for (const el of document.querySelectorAll('[role="alert"], [role="alertdialog"], [aria-live="assertive"]')) {
        if (visible(el)) push(el.innerText || el.textContent);
      }

      // "policy" alone is too weak (footer links), so it must appear with
      // violation context; the rest are strong enough on their own.
      const keywords =
        /(error|violation|blocked|not allowed|couldn't generate|unable to generate|can't generate|content policy|policy violation|violates? .{0,20}policy)/i;

      for (const el of document.querySelectorAll('p, span, div, li')) {
        if (!visible(el) || el.children.length) continue;
        const text = (el.innerText || el.textContent || '').trim();
        if (text && text.length <= 200 && keywords.test(text)) push(text);
        if (messages.length >= 5) break;
      }

      return { detected: messages.length > 0, messages };
    });
  } catch {
    return { detected: false, messages: [] };
  }
}

/* ------------------------------------------------------------------ */
/* Generation in progress                                               */
/* ------------------------------------------------------------------ */

/**
 * Detect that Flow is still rendering.
 *
 * While a generation runs, Flow shows a placeholder tile with a percentage
 * counter instead of a real image. The placeholder is not an <img>, so the
 * media count stays flat and the poll would otherwise settle on "nothing
 * new" while the work is still going. Watching for the progress indicator
 * keeps the poll alive until the image actually appears.
 */
async function detectGenerationInProgress(page) {
  try {
    return await page.evaluate(() => {
      const visible = (el) => {
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          (el.offsetParent !== null || el.getClientRects().length > 0)
        );
      };

      // Collect the element's own text nodes, so a percentage wrapped in
      // nested markup is still read as a single value.
      const ownText = (el) => {
        let out = '';
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) out += node.nodeValue;
        }
        return out.replace(/\s+/g, ' ').trim();
      };

      for (const el of document.querySelectorAll('span, div, p, label')) {
        if (!visible(el)) continue;
        const text = ownText(el);
        if (!text) continue;
        const match = text.match(/^(\d{1,3})\s*%$/);
        if (match) {
          const value = Number.parseInt(match[1], 10);
          if (value >= 0 && value <= 100) {
            return { inProgress: true, percent: value };
          }
        }
      }

      // A busy spinner or progress bar is the same signal without a number.
      const busy = document.querySelector(
        '[aria-busy="true"], [role="progressbar"], [aria-label*="Generating" i], ' +
        '[aria-label*="Loading" i], [data-loading="true"]',
      );
      if (busy && visible(busy)) {
        return { inProgress: true, percent: null };
      }

      return { inProgress: false, percent: null };
    });
  } catch {
    return { inProgress: false, percent: null };
  }
}

/* ------------------------------------------------------------------ */
/* CDP availability                                                    */
/* ------------------------------------------------------------------ */

export async function cdpAlive(port = config.cdpPort) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function waitForCdp(port = config.cdpPort, timeoutMs = config.launchTimeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await cdpAlive(port)) return true;
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Launch                                                             */
/* ------------------------------------------------------------------ */

function profileDir() {
  return path.join(config.userDataDir, config.profile);
}

/**
 * Profile flags must be present on every launch, including a restart.
 * Leaving them off makes the browser open its default profile, which loses
 * the signed-in Google session the whole tool depends on.
 */
function browserArgs() {
  const args = [
    `--remote-debugging-port=${config.cdpPort}`,
    '--remote-allow-origins=*',
    '--no-first-run',
    '--no-default-browser-check',
    `--profile-directory=${config.profile}`,
  ];

  if (config.userDataDir) args.unshift(`--user-data-dir=${config.userDataDir}`);

  return args;
}

/**
 * Close the browser we are attached to, by CDP.
 *
 * CentBrowser ships a binary literally named chrome.exe, so killing by image
 * name would take the user's personal Chrome down with it. Browser.close
 * over CDP reaches exactly the instance listening on our port.
 */
async function closeOverCdp() {
  if (!(await cdpAlive())) return { closed: false, reason: 'no browser on the CDP port' };

  try {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${config.cdpPort}`);
    const session = await browser.newBrowserCDPSession();
    try {
      await session.send('Browser.close');
    } finally {
      await session.detach().catch(() => {});
      await browser.close().catch(() => {});
    }
    return { closed: true, via: 'cdp' };
  } catch (err) {
    return { closed: false, reason: err.message };
  }
}

/** Last resort when there is no CDP endpoint to close politely. */
function killByImageName() {
  const image = path.basename(config.browser, '.exe');

  try {
    // taskkill exits 128 when nothing matched, and does not throw.
    const r = spawnSync('taskkill', ['/IM', `${image}.exe`, '/F'], {
      stdio: 'ignore',
      timeout: 15000,
    });
    return { closed: r.status === 0, via: 'taskkill', image };
  } catch {
    return { closed: false, via: 'taskkill', image };
  }
}

export async function launchBrowser({ restart = false } = {}) {
  if (!fs.existsSync(config.browser)) {
    throw new Error(
      `Browser binary not found: ${config.browser}\n` +
        'Point FLOW_BROWSER at the correct chrome.exe, or run scripts\\launch.cmd manually.',
    );
  }

  if (config.userDataDir && !fs.existsSync(profileDir())) {
    throw new Error(
      `Profile directory not found: ${profileDir()}\n` +
        'FLOW_USER_DATA or FLOW_PROFILE points at a folder that does not exist, ' +
        'so the signed-in Google session would be lost. Chrome can create a new ' +
        'profile only if you sign in again inside it.',
    );
  }

  let kill = null;
  if (restart) {
    kill = await closeOverCdp();
    if (!kill.closed) kill = killByImageName();
    // Wait for the port to actually free up, or the new instance silently
    // attaches to the old one.
    for (let i = 0; i < 10 && (await cdpAlive()); i++) {
      await new Promise((r) => setTimeout(r, 500));
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  const child = spawn(config.browser, browserArgs(), { detached: true, stdio: 'ignore' });

  // A bad path or a denied permission surfaces as an async 'error' event.
  // Without this listener Node rethrows it and the whole MCP server dies,
  // taking every other tool down with one typo in the config.
  await new Promise((resolve, reject) => {
    const onError = (err) => {
      child.removeListener('spawn', onSpawn);
      reject(new Error(`Could not start browser (${config.browser}): ${err.message}`));
    };
    const onSpawn = () => {
      child.removeListener('error', onError);
      resolve();
    };
    child.once('error', onError);
    child.once('spawn', onSpawn);
  });

  // Keep a permanent no-op listener. Removing the last 'error' listener
  // makes Node rethrow any later error (kill failure, IPC close) as an
  // uncaught exception, which would kill the stdio server.
  child.on('error', () => {});
  child.unref();

  return { launched: true, restart, kill, browser: config.browser, profile: config.profile };
}

export async function ensureBrowser({ restart = false } = {}) {
  if (await cdpAlive()) {
    return { launched: false, reused: true, cdp: config.cdpPort };
  }

  if (!config.autoLaunch) {
    throw new Error(
      `No browser on CDP port ${config.cdpPort}. Start it with scripts\\launch.cmd, ` +
        'or unset FLOW_AUTO_LAUNCH to let the server launch it.',
    );
  }

  await launchBrowser({ restart });

  const ok = await waitForCdp();
  if (!ok) {
    throw new Error(
      `Browser started but CDP port ${config.cdpPort} never responded. ` +
        'Check FLOW_CDP_PORT and make sure no other app already holds that port.',
    );
  }

  return { launched: true, reused: false, cdp: config.cdpPort };
}

/* ------------------------------------------------------------------ */
/* Session                                                            */
/* ------------------------------------------------------------------ */

/**
 * True when the page is really on the Flow origin.
 *
 * A prefix match would accept "https://flow.google.com.attacker.tld", so
 * the origin is compared properly.
 */
export function onFlow(page) {
  try {
    return new URL(page.url()).origin === new URL(config.flowUrl).origin;
  } catch {
    return false;
  }
}

export async function connect() {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${config.cdpPort}`);
  const context = browser.contexts()[0];

  if (!context) {
    await closeQuietly(browser);
    throw new Error('The browser exposes no context. Restart it with scripts\\launch.cmd.');
  }

  const pages = context.pages();
  const page = pages.find((p) => !p.url().startsWith('devtools://')) || pages[0];

  if (!page) {
    await closeQuietly(browser);
    throw new Error('The browser has no open tab. Open one in the window, then retry.');
  }

  return { browser, context, page };
}

/** Detach without hanging forever on a wedged CDP link. */
async function closeQuietly(browser) {
  const timer = setTimeout(() => {}, CLOSE_GRACE_MS);
  if (typeof timer.unref === 'function') timer.unref();

  try {
    await Promise.race([
      browser.close().catch(() => {}),
      new Promise((r) => {
        const t = setTimeout(r, CLOSE_GRACE_MS);
        if (typeof t.unref === 'function') t.unref();
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function runSession(fn) {
  log('info', 'Starting browser session');
  await ensureBrowser();
  const { browser, page } = await connect();

  // Fail fast on a dead or devtools:// page instead of letting every later
  // call hang on a page that can never answer.
  const health = await ensureSessionHealth(page);
  if (!health.healthy) {
    log('error', 'Browser session is unhealthy', { reason: health.reason });
    await closeQuietly(browser);
    throw new Error(`Browser session is not healthy: ${health.reason}`);
  }

  // The MCP-level timeout cannot cancel a Playwright call, and this session
  // holds the serialization chain. Dropping the connection is what actually
  // unblocks a wedged page.evaluate() or CDP send, so one hung operation
  // fails one tool instead of freezing every later call.
  const watchdog = setTimeout(() => {
    browser.close().catch(() => {});
  }, config.toolTimeoutMs);
  if (typeof watchdog.unref === 'function') watchdog.unref();

  try {
    return await fn(page);
  } finally {
    clearTimeout(watchdog);
    await closeQuietly(browser);
  }
}

/**
 * Every browser-backed tool runs through here, one at a time.
 *
 * The tools all drive the same tab, so two concurrent calls would
 * interleave navigation and each one would read the other's output as its
 * own. Serialising keeps every baseline, poll and click honest.
 */
let chain = Promise.resolve();

export function withSession(fn) {
  const run = chain.then(() => runSession(fn), () => runSession(fn));
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function openFlow(page, { newProject = false } = {}) {
  log('info', 'Opening Flow', { url: config.flowUrl, newProject });

  await withRetry(
    () => page.goto(config.flowUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }),
    { retries: 2, backoffMs: 1500, label: 'navigate to Flow' },
  );
  await page.waitForTimeout(5000);

  // Optional project lock
  if (config.projectId && !page.url().includes(config.projectId)) {
    throw new Error(
      `Flow project lock active: expected project ID "${config.projectId}" in URL, ` +
        `but current page is ${page.url()}. ` +
        'Either remove FLOW_PROJECT_ID to unlock, or open the correct project in the browser.'
    );
  }

  if (newProject || !page.url().includes('/project/')) {
    await page.locator('text=New project').first().click().catch(() => {});
    await page.waitForTimeout(7000);
  }
  return page.url();
}

export async function sessionState(page) {
  const s = await page.evaluate(() => {
    const label = document
      .querySelector('[aria-label*="Google Account"]')
      ?.getAttribute('aria-label')
      ?.replace(/\s+/g, ' ')
      .trim();

    return {
      // Positive evidence only. Absence of an accounts.google.com URL also
      // matches consent screens, bot checks and error pages.
      authenticated: Boolean(label),
      account: label || 'unknown',
      url: location.href,
    };
  });

  let accountWarning = null;
  if (config.expectedAccount && s.account !== 'unknown') {
    const signedIn = s.account.toLowerCase().includes(config.expectedAccount.toLowerCase());
    if (!signedIn) {
      accountWarning =
        `Signed-in account does not match FLOW_ACCOUNT (${config.expectedAccount}). ` +
        `Current: ${s.account}`;
    }
  } else if (config.expectedAccount && !s.authenticated) {
    accountWarning = 'No Google Account badge found on the page - sign in through the browser window.';
  }

  return { ...s, accountWarning };
}

/* ------------------------------------------------------------------ */
/* Media collection                                                    */
/* ------------------------------------------------------------------ */

/**
 * Single source of truth for "what counts as generated media".
 *
 * Both the poll counter and the download harvester call this, so a
 * thumbnail can never inflate a baseline or survive into a download list.
 */
export async function collectMedia(page, kind = 'image', limit = config.maxMediaPerRun) {
  const pattern = kind === 'video' ? config.mediaPatterns.video : config.mediaPatterns.image;

  return page.evaluate(
    ({ src, minPx, max }) => {
      const re = new RegExp(src);
      const seen = new Set();
      const urls = [];
      let duplicates = 0;

      for (const el of document.querySelectorAll('img, video')) {
        const raw = el.src || el.getAttribute('src') || '';
        if (!raw || !re.test(raw)) continue;
        if (el.tagName === 'IMG' && (el.naturalWidth || 0) < minPx) continue;

        // Identity ignores Google's own size parameters; anything else,
        // including a seed or id, stays distinct. Params are sorted so the
        // same asset with a different order is still recognised as one.
        const [base, query = ''] = raw.split('?');
        const kept = [...new URLSearchParams(query)]
          .filter(([k]) => !/^(w|s|sz|q|q_?sig|_)$/i.test(k))
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => `${k}=${v}`)
          .join('&');
        const key = `${base}?${kept}`;

        if (seen.has(key)) {
          duplicates += 1;
          continue;
        }
        seen.add(key);

        if (urls.length < max) urls.push(raw);
      }

      // Count distinct assets, not DOM elements, so a page showing three
      // size variants of one image is not read as three fresh results.
      return { urls, total: seen.size, duplicates, dropped: Math.max(0, seen.size - urls.length) };
    },
    { src: pattern, minPx: config.minMediaPixels, max: limit },
  );
}

export async function countMedia(page, kind = 'image') {
  const { total } = await collectMedia(page, kind, Number.MAX_SAFE_INTEGER);
  return total;
}

/**
 * Wait until the media count stops moving.
 *
 * `baseline` is mandatory: it is the count captured BEFORE the prompt was
 * submitted. Without it, images left over from an earlier run look like
 * fresh output. When Flow swaps an image in place instead of appending,
 * the count never grows - so a stable count settles too and `reusedOnly`
 * tells the caller the result may be stale.
 */
const ERROR_CHECK_INTERVAL_MS = 5000;

export async function waitForMedia(page, kind = 'image', baseline) {
  if (baseline == null) {
    throw new Error('waitForMedia needs the baseline count captured before submitting');
  }

  let prev = -1;
  let stable = 0;
  let last = baseline;
  let lastErrorCheck = 0;
  let progressSeen = false;

  for (let i = 0; i < config.maxPolls; i++) {
    await page.waitForTimeout(config.pollIntervalMs);

    // A content-policy rejection never produces media, so without this check
    // the poll would run its full ~3 minutes before giving up.
    if (Date.now() - lastErrorCheck >= ERROR_CHECK_INTERVAL_MS) {
      lastErrorCheck = Date.now();
      const err = await detectFlowError(page);
      if (err.detected) {
        log('warn', 'Flow reported an error while waiting for media', { messages: err.messages });
        return {
          settled: false,
          error: true,
          message: `Error detected: ${err.messages[0]}`,
          fresh: 0,
          reusedOnly: false,
          polls: i + 1,
        };
      }
    }

    // While Flow renders, the media count cannot move because the result is
    // still a placeholder. Settling here would report "reused" for a
    // generation that is merely slow, so the progress signal keeps the
    // poll running.
    const progress = await detectGenerationInProgress(page);
    if (progress.inProgress) {
      progressSeen = true;
      prev = last;
      stable = 0;
      log('debug', 'Generation still in progress', { percent: progress.percent });
      continue;
    }

    const { total } = await collectMedia(page, kind, Number.MAX_SAFE_INTEGER);
    last = total;

    if (total === prev) {
      if (++stable >= config.settleRounds) {
        return {
          settled: true,
          fresh: Math.max(0, total - baseline),
          reusedOnly: total <= baseline,
          polls: i + 1,
          progressSeen,
        };
      }
    } else {
      stable = 0;
    }

    prev = total;
  }

  return {
    settled: false,
    fresh: Math.max(0, last - baseline),
    reusedOnly: last <= baseline,
    polls: config.maxPolls,
    progressSeen,
  };
}

/**
 * Type a prompt into the Flow composer.
 *
 * `submit: false` leaves the text in the box without sending it, which is
 * how flow_setup_video avoids starting a paid render.
 */
export async function submitPrompt(page, prompt, { submit = true } = {}) {
  log('info', 'Typing prompt', { submit, length: prompt.length });

  await page.waitForSelector('[contenteditable="true"]', { timeout: 30000 });

  const box = page.locator('[contenteditable="true"]').first();
  await box.click();
  await page.keyboard.type(prompt, { delay: config.typeDelayMs });
  await page.waitForTimeout(800);

  if (!submit) return { typed: true, submitted: false, via: null };

  // Try the registry first, then the legacy combined selector, so a Flow UI
  // change that drops one selector does not lose the send button entirely.
  let send = null;
  try {
    send = await queryWithFallbacks(page, 'sendButton', { timeout: 5000 });
  } catch {
    send = page.locator('[aria-label*="arrow_forward"], button:has-text("arrow_forward")').first();
  }

  if (await send.count()) {
    const clicked = await withRetry(() => send.click({ timeout: 5000 }), {
      retries: 2,
      backoffMs: 1000,
      label: 'click send button',
    })
      .then(() => true)
      .catch(() => false);

    if (clicked) log('info', 'Prompt submitted via send button');
    return { typed: true, submitted: clicked, via: 'button' };
  }

  await page.keyboard.press('Enter');
  log('info', 'Prompt submitted via Enter key');
  return { typed: true, submitted: true, via: 'enter' };
}

/* ------------------------------------------------------------------ */
/* Ratio                                                              */
/* ------------------------------------------------------------------ */

/** Flow hides the model, aspect ratio and image count behind one button. */
const SETTINGS_TRIGGER = '[aria-label="Settings trigger"], .settings-trigger-button';

/** Read the options Flow is actually offering right now. */
export async function flowRatios(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[role="radio"]')]
      .map((el) => ({
        label: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' '),
        checked: el.getAttribute('aria-checked') === 'true',
      }))
      .filter((o) => /\d\s*:\s*\d/.test(o.label)),
  );
}

/**
 * Set the aspect ratio through Flow's own settings menu.
 *
 * Flow has no standalone ratio button. The label on the composer reads
 * "crop_16_9" and clicking it opens a radio group whose items carry the
 * ratio as text ("crop_square 1:1") plus aria-checked. Selecting through
 * that menu and reading aria-checked back is the only way to know the
 * change actually landed.
 */
export async function selectRatio(page, ratio) {
  const want = String(ratio ?? '').trim();
  if (!want) return { requested: null, applied: false, reason: 'not requested' };

  const target = want.replace(/\s+/g, '');
  const trigger = page.locator(SETTINGS_TRIGGER).first();

  if (!(await trigger.count())) {
    return {
      requested: want,
      applied: false,
      reason: 'the composer settings button was not found on this Flow build',
    };
  }

  const opened = await withRetry(() => trigger.click({ timeout: 6000 }), {
    retries: 2,
    backoffMs: 1000,
    label: 'open composer settings menu',
  })
    .then(() => true)
    .catch(() => false);

  if (!opened) {
    return { requested: want, applied: false, reason: 'could not open the composer settings menu' };
  }

  await page.waitForTimeout(1200);

  const options = await flowRatios(page);
  const wanted = options.find((o) => o.label.endsWith(target) || o.label === target);

  if (!wanted) {
    await page.keyboard.press('Escape').catch(() => {});
    return {
      requested: want,
      applied: false,
      reason: `Flow does not offer ${want}. It offers: ${options.map((o) => o.label).join(', ') || 'none found'}`,
    };
  }

  const option = page.locator(`[role="radio"]:has-text("${target}")`).first();
  await option.click({ timeout: 6000 }).catch(() => {});

  // Read the control's own state. Trusting the click alone would report
  // success for a click that never registered.
  const checked = await option.getAttribute('aria-checked').catch(() => null);

  await page.waitForTimeout(600);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);

  return {
    requested: want,
    applied: checked === 'true',
    via: 'settings-menu',
    label: wanted.label,
    reason: checked === 'true' ? null : `Flow reported aria-checked="${checked}" after the click`,
  };
}

export async function currentModel(page) {
  return page.evaluate(() => {
    const text = document.body.innerText.replace(/\s+/g, ' ');
    const m = text.match(/(Nano Banana[^x]*|Imagen 4|Omni Flash|Veo 3\.1[^x]*)\s*x?\d*/i);
    return m ? m[0].trim() : 'unknown';
  });
}

/* ------------------------------------------------------------------ */
/* Screenshots                                                         */
/* ------------------------------------------------------------------ */

const SHOT_TIMEOUT_MS = 15000;
const CDP_TIMEOUT_MS = 20000;

/** Reject a promise that never settles instead of wedging the tool chain. */
function withDeadline(promise, ms, label) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    if (typeof timer.unref === 'function') timer.unref();
  });

  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Save a PNG of the viewport.
 *
 * Playwright's screenshot waits for the page to stop repainting. Flow keeps
 * a live canvas running, so that wait never resolves and the call times out
 * no matter how large the timeout is. CDP's captureScreenshot takes the
 * frame as-is, which is what a screenshot of a running app should mean.
 */
export async function capture(page, file) {
  try {
    await page.screenshot({ path: file, timeout: SHOT_TIMEOUT_MS, animations: 'disabled' });
    return { ok: true, file, via: 'playwright' };
  } catch {
    /* fall through to CDP */
  }

  let session;
  try {
    session = await withDeadline(
      page.context().newCDPSession(page),
      CDP_TIMEOUT_MS,
      'newCDPSession',
    );

    const { data } = await withDeadline(
      session.send('Page.captureScreenshot', { format: 'png' }),
      CDP_TIMEOUT_MS,
      'Page.captureScreenshot',
    );

    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    return { ok: true, file, via: 'cdp' };
  } catch (err) {
    return { ok: false, file, reason: err.message };
  } finally {
    await session?.detach().catch(() => {});
  }
}