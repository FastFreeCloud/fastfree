/**
 * Brand identity — parsed from brand/BRAND.md.
 *
 * BRAND.md is the single source of truth. This module reads the hex
 * values and labels out of it so nothing has to be duplicated.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(here, 'BRAND.md');

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

const KIND_HINTS = {
  logo: 'minimal vector logo mark. geometric and flat. no gradients no shadows no 3d. strong silhouette readable at small size. balanced negative space',
  icon: 'single app icon with square rounded corners. bold simple glyph. centered composition. readable at 48px',
  illustration: 'clean flat vector illustration. light background generous whitespace. soft subtle shadows. limited to the brand palette',
  post: 'social media graphic. clear focal subject. strong contrast on small screens. room for text overlay without crowding',
  screenshot: 'high fidelity product UI screenshot. dense but organised data tables and cards. brand colours only',
};

/** Turn a short request into an on-brand, comma-free Flow prompt. */
export function buildPrompt(request, { kind = 'illustration', ratio = '1:1', exclude = [] } = {}) {
  const hints = KIND_HINTS[kind] || KIND_HINTS.illustration;
  const size = RATIOS[ratio];
  if (!size) {
    // Fail loudly instead of silently substituting 1:1 and handing the
    // agent a prompt for an aspect ratio it never asked for.
    throw new Error(
      `Unsupported ratio "${ratio}". Use one of: ${Object.keys(RATIOS).join(', ')}`,
    );
  }
  const palette = brandPalette.join(' and ');

  const parts = [
    request.replace(/,/g, ''),
    hints,
    palette ? `colour palette strictly ${palette}` : null,
    size,
    `${identity.imagery} ${identity.voice}`,
    identity.avoid,
    exclude.length ? `avoid ${exclude.join(' and ')}` : null,
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