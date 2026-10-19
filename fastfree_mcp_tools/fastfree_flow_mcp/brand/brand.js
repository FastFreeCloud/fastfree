/**
 * Brand identity — parsed from brand/BRAND.md.
 *
 * BRAND.md is the single source of truth. This module reads the hex
 * values and labels out of it so nothing has to be duplicated.
 *
 * Prompt anatomy: [Subject] + [Surface/Background] + [Light] + [Framing] + [Aesthetic anchor] + [Negative]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(here, 'BRAND.md');
const appsDir = path.join(here, '..', 'apps');

export const sourceFile = mdPath;

const md = fs.readFileSync(mdPath, 'utf8');

/** Every hex colour mentioned in the document, in order of appearance. */
const hexes = [...md.matchAll(/`?(#[0-9a-fA-F]{6})`?/g)].map((m) => m[1]);

const unique = [...new Set(hexes)];
const lower = new Map(unique.map((h, i) => [h.toLowerCase(), i]));

/** Named roles, resolved against the hexes actually present in the file. */
function pick(...candidates) {
  for (const c of candidates) {
    const i = lower.get(c);
    if (i !== undefined) return unique[i];
  }
  return null;
}

export const colors = {
  primary: pick('#1976d2'),
  primaryDark: pick('#1565c0'),
  primaryDarker: pick('#0d47a1'),
  secondary: pick('#26a69a'),
  accent: pick('#9c27b0'),
  positive: pick('#21ba45'),
  negative: pick('#c10015'),
  info: pick('#31ccec'),
  warning: pick('#f2c037'),
  dark: pick('#1d1d1d'),
  darkPage: pick('#121212'),
  border: pick('#e5e7eb'),
  surfaceAlt: pick('#f7f8fa'),
  textSecondary: pick('#6b7280'),
};

export const appColors = {
  website: { primary: '#2563EB', secondary: '#1D4ED8', accent: '#00F0FF' },
  panel: { primary: '#4F46E5', secondary: '#3730A3', accent: '#818CF8' },
  ledger: { primary: '#0D9488', secondary: '#047857', accent: '#34D399' },
  erp: { primary: '#D97706', secondary: '#B45309', accent: '#F59E0B' },
  pos: { primary: '#E11D48', secondary: '#9F1239', accent: '#FB7185' },
  hr: { primary: '#0284C7', secondary: '#7C3AED', accent: '#C084FC' },
};

export const brandPalette = [
  colors.primary,
  colors.primaryDark,
  colors.primaryDarker,
  colors.secondary,
  colors.accent,
].filter(Boolean);

export const identity = {
  company: 'FastFree',
  tagline: 'ERP for fast-moving businesses',
  fonts: { family: 'Roboto', label: '12px/500', body: '14px/400', headline: '20px/600' },
  icons: 'mdi-v7',
  ratios: {
    facebookFeed: '1.91:1 (1200x628)',
    facebookSquare: '1:1 (1080x1080)',
    story: '9:16 (1080x1920)',
  },
  voice: 'direct practical confident short sentences',
  imagery: 'clean flat UI illustration light background generous whitespace soft shadows',
  avoid: 'stock photos of people shaking hands glossy 3D renders cluttered gradients',
};

export const RATIOS = {
  '16:9': 'landscape 16:9 1920x1080',
  '1.91:1': 'wide 1.91 to 1 1200x628 facebook feed',
  '1:1': 'square 1 to 1 1080x1080',
  '9:16': 'vertical 9 to 16 1080x1920 story',
  '4:3': '4:3 standard',
  '3:4': '3:4 portrait',
};

// ─── Kind-Specific Prompt Templates ───────────────────────────────────────────

const KIND_TEMPLATES = {
  logo: {
    framing: 'centered composition with balanced negative space',
    aesthetic: 'flat geometric mark legible at 24px solid background',
    negative: ['no gradients', 'no shadows', 'no 3D effects', 'no text', 'no watermark', 'no logo'],
  },
  icon: {
    framing: 'centered single glyph app tile format clean silhouette',
    aesthetic: 'bold simple shape readable at 48px rounded square container',
    negative: ['no gradients', 'no shadows', 'no 3D effects', 'no text', 'no watermark', 'no logo'],
  },
  illustration: {
    framing: 'hero art with generous whitespace flat UI style',
    aesthetic: 'clean vector illustration with soft diffused lighting from upper left',
    negative: ['no photorealism', 'no stock photo style', 'no text', 'no watermark', 'no logo'],
  },
  post: {
    framing: 'social media graphic with clear focal subject and room for text overlay',
    aesthetic: 'strong contrast balanced composition with whitespace on one side',
    negative: ['no realistic hands', 'no cluttered background', 'no text', 'no watermark', 'no logo'],
  },
  screenshot: {
    framing: 'high-density application interface with tables and cards in dashboard layout',
    aesthetic: 'organized data display with clear visual hierarchy and brand-consistent UI elements',
    negative: ['no realistic hands', 'no cluttered background', 'no text', 'no watermark', 'no logo'],
  },
};

// ─── App Context Loader ───────────────────────────────────────────────────────

/**
 * Load app-specific context from apps/{app}.json.
 * Returns null if the file does not exist or cannot be parsed.
 */
function loadAppContext(app) {
  if (!app) return null;
  const appPath = path.join(appsDir, `${app}.json`);
  if (!fs.existsSync(appPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(appPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Build a comma-free palette string from app context or fallback to brand palette.
 */
function buildPaletteString(appCtx) {
  if (appCtx && appCtx.colors) {
    const c = appCtx.colors;
    const parts = [c.primary, c.secondary, c.accent].filter(Boolean);
    if (parts.length) return parts.join(' and ');
  }
  return brandPalette.join(' and ');
}

/**
 * Build the negative prompt array based on kind and app context.
 */
function buildNegativeParts(kind, appCtx) {
  const template = KIND_TEMPLATES[kind] || KIND_TEMPLATES.illustration;
  const negatives = [...template.negative];

  if (appCtx && appCtx.negativeHints && Array.isArray(appCtx.negativeHints)) {
    for (const hint of appCtx.negativeHints) {
      if (!negatives.includes(hint)) negatives.push(hint);
    }
  }

  return negatives;
}

/**
 * Build the aesthetic anchor string from app context.
 */
function buildAestheticAnchor(kind, appCtx) {
  const template = KIND_TEMPLATES[kind] || KIND_TEMPLATES.illustration;
  let anchor = template.aesthetic;

  if (appCtx && appCtx.promptHints && Array.isArray(appCtx.promptHints)) {
    anchor = `${anchor} ${appCtx.promptHints.join(' ')}`;
  }

  return anchor;
}

/**
 * Build the surface/background string from app context.
 */
function buildSurfaceString(appCtx) {
  if (appCtx && appCtx.imageryHints && Array.isArray(appCtx.imageryHints)) {
    return appCtx.imageryHints.join(' ');
  }
  return 'light white background with generous whitespace';
}

// ─── Main Prompt Builder ──────────────────────────────────────────────────────

/**
 * Turn a short request into an on-brand, comma-free Flow prompt.
 *
 * Prompt anatomy: [Subject] + [Surface/Background] + [Light] + [Framing] + [Aesthetic anchor] + [Negative]
 *
 * @param {string} request - Short description of what to create
 * @param {object} opts
 * @param {string} [opts.kind='illustration'] - logo | icon | illustration | post | screenshot
 * @param {string} [opts.ratio='1:1'] - 16:9 | 1.91:1 | 1:1 | 9:16 | 4:3 | 3:4
 * @param {string[]} [opts.exclude=[]] - Additional things to avoid
 * @param {string} [opts.app] - Optional app context key (e.g. "pos", "erp", "ledger", "panel", "hr", "website")
 * @returns {string} Comma-free prompt ready for Flow
 */
export function buildPrompt(request, { kind = 'illustration', ratio = '1:1', exclude = [], app = null } = {}) {
  const template = KIND_TEMPLATES[kind] || KIND_TEMPLATES.illustration;
  const size = RATIOS[ratio];
  if (!size) {
    throw new Error(
      `Unsupported ratio "${ratio}". Use one of: ${Object.keys(RATIOS).join(', ')}`,
    );
  }

  const appCtx = loadAppContext(app);
  const palette = buildPaletteString(appCtx);
  const surface = buildSurfaceString(appCtx);
  const light = 'soft diffused lighting from upper left';
  const framing = template.framing;
  const aesthetic = buildAestheticAnchor(kind, appCtx);
  const negatives = buildNegativeParts(kind, appCtx);

  // Merge user excludes
  for (const ex of exclude) {
    const normalized = ex.trim();
    if (normalized && !negatives.includes(normalized)) {
      negatives.push(normalized);
    }
  }

  // Build prompt following anatomy: Subject + Surface + Light + Framing + Aesthetic + Negative
  const parts = [
    request.replace(/,/g, ''),
    surface,
    light,
    framing,
    aesthetic,
    palette ? `colour palette ${palette}` : null,
    size,
    `${identity.imagery} ${identity.voice}`,
    negatives.join(' and '),
  ];

  return parts.filter(Boolean).join('. ');
}

/** Flow's editor strips commas — collapse them before sending. */
export function cleanForFlow(text) {
  return text.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Logo assets currently approved in brand/logos/. */
export function logoFiles() {
  const dir = path.join(here, 'logos');
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
}
