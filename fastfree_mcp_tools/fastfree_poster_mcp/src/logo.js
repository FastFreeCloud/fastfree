/**
 * Locates and inlines the brand artwork.
 *
 * The poster uses two pieces of brand artwork: the horizontal wordmark and
 * the square application icon, which carries the infinity mark, the app
 * glyph and the app name. Both are inlined rather than linked, so the
 * exported SVG is a single self-contained file that can be handed to a
 * designer or a platform.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Find the brand folder.
 *
 * The search walks upward from this file so the package works both from
 * inside the repository and from a standalone copy of the package.
 */
function findBrandDir() {
  let dir = here;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = path.join(dir, 'brand', 'assets');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const brandAssets = findBrandDir();

/**
 * Strip the XML declaration, doctype and outer svg element, leaving the
 * drawable content, with every id namespaced.
 *
 * The ids are prefixed because the logo and the icon are placed in the same
 * document and their gradients and filters would otherwise collide.
 */
function extractDrawableContent(raw, prefix) {
  let content = raw
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    // Comments carry no rendering meaning and only add weight.
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');

  const ids = [...content.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  for (const id of ids) {
    content = content.split(`id="${id}"`).join(`id="${prefix}-${id}"`);
    content = content.split(`url(#${id})`).join(`url(#${prefix}-${id})`);
    content = content.split(`href="#${id}"`).join(`href="#${prefix}-${id}"`);
  }

  return content;
}

/**
 * Read an asset from the brand folder, or return null when it is missing.
 */
function readAsset(relative, prefix) {
  if (!brandAssets) return null;
  const file = path.join(brandAssets, relative);
  if (!fs.existsSync(file)) return null;
  return extractDrawableContent(fs.readFileSync(file, 'utf8'), prefix);
}

/**
 * The horizontal FastFree wordmark, placed inside the poster.
 *
 * @param {object} options
 * @param {number} options.x      Left edge.
 * @param {number} options.y      Top edge.
 * @param {number} options.width  Target width on the canvas.
 * @returns {string} SVG markup, or an empty string when the asset is missing.
 */
export function buildLogoMarkup({ x, y, width }) {
  const content = readAsset(path.join('logo', 'fastfree-brand-logo-dark.svg'), 'ff');
  if (!content) return '';

  // The source artwork is an 800x260 canvas.
  const scale = width / 800;

  return `<g transform="translate(${x},${y}) scale(${scale.toFixed(4)})">${content}</g>`;
}

/**
 * The square application icon, placed inside the poster.
 *
 * The icon is the strongest brand element available: it carries the
 * infinity mark, the application glyph and the application name, all in one
 * tile.
 *
 * @param {object} options
 * @param {string} options.appKey App key, for example "pos".
 * @param {number} options.x      Left edge.
 * @param {number} options.y      Top edge.
 * @param {number} options.width  Target width on the canvas.
 * @returns {string} SVG markup, or an empty string when the asset is missing.
 */
export function buildIconMarkup({ appKey, x, y, width }) {
  const content = readAsset(path.join('icons', `icon-${appKey}.svg`), 'ic');
  if (!content) return '';

  // The source artwork is a 512x512 canvas.
  const scale = width / 512;

  return `<g transform="translate(${x},${y}) scale(${scale.toFixed(4)})">${content}</g>`;
}

/**
 * The infinity mark on its own, without the application badge.
 *
 * This is the fallback mark, used when an application has no adaptive
 * artwork of its own.
 */
export function buildMarkMarkup({ x, y, width }) {
  const content = readAsset(path.join('logo', 'fastfree-infinity-mark.svg'), 'mk');
  if (!content) return '';

  // The source artwork is a 512x512 canvas.
  const scale = width / 512;

  return `<g transform="translate(${x},${y}) scale(${scale.toFixed(4)})">${content}</g>`;
}

/**
 * The adaptive application artwork: the infinity mark with the application
 * glyph tucked underneath it.
 *
 * This is the poster's logo, because it carries the brand signature and
 * says which product the poster is about, without any lettering competing
 * with the headline. The artwork is the same file the applications ship as
 * their Android adaptive icon foreground, so the poster and the installed
 * app look like one thing.
 *
 * @param {object} options
 * @param {string} options.appKey App key, for example "pos".
 * @param {number} options.x      Left edge.
 * @param {number} options.y      Top edge.
 * @param {number} options.width  Target width on the canvas.
 * @returns {string} SVG markup.
 */
export function buildAdaptiveMarkMarkup({ appKey, x, y, width }) {
  const content = readAsset(path.join('icons', `adaptive-${appKey}.svg`), 'am');
  if (!content) {
    return buildMarkMarkup({ x, y, width });
  }

  // The adaptive artwork is drawn on a 432x432 canvas, but the visible
  // artwork only fills the middle of it: the infinity mark sits above the
  // centre line and the application glyph just below it. The inner group
  // shifts the visible area to the origin, so the outer group can place it
  // with a plain translate.
  const scale = width / ADAPTIVE_BOUNDS.width;

  return `<g transform="translate(${x},${y}) scale(${scale.toFixed(4)})">
    <g transform="translate(${-ADAPTIVE_BOUNDS.x0},${-ADAPTIVE_BOUNDS.y0})">${content}</g>
  </g>`;
}

/**
 * The visible bounds of the adaptive artwork, in its own canvas.
 *
 * The canvas is 432x432, but the artwork only occupies the middle band of
 * it, so the poster scales the visible area rather than the canvas.
 */
const ADAPTIVE_BOUNDS = {
  x0: 66,
  x1: 366,
  y0: 78,
  y1: 316,
  get width() {
    return this.x1 - this.x0;
  },
  get height() {
    return this.y1 - this.y0;
  },
  get centreX() {
    return (this.x0 + this.x1) / 2;
  },
  get centreY() {
    return (this.y0 + this.y1) / 2;
  },
};

/**
 * The height the adaptive mark occupies once it is scaled to a given width.
 *
 * @param {number} width Target width on the canvas.
 * @returns {number} Target height.
 */
export function adaptiveMarkHeight(width) {
  return (width * ADAPTIVE_BOUNDS.height) / ADAPTIVE_BOUNDS.width;
}

/**
 * A screen shot of the application, placed inside the poster.
 *
 * The captures live in the screens folder next to the package and are
 * produced by scripts/capture-screens.mjs. When a capture is missing the
 * poster still renders, it just leaves the space for the screen empty.
 *
 * @param {object} options
 * @param {string} options.appKey App key, for example "pos".
 * @param {number} options.x      Left edge.
 * @param {number} options.y      Top edge.
 * @param {number} options.width  Target width.
 * @param {number} options.height Target height.
 * @returns {string} SVG markup.
 */
export function buildScreenMarkup({ appKey, x, y, width, height }) {
  const file = findScreenFile(appKey);
  if (!file) return '';

  const radius = Math.round(Math.min(width, height) * 0.03);
  const encoded = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

  return `<g>
    <rect x="${x - 6}" y="${y - 6}" width="${width + 12}" height="${height + 12}" rx="${radius + 4}"
          fill="#0B1220" stroke="${SHADOW_COLOUR}" stroke-opacity="0.45" stroke-width="2"/>
    <image x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"
           clip-path="url(#screen-clip-${appKey})" href="${encoded}"/>
  </g>
  <clipPath id="screen-clip-${appKey}">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/>
  </clipPath>`;
}

/**
 * The colour of the frame drawn around a screen shot.
 */
const SHADOW_COLOUR = '#94A3B8';

/**
 * The screen shots captured for an application, keyed by app.
 *
 * The file names come from scripts/capture-screens.mjs, which names them
 * after the app and the screen.
 */
const SCREEN_FILES = {
  ledger: ['ledger-accounting-chart.png', 'ledger-inventory-products.png'],
  pos: ['pos-sales-customers.png', 'pos-sales-orders.png'],
  hr: ['hr-hr-employees.png', 'hr-hr-attendance.png', 'hr-crm-leads.png'],
  erp: ['erp-accounting-journal-entries.png'],
  panel: ['panel-machines.png'],
  website: ['website-home.png'],
};

/**
 * Find the screen shot to use for an application.
 */
function findScreenFile(appKey) {
  const candidates = SCREEN_FILES[appKey] ?? [];
  for (const name of candidates) {
    const file = path.join(screensDir(), name);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

/**
 * Where the screen shots are stored.
 */
function screensDir() {
  const override = process.env.FASTFREE_POSTER_SCREENS;
  if (override) return override;

  let dir = here;
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, 'screens');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(here, '..', 'screens');
}

/**
 * Whether the brand artwork was found.
 */
export function hasBrandAssets() {
  return Boolean(brandAssets);
}
