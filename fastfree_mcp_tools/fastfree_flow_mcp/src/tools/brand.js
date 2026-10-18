/**
 * Brand tools.
 *
 * brand/BRAND.md is the single source of truth. brand.js parses it.
 * These helpers turn a short request into an on-brand prompt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPrompt, cleanForFlow, RATIOS,
  colors, appColors, identity, sourceFile, logoFiles,
} from '../../brand/brand.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const brandDir = path.resolve(here, '..', '..', 'brand');

export function brandRead() {
  return {
    ok: true,
    source: sourceFile,
    company: identity.company,
    tagline: identity.tagline,
    colors,
    appColors,
    typography: identity.fonts,
    icons: identity.icons,
    logos: logoFiles(),
    ratios: identity.ratios,
    voice: identity.voice,
    imagery: identity.imagery,
  };
}

/**
 * Build a generation prompt from the brand kit.
 * Returned comma-free because the Flow editor strips commas.
 */
export function brandPrompt({ request, kind = 'illustration', ratio = '1:1', exclude = [] }) {
  if (!request?.trim()) throw new Error('request is required');
  const prompt = cleanForFlow(buildPrompt(request, { kind, ratio, exclude }));

  return {
    ok: true,
    request,
    kind,
    ratio,
    availableRatios: Object.keys(RATIOS),
    prompt,
    wordCount: prompt.split(/\s+/).length,
    note: 'Comma-free by design. Pass this string straight to flow_generate_image.',
  };
}

/** Tokens for building UI or documents — not for image generation. */
export function brandTokens({ group = 'all' } = {}) {
  const map = {
    colors,
    appColors,
    typography: identity.fonts,
    icons: identity.icons,
    socialRatios: identity.ratios,
    logo: logoFiles(),
    voice: identity.voice,
    imagery: identity.imagery,
  };
  return { ok: true, ...(group === 'all' ? map : { [group]: map[group] ?? null }) };
}

/** Promote a generated image to an approved brand asset. */
export function brandAddLogo({ sourceFile: src, name }) {
  if (!src?.trim()) throw new Error('sourceFile is required');
  const from = path.resolve(src);
  if (!fs.existsSync(from)) throw new Error(`File not found: ${from}`);

  const dir = path.join(brandDir, 'logos');
  fs.mkdirSync(dir, { recursive: true });

  // Extension comes from an untrusted path, so it is taken from an allowlist
  // rather than copied through.
  const ext = /\.png$/i.test(from) ? '.png' : '.jpg';
  const safe = (name || 'logo').replace(/[^\w-]/g, '-').slice(0, 60) || 'logo';
  const file = path.join(dir, `${safe}${ext}`);
  fs.copyFileSync(from, file);

  return {
    ok: true,
    added: file,
    kb: Math.round(fs.statSync(file).size / 1024),
    total: fs.readdirSync(dir),
    note: 'Mention the filename in BRAND.md under Logo if it becomes the primary mark.',
  };
}