/**
 * Tool implementations. Each returns a plain object; the MCP layer
 * in index.js formats it for the agent.
 *
 * Two rules hold throughout:
 *  - every browser-backed tool goes through withSession(), so a missing
 *    browser gives one actionable message instead of a raw ECONNREFUSED;
 *  - `ok` is derived from something observed, never from "it did not throw".
 */
import path from 'node:path';
import fs from 'node:fs';
import {
  withSession, ensureBrowser, launchBrowser, openFlow, sessionState, waitForMedia,
  submitPrompt, currentModel, countMedia, cdpAlive, selectRatio, waitForCdp, collectMedia, capture, onFlow,
} from '../browser.js';
import {
  dayDir, runBase, saveFromUrls, listOutput, safeFileName,
} from '../files.js';
import { config } from '../config.js';

const NOT_REQUESTED = { requested: null, applied: false, reason: 'not requested' };

/** Ratios Flow does not support natively, mapped to the closest supported ratio. */
const RATIO_FALLBACKS = {
  '1.91:1': '16:9',
};

function assertRatio(ratio) {
  if (ratio && !config.ratios.includes(ratio)) {
    throw new Error(`Unsupported ratio "${ratio}". Use one of: ${config.ratios.join(', ')}`);
  }
}

/** Resolve a ratio to a supported one, returning the fallback info when it changed. */
function resolveRatio(ratio) {
  if (!ratio) return { ratio: null, fallback: null };
  if (config.ratios.includes(ratio)) return { ratio, fallback: null };
  const mapped = RATIO_FALLBACKS[ratio];
  if (mapped) return { ratio: mapped, fallback: `Flow does not support ${ratio}; used ${mapped} instead.` };
  return { ratio, fallback: null };
}

function assertDuration(duration) {
  if (duration && !config.durations.includes(duration)) {
    throw new Error(`Unsupported duration "${duration}". Use one of: ${config.durations.join(', ')}`);
  }
}

/** Coerce a caller-supplied limit so a negative or fractional value cannot change the meaning. */
function clampLimit(limit, fallback = 20, max = 200) {
  const n = Math.floor(Number(limit));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

/** Screenshot helper. Returns the file path, or null when it could not be saved. */
async function shot(page, file) {
  const r = await capture(page, file);
  return r.ok ? r.file : null;
}

/** Read credit/quota info from the Flow page, or null when not found. */
async function readCredits(page) {
  try {
    return await page.evaluate(() => {
      const txt = (el) => (el?.innerText || el?.textContent || '').trim().replace(/\s+/g, ' ');

      const candidates = [
        ...document.querySelectorAll('[aria-label*="credit" i], [aria-label*="quota" i], [data-testid*="credit" i]'),
        ...document.querySelectorAll('[class*="credit" i], [class*="quota" i]'),
      ];

      for (const el of candidates) {
        const t = txt(el);
        if (!t) continue;
        const m = t.match(/(\d[\d,]*)\s*[\/of]\s*(\d[\d,]*)/i);
        if (m) {
          const remaining = parseInt(m[1].replace(/,/g, ''), 10);
          const total = parseInt(m[2].replace(/,/g, ''), 10);
          if (remaining >= 0 && total > 0) return { remaining, total, raw: t };
        }
      }
      return null;
    });
  } catch {
    return null;
  }
}

async function generateSingleImage(page, prompt, ratio) {
  const resolved = resolveRatio(ratio);
  const effectiveRatio = resolved.ratio;

  await openFlow(page, { newProject: true });

  const baseline = await countMedia(page, 'image');
  const ratioResult = effectiveRatio ? await selectRatio(page, effectiveRatio) : NOT_REQUESTED;

  const sent = await submitPrompt(page, prompt);
  if (!sent.submitted) {
    return {
      ok: false,
      prompt,
      reason: 'The send button could not be pressed, so nothing was submitted.',
      ratioApplied: ratioResult.applied,
      ratioFallback: resolved.fallback,
      hint: 'Run flow_discover_ui to see the current controls, then retry.',
    };
  }

  const model = await currentModel(page);
  const result = await waitForMedia(page, 'image', baseline);

  const dir = dayDir();
  const base = runBase(prompt);
  const preview = await shot(page, path.join(dir, `${base}-preview.png`));

  const media = await collectMedia(page, 'image');
  const { saved, skipped } = await saveFromUrls(media.urls, base, 'jpg');
  const ok = saved.length > 0;

  return {
    ok,
    prompt,
    model,
    ratio: ratioResult.applied ? effectiveRatio : 'default',
    ratioApplied: ratioResult.applied,
    ratioDetail: ratioResult.reason || ratioResult.via || null,
    ratioFallback: resolved.fallback,
    settled: result.settled,
    fresh: result.fresh,
    reusedOnly: result.reusedOnly,
    polls: result.polls,
    count: saved.length,
    files: saved.map((s) => s.file),
    sizes: saved.map((s) => `${s.kb} KB`),
    preview,
    variantsDropped: media.dropped,
    skipped,
    note: ok
      ? 'Commas are stripped by the Flow editor - write prompts without commas.'
      : 'No file was saved. ' +
        (result.reusedOnly
          ? 'Flow reused the existing image instead of generating a new one.'
          : 'Generation did not produce a downloadable file.') +
        ' Try flow_discover_ui, then flow_download_latest.',
  };
}

/* ------------------------------------------------------------------ */
/* Connection & status                                                 */
/* ------------------------------------------------------------------ */

export async function flowStatus() {
  return withSession(async (page) => {
    await openFlow(page);
    const s = await sessionState(page);

    return {
      ok: s.authenticated,
      authenticated: s.authenticated,
      account: s.account,
      accountWarning: s.accountWarning || null,
      url: s.url,
      cdpPort: config.cdpPort,
      models: config.models.image,
      ratios: config.ratios,
      durations: config.durations,
      note: s.authenticated
        ? null
        : 'Not signed in. Sign in through the browser window, then call flow_status again.',
    };
  });
}

export async function flowLaunch({ restart = false } = {}) {
  if (!restart && (await cdpAlive())) {
    return {
      ok: true,
      launched: false,
      note: `A browser is already listening on CDP ${config.cdpPort}.`,
    };
  }

  const r = await launchBrowser({ restart });
  const ready = await waitForCdp();

  return {
    ...r,
    ok: ready,
    cdpReady: ready,
    port: config.cdpPort,
    note: ready
      ? 'Browser is listening on CDP.'
      : `Browser started but port ${config.cdpPort} never answered.`,
  };
}

export async function flowScreenshot({ name = 'flow' } = {}) {
  // One extension only: "shot.png" must not become "shot.png.png".
  const wanted = safeFileName(name, 'flow').replace(/\.png$/i, '');
  const fileName = `${wanted || 'flow'}.png`;

  return withSession(async (page) => {
    // Stay on the page the user is already looking at when it is Flow.
    if (!onFlow(page)) await openFlow(page);

    const dir = dayDir();
    const file = path.join(dir, fileName);
    const saved = await capture(page, file);

    return {
      ok: saved.ok,
      file: saved.ok ? saved.file : null,
      via: saved.via || null,
      dir,
      note: saved.ok ? null : `Screenshot failed: ${saved.reason}`,
    };
  });
}

export async function flowDiscoverUi() {
  return withSession(async (page) => {
    if (!onFlow(page)) await openFlow(page);

    const ui = await page.evaluate(() => {
      const txt = (el) => (el?.innerText || el?.textContent || '').trim().replace(/\s+/g, ' ');
      const seen = new Set();
      const out = { buttons: [], nav: [], inputs: [] };

      for (const el of document.querySelectorAll('button,[role="button"],a')) {
        const t = txt(el);
        if (t && t.length < 45 && !seen.has(t)) {
          seen.add(t);
          out.buttons.push(t);
        }
      }
      for (const el of document.querySelectorAll('nav a,[role="navigation"] a')) {
        const t = txt(el);
        if (t && t.length < 30) out.nav.push(t);
      }
      for (const el of document.querySelectorAll('input,textarea,[contenteditable="true"]')) {
        out.inputs.push(el.placeholder || el.getAttribute('aria-label') || el.tagName);
      }

      // Cap every list so a large page cannot flood the CDP bridge.
      out.buttons = out.buttons.slice(0, 50);
      out.nav = out.nav.slice(0, 30);
      out.inputs = out.inputs.slice(0, 30);
      return out;
    });

    return { ok: true, ...ui, url: page.url() };
  });
}

/* ------------------------------------------------------------------ */
/* Image generation                                                    */
/* ------------------------------------------------------------------ */

export async function flowGenerateImage({ prompt, ratio }) {
  if (!prompt?.trim()) throw new Error('prompt is required');
  assertRatio(ratio);

  return withSession(async (page) => {
    await openFlow(page, { newProject: true });

    // Captured before submitting, so leftovers from an earlier run are
    // never mistaken for this run's output.
    const baseline = await countMedia(page, 'image');
    const ratioResult = ratio ? await selectRatio(page, ratio) : NOT_REQUESTED;

    const sent = await submitPrompt(page, prompt);
    if (!sent.submitted) {
      return {
        ok: false,
        prompt,
        reason: 'The send button could not be pressed, so nothing was submitted.',
        ratioApplied: ratioResult.applied,
        hint: 'Run flow_discover_ui to see the current controls, then retry.',
      };
    }

    const model = await currentModel(page);
    const result = await waitForMedia(page, 'image', baseline);

    const dir = dayDir();
    const base = runBase(prompt);
    const preview = await shot(page, path.join(dir, `${base}-preview.png`));

    const media = await collectMedia(page, 'image');
    const { saved, skipped } = await saveFromUrls(media.urls, base, 'jpg');
    const ok = saved.length > 0;

    return {
      ok,
      prompt,
      model,
      // Never echo the requested ratio as if it had been applied.
      ratio: ratioResult.applied ? ratio : 'default',
      ratioApplied: ratioResult.applied,
      ratioDetail: ratioResult.reason || ratioResult.via || null,
      settled: result.settled,
      fresh: result.fresh,
      reusedOnly: result.reusedOnly,
      polls: result.polls,
      count: saved.length,
      files: saved.map((s) => s.file),
      sizes: saved.map((s) => `${s.kb} KB`),
      preview,
      variantsDropped: media.dropped,
      skipped,
      note: ok
        ? 'Commas are stripped by the Flow editor - write prompts without them.'
        : 'No file was saved. ' +
          (result.reusedOnly
            ? 'Flow reused the existing image instead of generating a new one.'
            : 'Generation did not produce a downloadable file.') +
          ' Try flow_discover_ui, then flow_download_latest.',
    };
  });
}

export async function flowDownloadLatest() {
  return withSession(async (page) => {
    if (!onFlow(page)) await openFlow(page);

    const media = await collectMedia(page, 'image', 1);
    if (!media.urls.length) {
      return {
        ok: false,
        count: 0,
        note:
          'No image on the page. flow_generate_image already saves its own files, so use this ' +
          'only when you generated from the Flow UI yourself.',
      };
    }

    const base = runBase('download');
    const { saved, skipped } = await saveFromUrls(media.urls, base, 'jpg');

    return {
      ok: saved.length > 0,
      count: saved.length,
      files: saved.map((s) => s.file),
      skipped,
      note: 'Saved the newest image from the currently open Flow view.',
    };
  });
}

/* ------------------------------------------------------------------ */
/* Video & scenes                                                      */
/* ------------------------------------------------------------------ */

export async function flowSetupVideo({ prompt, ratio, duration }) {
  if (!prompt?.trim()) throw new Error('prompt is required');
  assertRatio(ratio);
  assertDuration(duration);

  return withSession(async (page) => {
    await openFlow(page, { newProject: true });

    const ratioResult = ratio ? await selectRatio(page, ratio) : NOT_REQUESTED;

    // Typed only. Submitting here would start a paid video render, which is
    // exactly what this tool promises not to do.
    await submitPrompt(page, prompt, { submit: false });

    const model = await currentModel(page);
    await page.waitForTimeout(3000);

    const dir = dayDir();
    const base = runBase(prompt);
    const screenshot = await shot(page, path.join(dir, `${base}-video-setup.png`));

    return {
      ok: true,
      prompt,
      modelSelectedByFlow: model,
      ratio: ratioResult.applied ? ratio : 'default',
      ratioApplied: ratioResult.applied,
      ratioDetail: ratioResult.reason || ratioResult.via || null,
      duration: duration || 'default',
      submitted: false,
      screenshot,
      note: 'Prompt typed but NOT submitted - no credits spent. Press Generate in the browser to render.',
    };
  });
}

export async function flowCreateScene({ prompt } = {}) {
  return withSession(async (page) => {
    if (!onFlow(page)) await openFlow(page);

    const before = page.url();
    const clicked = await page
      .locator('text=Scenes')
      .first()
      .click({ timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(3500);

    // The main composer is always present, so its existence proves nothing
    // about the Scenes panel. Only a URL change or a panel-scoped node does.
    const panel = await page
      .locator('[aria-label*="Scene" i], [data-testid*="scene" i], section:has-text("Scenes")')
      .count()
      .catch(() => 0);
    const opened = clicked && (panel > 0 || page.url() !== before);

    return {
      ok: opened,
      scenesPanel: opened ? 'opened' : 'not detected',
      suggestedPrompt: prompt || null,
      note: opened
        ? 'Scenes panel is open. Create the scene manually in the browser.'
        : 'Could not confirm the Scenes panel opened - open it from the browser and retry.',
    };
  });
}

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */

export async function flowListCharacters() {
  return withSession(async (page) => {
    if (!onFlow(page)) await openFlow(page);

    const before = page.url();
    const clicked = await page
      .locator('text=Characters')
      .first()
      .click({ timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(3500);

    const names = await page.evaluate(() => {
      const txt = (el) => (el?.innerText || el?.textContent || '').trim();
      const out = new Set();
      for (const el of document.querySelectorAll('[class*="card"],[role="listitem"],img[alt]')) {
        const t = txt(el) || el.getAttribute('alt');
        if (t && t.length < 60) out.add(t);
      }
      return [...out].slice(0, 40);
    });

    const opened = clicked && (page.url() !== before || names.length > 0);

    return {
      ok: opened,
      panel: opened ? 'opened' : 'not detected',
      count: names.length,
      names,
      note: opened ? null : 'Characters panel not detected - open it from the browser and retry.',
    };
  });
}

export async function flowCreateCharacter({ name, description }) {
  if (!name?.trim()) throw new Error('name is required');
  if (!description?.trim()) throw new Error('description is required');

  return withSession(async (page) => {
    if (!onFlow(page)) await openFlow(page);

    await page.locator('text=Characters').first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(3500);

    const add = page.locator('[aria-label*="add" i], button:has-text("add")').first();
    const clicked = (await add.count())
      ? await add.click({ timeout: 8000 }).then(() => true).catch(() => false)
      : false;
    await page.waitForTimeout(2500);

    const inputs = await page.evaluate(() =>
      [...document.querySelectorAll('input,textarea')]
        .filter((i) => i.offsetParent)
        .map((i) => i.placeholder || i.getAttribute('aria-label') || i.tagName)
        .slice(0, 20),
    );

    return {
      ok: clicked,
      name,
      description,
      addButtonClicked: clicked,
      visibleInputs: inputs,
      note: clicked
        ? 'Characters panel is open and ready. Finish the character in the browser.'
        : 'Could not find an add button - create the character in the browser.',
    };
  });
}

/* ------------------------------------------------------------------ */
/* Tools gallery & grid architect                                      */
/* ------------------------------------------------------------------ */

export async function flowOpenToolsGallery() {
  return withSession(async (page) => {
    if (!onFlow(page)) await openFlow(page);

    const before = page.url();
    const clicked = await page
      .locator('text=Tools')
      .first()
      .click({ timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(4000);

    // Buttons exist on every Flow page, so their presence proves nothing.
    const opened = clicked && page.url() !== before;
    const tabs = opened
      ? await page.evaluate(() => {
          const txt = (el) => (el?.innerText || el?.textContent || '').trim();
          return [
            ...new Set(
              [...document.querySelectorAll('a,button,[role="tab"]')]
                .map((e) => txt(e))
                .filter((t) => t && t.length < 30),
            ),
          ].slice(0, 30);
        })
      : [];

    return {
      ok: opened,
      url: page.url(),
      tabs,
      note: opened
        ? 'Flow Tools creation needs a paid AI plan; browsing is free.'
        : 'Tools gallery did not open - navigate to it from the browser and retry.',
    };
  });
}

export async function flowUseGridArchitect({ theme, shots }) {
  if (!theme?.trim()) throw new Error('theme is required');

  return withSession(async (page) => {
    if (!onFlow(page)) await openFlow(page);

    await page.locator('text=Tools').first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const ga = page.locator('text=Grid Architect').first();
    const opened = (await ga.count())
      ? await ga.click({ timeout: 8000 }).then(() => true).catch(() => false)
      : false;
    await page.waitForTimeout(4000);

    return {
      ok: opened,
      theme,
      shots: shots || 'not specified',
      gridArchitectOpened: opened,
      note: opened
        ? 'Grid Architect is open. Enter shots and generate in the browser - each shot costs a credit.'
        : 'Grid Architect not found in the gallery.',
    };
  });
}

/* ------------------------------------------------------------------ */
/* Output                                                             */
/* ------------------------------------------------------------------ */

export async function flowListOutput({ limit = 20 } = {}) {
  const n = clampLimit(limit);
  const runs = listOutput(n);

  return {
    // An empty folder is a valid answer, not a failure - reporting it as an
    // error would train the agent to treat "nothing yet" as broken.
    ok: true,
    empty: runs.length === 0,
    dir: config.outputDir,
    count: runs.length,
    runs,
    note: runs.length ? null : 'Nothing generated yet - the output folder has no runs.',
  };
}