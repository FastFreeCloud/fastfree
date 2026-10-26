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
  if (process.env.FASTFREE_BRAND_ASSETS && fs.existsSync(process.env.FASTFREE_BRAND_ASSETS)) {
    return process.env.FASTFREE_BRAND_ASSETS;
  }
  let dir = here;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidates = [
      path.join(dir, '.ai-rulez', 'domains', 'frontend', 'skills', 'fastfree-brand', 'assets'),
      path.join(dir, '.agents', 'skills', 'fastfree-brand', 'assets'),
      path.join(dir, 'brand', 'assets')
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
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
 */
export function buildMarkMarkup({ x, y, width }) {
  const content = readAsset(path.join('logo', 'fastfree-infinity-mark.svg'), 'mk');
  if (!content) return '';

  const scale = width / 512;

  return `<g transform="translate(${x},${y}) scale(${scale.toFixed(4)})">${content}</g>`;
}

/**
 * Whether the brand artwork was found.
 */
export function hasBrandAssets() {
  return Boolean(brandAssets);
}
